"""
Owner notifications API endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from typing import List, Optional
from datetime import datetime

from core.database import get_db
from core.dependencies import get_current_business_owner
from core.config import settings
from models.user import User
from models.notification import Notification

router = APIRouter()


class NotificationResponse:
    def __init__(self, id: int, type: str, title: str, message: str, booking_id: Optional[int],
                 place_id: Optional[int], is_read: bool, created_at: str, read_at: Optional[str]):
        self.id = id
        self.type = type
        self.title = title
        self.message = message
        self.booking_id = booking_id
        self.place_id = place_id
        self.is_read = is_read
        self.created_at = created_at
        self.read_at = read_at


@router.get("/")
async def get_notifications(
    limit: int = Query(20, description="Number of notifications to return"),
    offset: int = Query(0, description="Number of notifications to skip"),
    unread_only: bool = Query(False, description="Return only unread notifications"),
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get all notifications for the owner"""
    try:
        query = select(Notification).where(Notification.owner_id == current_user.id)
        
        if unread_only:
            query = query.where(Notification.is_read == False)
        
        query = query.order_by(desc(Notification.created_at)).limit(limit).offset(offset)
        
        result = await db.execute(query)
        notifications = result.scalars().all()
        
        notification_responses = []
        for notification in notifications:
            created_at_str = notification.created_at.isoformat() if notification.created_at else datetime.utcnow().isoformat()
            read_at_str = notification.read_at.isoformat() if notification.read_at else None
            
            notification_responses.append(NotificationResponse(
                id=notification.id,
                type=notification.type,
                title=notification.title,
                message=notification.message,
                booking_id=notification.booking_id,
                place_id=notification.place_id,
                is_read=notification.is_read,
                created_at=created_at_str,
                read_at=read_at_str
            ))
        
        return notification_responses
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch notifications: {str(e)}"
        )


@router.get("/unread-count")
async def get_unread_notification_count(
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get count of unread notifications for the owner"""
    try:
        result = await db.execute(
            select(func.count(Notification.id)).where(
                and_(
                    Notification.owner_id == current_user.id,
                    Notification.is_read == False
                )
            )
        )
        count = result.scalar() or 0
        
        return {"count": count}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch unread notification count: {str(e)}"
        )


@router.put("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Mark a notification as read"""
    try:
        # Verify notification belongs to the owner
        result = await db.execute(
            select(Notification).where(
                and_(
                    Notification.id == notification_id,
                    Notification.owner_id == current_user.id
                )
            )
        )
        notification = result.scalar_one_or_none()
        
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            await db.commit()
            await db.refresh(notification)
        
        return {"message": "Notification marked as read", "id": notification.id}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark notification as read: {str(e)}"
        )


@router.put("/read-all")
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Mark all notifications as read for the owner"""
    try:
        result = await db.execute(
            select(Notification).where(
                and_(
                    Notification.owner_id == current_user.id,
                    Notification.is_read == False
                )
            )
        )
        notifications = result.scalars().all()
        
        now = datetime.utcnow()
        for notification in notifications:
            notification.is_read = True
            notification.read_at = now
        
        await db.commit()
        
        return {"message": f"Marked {len(notifications)} notifications as read"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark all notifications as read: {str(e)}"
        )


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Delete a notification"""
    try:
        # Verify notification belongs to the owner
        result = await db.execute(
            select(Notification).where(
                and_(
                    Notification.id == notification_id,
                    Notification.owner_id == current_user.id
                )
            )
        )
        notification = result.scalar_one_or_none()
        
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        await db.delete(notification)
        await db.commit()
        
        return {"message": "Notification deleted", "id": notification_id}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete notification: {str(e)}"
        )


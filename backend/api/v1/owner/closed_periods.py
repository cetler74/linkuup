from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import date

from core.database import get_db
from core.dependencies import get_current_business_owner
from models.business import Business, BusinessClosedPeriod
from models.user import User

router = APIRouter()

@router.get("/businesses/{business_id}/closed-periods")
async def list_closed_periods(
    business_id: int,
    status_filter: Optional[str] = Query(None, regex="^(active|inactive)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_business_owner)
):
    # Verify ownership
    result = await db.execute(select(Business).where(Business.id == business_id, Business.owner_id == current_user.id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    query = select(BusinessClosedPeriod).where(BusinessClosedPeriod.business_id == business_id)
    if status_filter:
        query = query.where(BusinessClosedPeriod.status == status_filter)
    result = await db.execute(query)
    items = result.scalars().all()
    return [
        {
            "id": item.id,
            "business_id": item.business_id,
            "name": item.name,
            "start_date": item.start_date,
            "end_date": item.end_date,
            "is_full_day": item.is_full_day,
            "half_day_period": item.half_day_period,
            "is_recurring": item.is_recurring,
            "recurrence_pattern": item.recurrence_pattern,
            "status": item.status,
            "notes": item.notes,
            "created_at": item.created_at,
            "updated_at": item.updated_at,
        }
        for item in items
    ]

@router.post("/businesses/{business_id}/closed-periods", status_code=status.HTTP_201_CREATED)
async def create_closed_period(
    business_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_business_owner)
):
    result = await db.execute(select(Business).where(Business.id == business_id, Business.owner_id == current_user.id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    try:
        item = BusinessClosedPeriod(
            business_id=business_id,
            name=data.get("name"),
            start_date=date.fromisoformat(data["start_date"]) if isinstance(data.get("start_date"), str) else data.get("start_date"),
            end_date=date.fromisoformat(data["end_date"]) if isinstance(data.get("end_date"), str) else data.get("end_date"),
            is_full_day=bool(data.get("is_full_day", True)),
            half_day_period=data.get("half_day_period"),
            is_recurring=bool(data.get("is_recurring", False)),
            recurrence_pattern=data.get("recurrence_pattern"),
            status=data.get("status", "active"),
            notes=data.get("notes"),
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid payload: {e}")

    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {"id": item.id}

@router.put("/businesses/{business_id}/closed-periods/{closed_period_id}")
async def update_closed_period(
    business_id: int,
    closed_period_id: int,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_business_owner)
):
    # Ownership
    result = await db.execute(select(Business).where(Business.id == business_id, Business.owner_id == current_user.id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    result = await db.execute(select(BusinessClosedPeriod).where(BusinessClosedPeriod.id == closed_period_id, BusinessClosedPeriod.business_id == business_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Closed period not found")

    # Apply updates
    for field in ["name", "is_full_day", "half_day_period", "is_recurring", "recurrence_pattern", "status", "notes"]:
        if field in data:
            setattr(item, field, data[field])
    if "start_date" in data:
        item.start_date = date.fromisoformat(data["start_date"]) if isinstance(data["start_date"], str) else data["start_date"]
    if "end_date" in data:
        item.end_date = date.fromisoformat(data["end_date"]) if isinstance(data["end_date"], str) else data["end_date"]

    await db.commit()
    await db.refresh(item)
    return {"success": True}

@router.delete("/businesses/{business_id}/closed-periods/{closed_period_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_closed_period(
    business_id: int,
    closed_period_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_business_owner)
):
    result = await db.execute(select(Business).where(Business.id == business_id, Business.owner_id == current_user.id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    result = await db.execute(select(BusinessClosedPeriod).where(BusinessClosedPeriod.id == closed_period_id, BusinessClosedPeriod.business_id == business_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Closed period not found")

    await db.delete(item)
    await db.commit()
    return



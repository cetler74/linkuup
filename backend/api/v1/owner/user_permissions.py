from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any
import traceback

from core.database import get_db
from core.dependencies import get_current_business_owner
from models.user import User
from models.user_feature_permissions import UserFeaturePermission

router = APIRouter()

@router.get("/user/feature-permissions")
async def get_user_feature_permissions(
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Get user-level feature permissions for navigation and billing"""
    try:
        # Validate user ID
        if not current_user or not current_user.id:
            print(f"❌ Invalid user: {current_user}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user"
            )
        
        print(f"🔍 Fetching feature permissions for user {current_user.id}")
        
        # Get all permissions for the current user
        query = select(UserFeaturePermission).where(
            UserFeaturePermission.user_id == current_user.id
        )
        result = await db.execute(query)
        permissions = result.scalars().all()
        
        print(f"✅ Found {len(permissions)} permission records for user {current_user.id}")
        
        # Convert to dictionary format
        feature_permissions = {}
        for perm in permissions:
            feature_permissions[perm.feature_name] = perm.is_enabled
        
        # Ensure all features have default values
        # Only basic features enabled by default, premium features require subscription
        default_features = {
            'bookings': True,        # Basic feature - always enabled
            'rewards': False,        # Premium feature - requires subscription
            'time_off': False,       # Premium feature - requires subscription
            'campaigns': False,      # Premium feature - requires subscription
            'messaging': False,      # Premium feature - requires subscription
            'notifications': True    # Basic feature - always enabled
        }
        
        # Merge with defaults
        for feature, default_value in default_features.items():
            if feature not in feature_permissions:
                feature_permissions[feature] = default_value
        
        return {
            "user_id": current_user.id,
            "feature_permissions": feature_permissions
        }
    except HTTPException:
        # Re-raise HTTP exceptions (they should be handled by FastAPI)
        raise
    except Exception as e:
        # Log the actual error for debugging
        print(f"❌ Error in get_user_feature_permissions: {type(e).__name__}: {str(e)}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching feature permissions: {str(e)}"
        )

@router.put("/user/feature-permissions")
async def update_user_feature_permissions(
    permissions: Dict[str, bool],
    current_user: User = Depends(get_current_business_owner),
    db: AsyncSession = Depends(get_db)
):
    """Update user-level feature permissions"""
    
    # Disallow enabling Pro-managed features from this endpoint since plan gating is place-scoped
    pro_managed = {"rewards", "campaigns", "messaging", "time_off"}

    for feature_name, is_enabled in permissions.items():
        if feature_name in pro_managed and is_enabled is True:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"managed_by_plan: {feature_name}"
            )

        # Check if permission exists for the current user
        query = select(UserFeaturePermission).where(
            UserFeaturePermission.user_id == current_user.id,
            UserFeaturePermission.feature_name == feature_name
        )
        result = await db.execute(query)
        existing_permission = result.scalar_one_or_none()
        
        if existing_permission:
            # Update existing
            existing_permission.is_enabled = is_enabled
        else:
            # Create new
            new_permission = UserFeaturePermission(
                user_id=current_user.id,
                feature_name=feature_name,
                is_enabled=is_enabled
            )
            db.add(new_permission)
    
    await db.commit()
    
    return {"message": "Feature permissions updated successfully"}

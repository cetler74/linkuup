from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError, jwt
from core.database import get_db
from core.config import settings
from models.user import User
from sqlalchemy import select

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        print(f"🔑 Token received: {token[:20]}...")
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        print(f"👤 User ID from token: {user_id}")
        if user_id is None:
            print("❌ No user ID in token")
            raise credentials_exception
    except JWTError as e:
        print(f"❌ JWT Error: {e}")
        raise credentials_exception
    
    result = await db.execute(select(User).where(User.id == int(user_id), User.is_active == True))
    user = result.scalar_one_or_none()
    if user is None:
        print(f"❌ User not found or inactive: {user_id}")
        raise credentials_exception
    print(f"✅ User authenticated: {user.email} (ID: {user.id})")
    return user

from datetime import datetime, timezone
from models.billing import Subscription as BillingSubscription
from sqlalchemy import select


async def get_current_business_owner(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    # Check multiple fields for business owner status for backward compatibility
    is_owner = (
        current_user.is_business_owner or 
        current_user.is_owner or 
        current_user.user_type == "business_owner"
    )
    if not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized as business owner"
        )

    # Billing gate: allow if within trial or has active/trialing subscription
    now = datetime.now(timezone.utc)
    in_trial = False
    if getattr(current_user, "trial_status", None) == "active" and getattr(current_user, "trial_end", None):
        try:
            in_trial = current_user.trial_end > now
        except Exception:
            in_trial = False

    if in_trial:
        return current_user

    # Check subscription table for active access
    res = await db.execute(
        select(BillingSubscription).where(
            BillingSubscription.user_id == current_user.id,
            BillingSubscription.active == True,
        )
    )
    sub = res.scalar_one_or_none()
    if sub:
        return current_user

    # If no trial and no active subscription, block access
    raise HTTPException(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        detail="subscription_required: Your trial has ended. Please subscribe to continue.",
    )

async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    # Check if user is admin by either is_admin flag or platform_admin user type
    is_admin = (
        current_user.is_admin or 
        current_user.user_type == "platform_admin"
    )
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized as admin"
        )
    return current_user

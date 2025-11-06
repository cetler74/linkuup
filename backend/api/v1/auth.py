from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.responses import RedirectResponse, HTMLResponse
import os
import json
import urllib.parse
import httpx

try:
    from core.database import get_db
    from core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, verify_token
    from core.dependencies import get_current_user
    from core.config import settings
    from models.user import User
except ImportError:
    from core.database import get_db
    from core.security import verify_password, get_password_hash, create_access_token, create_refresh_token, verify_token
    from core.dependencies import get_current_user
    from core.config import settings
    from models.user import User
try:
    from schemas.auth import (
        LoginRequest, RegisterRequest, RefreshTokenRequest, TokenResponse, 
        UserResponse, AuthResponse, ValidateTokenResponse, LogoutResponse
    )
except ImportError:
    from schemas.auth import (
        LoginRequest, RegisterRequest, RefreshTokenRequest, TokenResponse, 
        UserResponse, AuthResponse, ValidateTokenResponse, LogoutResponse
    )

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
# # @limiter.limit(settings.RATE_LIMIT_AUTH_REGISTER)
async def register(user_in: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user with GDPR consent"""
    
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        name=f"{user_in.first_name} {user_in.last_name}".strip(),  # Set required name field
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        user_type=user_in.user_type,
        is_active=True,  # Set default active status
        is_admin=False,  # Set default admin status
        is_owner=user_in.user_type == "business_owner",  # Set owner status based on user type
        is_business_owner=user_in.user_type == "business_owner",  # Set business owner flag
        gdpr_data_processing_consent=user_in.gdpr_data_processing_consent,
        gdpr_data_processing_consent_date=datetime.utcnow() if user_in.gdpr_data_processing_consent else None,
        gdpr_marketing_consent=user_in.gdpr_marketing_consent,
        gdpr_marketing_consent_date=datetime.utcnow() if user_in.gdpr_marketing_consent else None,
        gdpr_consent_version="1.0"  # Set required GDPR consent version
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Start a user-level trial for business owners (no card required)
    # Use trial_days from basic plan, fallback to 14 if plan not found
    if user.user_type == "business_owner":
        try:
            from models.subscription import Plan
            plan_result = await db.execute(select(Plan).where(Plan.code == "basic", Plan.is_active == True))
            basic_plan = plan_result.scalar_one_or_none()
            trial_days = basic_plan.trial_days if basic_plan else 14
            
            now = datetime.now(timezone.utc)
            user.trial_start = now
            user.trial_end = now + timedelta(days=trial_days)
            user.trial_status = "active"
            await db.commit()
            await db.refresh(user)
        except Exception:
            # Don't block registration on trial field updates
            pass
    
    # For business owners: optionally start trial subscription per place
    if user_in.user_type == "business_owner":
        try:
            from models.subscription import Plan, UserPlaceSubscription, SubscriptionStatusEnum
            # Try to get plan (use provided plan_code or default to "basic")
            plan_code = user_in.selected_plan_code or "basic"
            plan_result = await db.execute(select(Plan).where(Plan.code == plan_code, Plan.is_active == True))
            plan = plan_result.scalar_one_or_none()
            
            # If plan doesn't exist, try "basic" as fallback
            if not plan:
                plan_result = await db.execute(select(Plan).where(Plan.code == "basic", Plan.is_active == True))
                plan = plan_result.scalar_one_or_none()
            
            # Create subscription if we have a plan and place_id
            # Only create trial subscription if trial_days > 0
            # If trial_days = 0, user must go through payment flow
            if plan and user_in.place_id:
                now = datetime.now(timezone.utc)
                trial_days = plan.trial_days or 14
                
                # Skip subscription creation for plans with no trial (trial_days = 0)
                if trial_days == 0:
                    # User will need to subscribe through billing endpoint
                    pass
                else:
                    trial_end = now + timedelta(days=trial_days)
                    sub = UserPlaceSubscription(
                        user_id=user.id,
                        place_id=user_in.place_id,
                        plan_id=plan.id,
                        status=SubscriptionStatusEnum.TRIALING,
                        trial_start_at=now,
                        trial_end_at=trial_end,
                        current_period_start=now,
                        current_period_end=trial_end,
                    )
                    db.add(sub)
                    await db.commit()
        except Exception as e:
            # Do not block registration on subscription creation; frontend will retry via /subscriptions/start-trial
            print(f"⚠️ Warning: Could not create subscription during registration: {e}")
            pass
    
    # Generate tokens
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    return AuthResponse(
        user=UserResponse(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            user_type=user.user_type,
            is_active=user.is_active,
            is_owner=user.is_owner,
            is_admin=user.is_admin,
            gdpr_data_processing_consent=user.gdpr_data_processing_consent,
            gdpr_marketing_consent=user.gdpr_marketing_consent,
            trial_start=user.trial_start.isoformat() if user.trial_start else None,
            trial_end=user.trial_end.isoformat() if user.trial_end else None,
            trial_status=user.trial_status,
        ),
        tokens=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
    )

@router.post("/login", response_model=TokenResponse)
# @limiter.limit(settings.RATE_LIMIT_AUTH_LOGIN)
async def login(login_data: LoginRequest):
    """Login user and return access and refresh tokens"""
    from core.database import AsyncSessionLocal
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == login_data.email, User.is_active == True))
        user = result.scalar_one_or_none()
        
        if not user or not verify_password(login_data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Generate tokens
        access_token = create_access_token({"sub": str(user.id)})
        refresh_token = create_refresh_token({"sub": str(user.id)})
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )

@router.post("/refresh", response_model=TokenResponse)
# @limiter.limit(settings.RATE_LIMIT_STANDARD)
async def refresh_token(request: Request, refresh_data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Refresh access token using refresh token"""
    
    # Verify refresh token
    payload = verify_token(refresh_data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    # Check if user exists and is active
    result = await db.execute(select(User).where(User.id == int(user_id), User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Generate new access token
    access_token = create_access_token({"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_data.refresh_token,  # Keep same refresh token
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )

@router.post("/logout", response_model=LogoutResponse)
# @limiter.limit(settings.RATE_LIMIT_STANDARD)
async def logout(request: Request):
    """Logout user (client should discard tokens)"""
    return LogoutResponse()

@router.get("/validate", response_model=ValidateTokenResponse)
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def validate_token(request: Request, current_user: User = Depends(get_current_user)):
    """Validate if current access token is still valid"""
    try:
        # Safely get profile_picture - column might not exist in all databases
        profile_picture = None
        oauth_provider = None
        oauth_id = None
        try:
            profile_picture = getattr(current_user, "profile_picture", None)
            oauth_provider = getattr(current_user, "oauth_provider", None)
            oauth_id = getattr(current_user, "oauth_id", None)
        except AttributeError:
            # Column doesn't exist yet - safe to ignore
            pass
        
        return ValidateTokenResponse(
            valid=True,
            user=UserResponse(
                id=current_user.id,
                email=current_user.email,
                first_name=current_user.first_name,
                last_name=current_user.last_name,
                user_type=current_user.user_type,
                is_active=current_user.is_active,
                is_owner=current_user.is_owner,
                is_admin=current_user.is_admin,
                gdpr_data_processing_consent=current_user.gdpr_data_processing_consent,
                gdpr_marketing_consent=current_user.gdpr_marketing_consent,
                trial_start=current_user.trial_start.isoformat() if current_user.trial_start else None,
                trial_end=current_user.trial_end.isoformat() if current_user.trial_end else None,
                trial_status=current_user.trial_status,
                profile_picture=profile_picture,
                oauth_provider=oauth_provider,
                oauth_id=oauth_id,
            ),
            expires_at=None  # Token expiry is handled by JWT
        )
    except Exception as e:
        import traceback
        print(f"❌ Error in /validate endpoint: {str(e)}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/me", response_model=UserResponse)
# @limiter.limit(settings.RATE_LIMIT_MOBILE_READ)
async def get_current_user_info(request: Request, current_user: User = Depends(get_current_user)):
    """Get current user information"""
    try:
        # Safely get profile_picture - column might not exist in all databases
        profile_picture = None
        oauth_provider = None
        oauth_id = None
        try:
            profile_picture = getattr(current_user, "profile_picture", None)
            oauth_provider = getattr(current_user, "oauth_provider", None)
            oauth_id = getattr(current_user, "oauth_id", None)
        except AttributeError:
            # Column doesn't exist yet - safe to ignore
            pass
        
        return UserResponse(
            id=current_user.id,
            email=current_user.email,
            first_name=current_user.first_name,
            last_name=current_user.last_name,
            user_type=current_user.user_type,
            is_active=current_user.is_active,
            is_owner=current_user.is_owner,
            is_admin=current_user.is_admin,
            gdpr_data_processing_consent=current_user.gdpr_data_processing_consent,
            gdpr_marketing_consent=current_user.gdpr_marketing_consent,
            trial_start=current_user.trial_start.isoformat() if current_user.trial_start else None,
            trial_end=current_user.trial_end.isoformat() if current_user.trial_end else None,
            trial_status=current_user.trial_status,
            profile_picture=profile_picture,
            oauth_provider=oauth_provider,
            oauth_id=oauth_id,
        )
    except Exception as e:
        import traceback
        print(f"❌ Error in /me endpoint: {str(e)}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/oauth/status")
async def oauth_status():
    """Check OAuth configuration status (for debugging)"""
    client_id = settings.GOOGLE_CLIENT_ID or os.getenv("GOOGLE_CLIENT_ID", "")
    client_secret = settings.GOOGLE_CLIENT_SECRET or os.getenv("GOOGLE_CLIENT_SECRET", "")
    
    base_url = _get_base_api_url()
    redirect_uri = f"{base_url}/auth/google/callback"
    
    return {
        "google_oauth": {
            "configured": bool(client_id and client_secret),
            "client_id_set": bool(client_id),
            "client_secret_set": bool(client_secret),
            "redirect_uri": redirect_uri,
            "base_url": base_url
        },
        "facebook_oauth": {
            "configured": bool(
                (settings.FACEBOOK_CLIENT_ID or os.getenv("FACEBOOK_CLIENT_ID", "")) and
                (getattr(settings, "FACEBOOK_CLIENT_SECRET", "") or os.getenv("FACEBOOK_CLIENT_SECRET", ""))
            )
        }
    }

# =============================
# OAuth 2.0 (Google & Facebook)
# =============================

def _get_base_api_url() -> str:
    """Return base API URL like http://localhost:5001/api/v1"""
    return f"{settings.BASE_URL}{settings.API_V1_STR}"

def _get_frontend_base_url(request: Request | None = None, use_referer: bool = True) -> str:
    """Best-effort frontend base URL used for post-login redirect."""
    # Try to get from request referer header (most accurate), but only if not from Google
    if request and use_referer:
        referer = request.headers.get("referer")
        if referer and not ("accounts.google.com" in referer or "google.com" in referer):
            try:
                from urllib.parse import urlparse
                parsed = urlparse(referer)
                # Only use if it's not Google's domain
                if parsed.netloc and not parsed.netloc.endswith("google.com"):
                    frontend_url = f"{parsed.scheme}://{parsed.netloc}"
                    print(f"🔑 Using frontend URL from referer: {frontend_url}")
                    return frontend_url
            except Exception:
                pass
    
    # Fall back to settings or environment variable or default
    frontend_url = settings.FRONTEND_BASE_URL or os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
    print(f"🔑 Using frontend URL from settings/env/default: {frontend_url}")
    return frontend_url

async def _issue_tokens_for_user(
    db: AsyncSession, 
    email: str, 
    provider: str, 
    provider_id: str, 
    first_name: str | None, 
    last_name: str | None,
    user_type: str = "customer",
    selected_plan_code: str | None = None,
    place_id: int | None = None,
    profile_picture: str | None = None
) -> tuple[str, str, bool]:
    """
    Find-or-create user by email/provider and return (access_token, refresh_token, is_new_user).
    For business owners, handles trial and subscription setup.
    """
    # Try to query user, but handle case where profile_picture column doesn't exist
    try:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
    except Exception as query_error:
        # Handle case where profile_picture column doesn't exist in database
        error_str = str(query_error).lower()
        error_type = type(query_error).__name__
        
        if ("profile_picture" in error_str or 
            "undefinedcolumn" in error_str.lower() or 
            "does not exist" in error_str or
            "ProgrammingError" in error_type):
            print(f"⚠️ Profile picture column doesn't exist, querying without it")
            # Query using raw SQL to exclude profile_picture column
            from sqlalchemy import text
            query_text = text("""
                SELECT id, email, password_hash, name, customer_id, auth_token, is_admin, is_active,
                       first_name, last_name, user_type, is_business_owner, is_owner, created_at, updated_at,
                       refresh_token, token_expires_at, refresh_token_expires_at, last_login_at,
                       gdpr_data_processing_consent, gdpr_data_processing_consent_date,
                       gdpr_marketing_consent, gdpr_marketing_consent_date, gdpr_consent_version,
                       oauth_provider, oauth_id, trial_start, trial_end, trial_status
                FROM users WHERE email = :email
            """)
            result = await db.execute(query_text, {"email": email})
            row = result.first()
            if row:
                # Create User object and map row data
                user = User()
                for key, value in row._mapping.items():
                    if hasattr(user, key):
                        setattr(user, key, value)
                # Make sure it's attached to the session
                user = await db.merge(user)
            else:
                user = None
        else:
            # Different error - re-raise it
            import traceback
            print(f"❌ Query error: {traceback.format_exc()}")
            raise
    
    is_new_user = False

    if not user:
        is_new_user = True
        # Create user with OAuth info
        # Try to create user with profile_picture, but handle if column doesn't exist
        user_data = {
            "email": email,
            "password_hash": "",  # No password for OAuth-only accounts
            "name": (f"{first_name or ''} {last_name or ''}".strip() or email),
            "first_name": first_name,
            "last_name": last_name,
            "user_type": user_type,
            "is_active": True,
            "is_admin": False,
            "is_owner": (user_type == "business_owner"),
            "is_business_owner": (user_type == "business_owner"),
            "oauth_provider": provider,
            "oauth_id": provider_id,
            "gdpr_data_processing_consent": True,  # OAuth consent implied
            "gdpr_data_processing_consent_date": datetime.utcnow(),
            "gdpr_consent_version": "1.0"
        }
        
        # Try to add profile_picture - SQLAlchemy will ignore it if column doesn't exist
        # We'll catch the error during commit if the column doesn't exist
        if profile_picture:
            user_data["profile_picture"] = profile_picture
        
        user = User(**user_data)
        db.add(user)
        try:
            await db.commit()
            await db.refresh(user)
        except Exception as db_error:
            # If commit failed due to missing column, try again without profile_picture
            error_str = str(db_error).lower()
            error_type = type(db_error).__name__
            error_repr = repr(db_error).lower()
            
            print(f"⚠️ Database error during user creation: {error_type}: {error_str}")
            
            # Check if it's a column-related error (PostgreSQL, SQLite, etc.)
            # Catch various database exceptions that indicate missing column
            is_column_error = (
                "profile_picture" in error_str or 
                "column" in error_str or 
                "does not exist" in error_str or
                "no such column" in error_str or
                "operationalerror" in error_type.lower() or
                "programmingerror" in error_type.lower() or
                "invalid column name" in error_str
            )
            
            if is_column_error and "profile_picture" in user_data:
                print(f"⚠️ Profile picture column doesn't exist, creating user without it")
                # Remove profile_picture and try again
                user_data.pop("profile_picture", None)
                try:
                    await db.rollback()
                except:
                    pass
                
                # Create new user object without profile_picture
                user = User(**user_data)
                db.add(user)
                await db.commit()
                await db.refresh(user)
                print(f"✅ User created without profile_picture column")
            else:
                # Re-raise if it's a different error
                import traceback
                print(f"❌ Unexpected database error: {traceback.format_exc()}")
                raise

        # Start a user-level trial for business owners (no card required)
        # Use trial_days from basic plan, fallback to 14 if plan not found
        if user.user_type == "business_owner":
            try:
                from models.subscription import Plan
                plan_result = await db.execute(select(Plan).where(Plan.code == "basic", Plan.is_active == True))
                basic_plan = plan_result.scalar_one_or_none()
                trial_days = basic_plan.trial_days if basic_plan else 14
                
                now = datetime.now(timezone.utc)
                user.trial_start = now
                user.trial_end = now + timedelta(days=trial_days)
                user.trial_status = "active"
                await db.commit()
                await db.refresh(user)
            except Exception:
                # Don't block registration on trial field updates
                pass
        
        # For business owners: optionally start trial subscription per place
        # Only create trial if trial_days > 0
        if user.user_type == "business_owner" and selected_plan_code and place_id:
            try:
                from models.subscription import Plan, UserPlaceSubscription, SubscriptionStatusEnum
                plan_result = await db.execute(select(Plan).where(Plan.code == selected_plan_code, Plan.is_active == True))
                plan = plan_result.scalar_one_or_none()
                if plan:
                    now = datetime.now(timezone.utc)
                    trial_days = plan.trial_days or 14
                    
                    # Skip subscription creation for plans with no trial (trial_days = 0)
                    if trial_days == 0:
                        # User will need to subscribe through billing endpoint
                        pass
                    else:
                        trial_end = now + timedelta(days=trial_days)
                        sub = UserPlaceSubscription(
                            user_id=user.id,
                            place_id=place_id,
                            plan_id=plan.id,
                            status=SubscriptionStatusEnum.TRIALING,
                            trial_start_at=now,
                            trial_end_at=trial_end,
                            current_period_start=now,
                            current_period_end=trial_end,
                        )
                        db.add(sub)
                        await db.commit()
            except Exception:
                # Do not block registration on subscription creation; frontend will retry via /subscriptions/start-trial
                pass
    else:
        # Update oAuth fields if not set, and update profile picture if provided
        updated = False
        if not getattr(user, "oauth_provider", None):
            user.oauth_provider = provider
            updated = True
        if not getattr(user, "oauth_id", None):
            user.oauth_id = provider_id
            updated = True
        if profile_picture:
            try:
                current_picture = getattr(user, "profile_picture", None)
                if current_picture != profile_picture:
                    user.profile_picture = profile_picture
                    updated = True
            except AttributeError:
                # Column doesn't exist - skip it
                pass
        if updated:
            await db.commit()
            await db.refresh(user)

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return access_token, refresh_token, is_new_user

def _callback_success_html(access_token: str, refresh_token: str, redirect_path: str = "/") -> str:
    """Small HTML page that redirects to frontend with tokens in URL query params."""
    # Ensure redirect_path is a full URL (not relative)
    if not redirect_path.startswith("http://") and not redirect_path.startswith("https://"):
        # If it's relative, we need to use the frontend base URL
        redirect_path = f"http://linkuup.portugalexpatdirectory.com{redirect_path}"
    
    # Redirect to frontend with tokens in query params - frontend will extract and store
    tokens = urllib.parse.urlencode({
        'access_token': access_token,
        'refresh_token': refresh_token
    })
    separator = '&' if '?' in redirect_path else '?'
    redirect_url = f"{redirect_path}{separator}{tokens}"
    
    print(f"🔑 Final redirect URL: {redirect_url}")
    
    return f"""
<!DOCTYPE html>
<html>
  <head>
    <meta charset=\"utf-8\" />
    <title>Signing you in…</title>
    <meta http-equiv="refresh" content="0; url={json.dumps(redirect_url)}">
  </head>
  <body>
    <p>Redirecting...</p>
    <script>
      console.log('Redirecting to:', {json.dumps(redirect_url)});
      window.location.replace({json.dumps(redirect_url)});
    </script>
  </body>
</html>
"""

@router.get("/google")
async def google_oauth_start(request: Request, user_type: str = "customer", selected_plan_code: str | None = None):
    """
    Initiate Google OAuth by redirecting to Google's consent screen.
    
    Args:
        user_type: 'customer' or 'business_owner'
        selected_plan_code: Plan code if registering as business_owner
    """
    try:
        client_id = settings.GOOGLE_CLIENT_ID or os.getenv("GOOGLE_CLIENT_ID", "")
        client_secret = settings.GOOGLE_CLIENT_SECRET or os.getenv("GOOGLE_CLIENT_SECRET", "")
        
        if not client_id or not client_secret:
            error_msg = "Google OAuth not configured: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables"
            print(f"❌ {error_msg}")
            raise HTTPException(status_code=500, detail=error_msg)

        redirect_uri = f"{_get_base_api_url()}/auth/google/callback"
        print(f"🔑 Starting Google OAuth - redirect_uri: {redirect_uri}, user_type: {user_type}")
        
        # Encode state with user_type, plan info, AND redirect_uri to ensure exact match
        # This ensures the redirect_uri in token exchange matches what was sent in authorization
        import base64
        state_data = json.dumps({
            "user_type": user_type, 
            "selected_plan_code": selected_plan_code,
            "redirect_uri": redirect_uri  # Store the exact redirect_uri used
        })
        state = base64.urlsafe_b64encode(state_data.encode()).decode()
        
        params = {
            "client_id": client_id,
            "response_type": "code",
            "scope": "openid email profile",
            "redirect_uri": redirect_uri,
            "access_type": "offline",
            "include_granted_scopes": "true",
            "state": state,
        }
        url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
        return RedirectResponse(url)
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Error starting Google OAuth: {str(e)}"
        print(f"❌ {error_msg}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_msg)

@router.get("/google/callback")
async def google_oauth_callback(request: Request, code: str | None = None, state: str | None = None, error: str | None = None):
    """Handle Google OAuth callback with improved error handling"""
    import traceback
    
    try:
        if error:
            error_msg = f"Google OAuth error: {error}"
            print(f"❌ Google OAuth error: {error}")
            raise HTTPException(status_code=400, detail=error_msg)
        
        if not code:
            error_msg = "Missing authorization code"
            print(f"❌ {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)

        # Decode state to get user_type, plan, and redirect_uri
        user_type = "customer"
        selected_plan_code = None
        redirect_uri_from_state = None
        if state:
            try:
                import base64
                state_data = json.loads(base64.urlsafe_b64decode(state.encode()).decode())
                user_type = state_data.get("user_type", "customer")
                selected_plan_code = state_data.get("selected_plan_code")
                redirect_uri_from_state = state_data.get("redirect_uri")  # Get stored redirect_uri
            except Exception as e:
                print(f"⚠️ Failed to decode state: {e}")
                pass  # Use defaults if state decode fails

        client_id = settings.GOOGLE_CLIENT_ID or os.getenv("GOOGLE_CLIENT_ID", "")
        client_secret = settings.GOOGLE_CLIENT_SECRET or os.getenv("GOOGLE_CLIENT_SECRET", "")
        
        if not client_id or not client_secret:
            error_msg = "Google OAuth not configured: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET"
            print(f"❌ {error_msg}")
            raise HTTPException(status_code=500, detail=error_msg)
        
        # Use the redirect_uri from state if available (this ensures exact match with authorization request)
        # Otherwise fall back to constructing from request URL
        if redirect_uri_from_state:
            redirect_uri = redirect_uri_from_state
            print(f"🔑 Google OAuth callback - Using redirect_uri from state: {redirect_uri}")
        else:
            # Fallback: construct from request URL
            scheme = request.url.scheme
            host = request.headers.get("host") or request.url.hostname
            path = request.url.path
            redirect_uri = f"{scheme}://{host}{path}"
            print(f"🔑 Google OAuth callback - Constructed redirect_uri from request: {redirect_uri}")
            print(f"   - Scheme: {scheme}")
            print(f"   - Host: {host}")
            print(f"   - Path: {path}")

        # Exchange code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
        
        # Debug: Log request details (without exposing secrets)
        print(f"🔑 Token exchange request:")
        print(f"   - Client ID: {client_id[:20]}...{client_id[-10:]}")
        print(f"   - Client Secret: {client_secret[:5]}...{client_secret[-5:] if len(client_secret) > 10 else '***'}")
        print(f"   - Redirect URI: {redirect_uri}")
        print(f"   - Code length: {len(code) if code else 0}")
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                # Log the full request for debugging (without exposing secret)
                print(f"🔍 Full token exchange data:")
                print(f"   - URL: {token_url}")
                print(f"   - client_id: {client_id}")
                print(f"   - redirect_uri: {redirect_uri}")
                print(f"   - grant_type: authorization_code")
                print(f"   - code: {code[:20]}...{code[-10:] if len(code) > 30 else ''}")
                
                token_resp = await client.post(token_url, data=data)
                if token_resp.status_code != 200:
                    error_text = token_resp.text
                    error_msg = f"Failed to obtain Google access token: {token_resp.status_code} - {error_text}"
                    print(f"❌ {error_msg}")
                    print(f"❌ Request redirect_uri: {redirect_uri}")
                    print(f"❌ Client ID: {client_id}")
                    print(f"❌ Client Secret length: {len(client_secret)}")
                    print(f"❌ Client Secret starts with: {client_secret[:10]}")
                    
                    # Check if redirect_uri matches what was sent in authorization
                    print(f"❌ Verify in Google Console:")
                    print(f"   1. Redirect URI should be: {redirect_uri}")
                    print(f"   2. Client ID should be: {client_id}")
                    print(f"   3. Application type should be: Web application")
                    print(f"   4. Client secret should match the one in .env")
                    
                    raise HTTPException(status_code=400, detail=error_msg)
                
                token_json = token_resp.json()
                access_token_google = token_json.get("access_token")
                if not access_token_google:
                    error_msg = "Google token missing in response"
                    print(f"❌ {error_msg} - Response: {token_json}")
                    raise HTTPException(status_code=400, detail=error_msg)

                # Fetch userinfo
                userinfo_resp = await client.get(
                    "https://openidconnect.googleapis.com/v1/userinfo",
                    headers={"Authorization": f"Bearer {access_token_google}"}
                )
                if userinfo_resp.status_code != 200:
                    error_text = userinfo_resp.text
                    error_msg = f"Failed to fetch Google user info: {userinfo_resp.status_code} - {error_text}"
                    print(f"❌ {error_msg}")
                    raise HTTPException(status_code=400, detail=error_msg)
                
                ui = userinfo_resp.json()
                email = ui.get("email")
                sub = ui.get("sub")
                given_name = ui.get("given_name")
                family_name = ui.get("family_name")
                picture = ui.get("picture")  # Google profile picture URL
                if not email or not sub:
                    error_msg = f"Google user info incomplete - email: {email}, sub: {sub}"
                    print(f"❌ {error_msg} - Userinfo: {ui}")
                    raise HTTPException(status_code=400, detail=error_msg)
                
                print(f"✅ Google user info retrieved - email: {email}, picture: {picture}")
                if picture:
                    print(f"📸 Google profile picture URL: {picture}")

            except httpx.HTTPError as e:
                error_msg = f"Network error during Google OAuth: {str(e)}"
                print(f"❌ {error_msg}")
                raise HTTPException(status_code=500, detail=error_msg)

        # Issue our app tokens
        from core.database import AsyncSessionLocal
        try:
            async with AsyncSessionLocal() as db:
                app_access, app_refresh, is_new_user = await _issue_tokens_for_user(
                    db, 
                    email=email, 
                    provider="google", 
                    provider_id=sub, 
                    first_name=given_name, 
                    last_name=family_name,
                    user_type=user_type,
                    selected_plan_code=selected_plan_code,
                    place_id=None,  # Place will be created after OAuth
                    profile_picture=picture  # Pass Google profile picture URL
                )
                print(f"✅ User tokens issued - email: {email}, is_new_user: {is_new_user}")
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            error_msg = f"Database error during user creation: {str(e)}"
            print(f"❌ {error_msg}")
            print(f"❌ Traceback: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=error_msg)

        # Don't use referer during callback (it will be from Google) - use settings/env
        frontend_url = _get_frontend_base_url(request, use_referer=False)
        print(f"🔑 OAuth callback - frontend_url from settings: {frontend_url}")
        
        # For new business owners without a place, redirect to create place first
        redirect_path = f"{frontend_url}/"
        if is_new_user and user_type == "business_owner":
            redirect_path = f"{frontend_url}/owner/create-first-place"
        
        print(f"🔑 OAuth callback redirecting to: {redirect_path}")
        print(f"   - Access token length: {len(app_access)}")
        print(f"   - Refresh token length: {len(app_refresh)}")
        
        html = _callback_success_html(app_access, app_refresh, redirect_path=redirect_path)
        return HTMLResponse(content=html, media_type="text/html")
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Catch any other unexpected errors
        error_msg = f"Unexpected error in Google OAuth callback: {str(e)}"
        print(f"❌ {error_msg}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_msg)

@router.get("/facebook")
async def facebook_oauth_start(request: Request, user_type: str = "customer", selected_plan_code: str | None = None):
    """
    Initiate Facebook OAuth by redirecting to Facebook login dialog.
    
    Args:
        user_type: 'customer' or 'business_owner'
        selected_plan_code: Plan code if registering as business_owner
    """
    client_id = settings.FACEBOOK_CLIENT_ID or os.getenv("FACEBOOK_CLIENT_ID", "")
    client_secret = getattr(settings, "FACEBOOK_CLIENT_SECRET", "") or os.getenv("FACEBOOK_CLIENT_SECRET", "")
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Facebook OAuth not configured")

    redirect_uri = f"{_get_base_api_url()}/auth/facebook/callback"
    
    # Encode state with user_type and plan info
    import base64
    state_data = json.dumps({"user_type": user_type, "selected_plan_code": selected_plan_code})
    state = base64.urlsafe_b64encode(state_data.encode()).decode()
    
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": "email,public_profile",
        "response_type": "code",
        "state": state,
    }
    url = "https://www.facebook.com/v18.0/dialog/oauth?" + urllib.parse.urlencode(params)
    return RedirectResponse(url)

@router.get("/facebook/callback")
async def facebook_oauth_callback(request: Request, code: str | None = None, state: str | None = None, error: str | None = None):
    if error:
        raise HTTPException(status_code=400, detail=f"Facebook OAuth error: {error}")
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    # Decode state to get user_type and plan
    user_type = "customer"
    selected_plan_code = None
    if state:
        try:
            import base64
            state_data = json.loads(base64.urlsafe_b64decode(state.encode()).decode())
            user_type = state_data.get("user_type", "customer")
            selected_plan_code = state_data.get("selected_plan_code")
        except Exception:
            pass  # Use defaults if state decode fails

    client_id = settings.FACEBOOK_CLIENT_ID or os.getenv("FACEBOOK_CLIENT_ID", "")
    client_secret = getattr(settings, "FACEBOOK_CLIENT_SECRET", "") or os.getenv("FACEBOOK_CLIENT_SECRET", "")
    redirect_uri = f"{_get_base_api_url()}/auth/facebook/callback"

    # Exchange code for access token
    token_url = "https://graph.facebook.com/v18.0/oauth/access_token"
    params = {
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "code": code,
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        token_resp = await client.get(token_url, params=params)
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to obtain Facebook access token")
        token_json = token_resp.json()
        fb_access = token_json.get("access_token")
        if not fb_access:
            raise HTTPException(status_code=400, detail="Facebook token missing in response")

        # Fetch user info: id, name, email, picture
        userinfo_resp = await client.get(
            "https://graph.facebook.com/v18.0/me",
            params={"fields": "id,name,email,first_name,last_name,picture.type(large)"},
            headers={"Authorization": f"Bearer {fb_access}"}
        )
        if userinfo_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch Facebook user info")
        ui = userinfo_resp.json()
        email = ui.get("email")
        fb_id = ui.get("id")
        first_name = ui.get("first_name") or None
        last_name = ui.get("last_name") or None
        picture_data = ui.get("picture", {})
        picture_url = picture_data.get("data", {}).get("url") if picture_data else None
        if not email or not fb_id:
            # Some FB apps don't return email; you may require email permission
            raise HTTPException(status_code=400, detail="Facebook user info incomplete (email missing)")

    # Issue our app tokens
    from core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        app_access, app_refresh, is_new_user = await _issue_tokens_for_user(
            db, 
            email=email, 
            provider="facebook", 
            provider_id=fb_id, 
            first_name=first_name, 
            last_name=last_name,
            user_type=user_type,
            selected_plan_code=selected_plan_code,
            place_id=None,  # Place will be created after OAuth
            profile_picture=picture_url  # Pass Facebook profile picture URL
        )

    frontend_url = _get_frontend_base_url(request)
    # For new business owners without a place, redirect to create place first
    redirect_path = f"{frontend_url}/"
    if is_new_user and user_type == "business_owner":
        redirect_path = f"{frontend_url}/owner/create-first-place"
    
    html = _callback_success_html(app_access, app_refresh, redirect_path=redirect_path)
    return HTMLResponse(content=html, media_type="text/html")

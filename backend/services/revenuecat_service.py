import httpx
import json
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from models.user import User
from models.business import Business
from core.config import settings
import logging

logger = logging.getLogger(__name__)

class RevenueCatService:
    """Service for handling RevenueCat integration"""
    
    def __init__(self):
        self.api_key = settings.REVENUECAT_API_KEY
        self.base_url = settings.REVENUECAT_BASE_URL
        self.headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
    
    async def create_customer(self, user_id: str, email: str) -> bool:
        """Create a customer in RevenueCat"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/subscribers/{user_id}",
                    headers=self.headers,
                    json={
                        "app_user_id": user_id,
                        "email": email
                    }
                )
                return response.status_code in [200, 201]
        except Exception as e:
            logger.error(f"Error creating RevenueCat customer: {e}")
            return False
    
    async def get_subscription_status(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get subscription status from RevenueCat"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/subscribers/{user_id}",
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    subscriber = data.get('subscriber', {})
                    subscriptions = subscriber.get('subscriptions', {})
                    
                    # Find active subscription
                    for product_id, subscription in subscriptions.items():
                        if subscription.get('is_active', False):
                            return {
                                'is_active': True,
                                'product_id': product_id,
                                'expires_date': subscription.get('expires_date'),
                                'is_trial_period': subscription.get('is_trial_period', False),
                                'trial_end_date': subscription.get('trial_end_date'),
                                'period_type': subscription.get('period_type'),
                                'store': subscription.get('store')
                            }
                    
                    return {'is_active': False}
                else:
                    logger.error(f"Error getting subscription status: {response.status_code}")
                    return None
        except Exception as e:
            logger.error(f"Error getting subscription status: {e}")
            return None
    
    async def handle_webhook(self, webhook_data: Dict[str, Any], db: AsyncSession) -> bool:
        """Handle RevenueCat webhook events"""
        try:
            event_type = webhook_data.get('type')
            subscriber = webhook_data.get('subscriber', {})
            app_user_id = subscriber.get('app_user_id')
            
            if not app_user_id:
                logger.error("No app_user_id in webhook data")
                return False
            
            # Get user from database
            result = await db.execute(select(User).where(User.id == int(app_user_id)))
            user = result.scalar_one_or_none()
            
            if not user:
                logger.error(f"User not found for app_user_id: {app_user_id}")
                return False
            
            if event_type == 'INITIAL_PURCHASE':
                await self._handle_initial_purchase(webhook_data, user, db)
            elif event_type == 'RENEWAL':
                await self._handle_renewal(webhook_data, user, db)
            elif event_type == 'CANCELLATION':
                await self._handle_cancellation(webhook_data, user, db)
            elif event_type == 'NON_RENEWING_PURCHASE':
                await self._handle_non_renewing_purchase(webhook_data, user, db)
            elif event_type == 'PRODUCT_CHANGE':
                await self._handle_product_change(webhook_data, user, db)
            
            await db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error handling webhook: {e}")
            await db.rollback()
            return False
    
    async def _handle_initial_purchase(self, webhook_data: Dict[str, Any], user: User, db: AsyncSession):
        """Handle initial purchase event"""
        logger.info(f"Handling initial purchase for user {user.id}")
        # Update user subscription status
        # You can add subscription fields to User model if needed
        pass
    
    async def _handle_renewal(self, webhook_data: Dict[str, Any], user: User, db: AsyncSession):
        """Handle subscription renewal event"""
        logger.info(f"Handling renewal for user {user.id}")
        # Update subscription status
        pass
    
    async def _handle_cancellation(self, webhook_data: Dict[str, Any], user: User, db: AsyncSession):
        """Handle subscription cancellation event"""
        logger.info(f"Handling cancellation for user {user.id}")
        # Update subscription status
        pass
    
    async def _handle_non_renewing_purchase(self, webhook_data: Dict[str, Any], user: User, db: AsyncSession):
        """Handle non-renewing purchase event"""
        logger.info(f"Handling non-renewing purchase for user {user.id}")
        # Update subscription status
        pass
    
    async def _handle_product_change(self, webhook_data: Dict[str, Any], user: User, db: AsyncSession):
        """Handle product change event"""
        logger.info(f"Handling product change for user {user.id}")
        # Update subscription plan
        pass
    
    def generate_checkout_url(self, user_id: str, email: str, product_id: str, plan_name: str, price: float, currency: str = 'EUR') -> str:
        """Generate RevenueCat checkout URL for web integration"""
        params = {
            'app_user_id': user_id,
            'email': email,
            'product_id': product_id,
            'plan_name': plan_name,
            'price': str(price),
            'currency': currency,
            'return_url': f"{settings.BASE_URL}/payment/success",
            'cancel_url': f"{settings.BASE_URL}/join?step=pricing"
        }
        
        query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
        return f"{self.base_url}/checkout?{query_string}"

# Global instance
revenuecat_service = RevenueCatService()

"""
Messaging Campaign Service
Handles customer selection, campaign sending, and delivery tracking for messaging campaigns.
"""
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, or_, func, desc, select
from models.campaign import Campaign, CampaignRecipient, CampaignMessage
from models.place_existing import Booking
from models.user import User
from schemas.campaign import MessagingCustomerResponse, MessagingStatsResponse
# Mock services for now - will be replaced with real implementations
class MockEmailService:
    def send_batch_campaign_emails(self, recipients, subject, body, campaign_id, db):
        return {'sent_count': 0, 'failed_count': 0, 'errors': []}

class MockWhatsAppService:
    def send_batch_messages(self, recipients, message, campaign_id, db):
        return {'sent_count': 0, 'failed_count': 0, 'errors': []}

logger = logging.getLogger(__name__)


class MessagingCampaignService:
    """Service for managing messaging campaigns"""
    
    def __init__(self):
        self.email_service = MockEmailService()
        self.whatsapp_service = MockWhatsAppService()
    
    async def get_eligible_customers(
        self, 
        db: AsyncSession, 
        place_ids: List[int], 
        filters: Optional[Dict[str, Any]] = None
    ) -> List[MessagingCustomerResponse]:
        """
        Get customers eligible for messaging campaigns from selected places
        
        Args:
            db: Database session
            place_ids: List of place IDs to get customers from
            filters: Optional filters (has_email, has_phone, marketing_consent, search)
        
        Returns:
            List of eligible customers with contact information
        """
        try:
            # Base query to get customers from bookings at selected places
            # Only customers with marketing consent
            query = select(
                User.id.label('user_id'),
                User.name,
                User.email,
                User.phone,
                User.gdpr_marketing_consent,
                func.max(Booking.booking_date).label('last_booking_date'),
                func.count(Booking.id).label('total_bookings')
            ).select_from(
                User.__table__.join(Booking.__table__, User.id == Booking.user_id)
            ).where(
                and_(
                    Booking.place_id.in_(place_ids),
                    User.gdpr_marketing_consent == True,  # Only customers with marketing consent
                    User.is_active == True
                )
            ).group_by(
                User.id, User.name, User.email, User.phone, User.gdpr_marketing_consent
            )
            
            # Apply filters
            if filters:
                if filters.get('has_email'):
                    query = query.where(and_(User.email.isnot(None), User.email != ''))
                
                if filters.get('has_phone'):
                    query = query.where(and_(User.phone.isnot(None), User.phone != ''))
                
                if filters.get('search'):
                    search_term = f"%{filters['search']}%"
                    query = query.where(
                        or_(
                            User.name.ilike(search_term),
                            User.email.ilike(search_term)
                        )
                    )
            
            # Execute query
            result = await db.execute(query)
            results = result.all()
            
            # Convert to response objects
            customers = []
            for row in results:
                customer = MessagingCustomerResponse(
                    user_id=row.user_id,
                    name=row.name,
                    email=row.email,
                    phone=row.phone,
                    gdpr_marketing_consent=row.gdpr_marketing_consent,
                    last_booking_date=row.last_booking_date,
                    total_bookings=row.total_bookings,
                    is_selected=False
                )
                customers.append(customer)
            
            logger.info(f"Found {len(customers)} eligible customers for places {place_ids}")
            return customers
            
        except Exception as e:
            logger.error(f"Error getting eligible customers: {str(e)}")
            return []
    
    async def add_recipients(
        self, 
        db: AsyncSession, 
        campaign_id: int, 
        user_ids: List[int]
    ) -> Dict[str, Any]:
        """
        Add recipients to a messaging campaign
        
        Args:
            db: Database session
            campaign_id: Campaign ID
            user_ids: List of user IDs to add as recipients
        
        Returns:
            Dict with success status and details
        """
        try:
            # Get campaign to verify it exists and is messaging type
            campaign_query = select(Campaign).where(Campaign.id == campaign_id)
            campaign_result = await db.execute(campaign_query)
            campaign = campaign_result.scalar_one_or_none()
            
            if not campaign:
                return {'success': False, 'error': 'Campaign not found'}
            
            if campaign.type != 'messaging':
                return {'success': False, 'error': 'Campaign is not a messaging campaign'}
            
            # Get user details for the recipients
            users_query = select(User).where(User.id.in_(user_ids))
            users_result = await db.execute(users_query)
            users = users_result.scalars().all()
            user_dict = {user.id: user for user in users}
            
            added_count = 0
            skipped_count = 0
            
            for user_id in user_ids:
                if user_id not in user_dict:
                    skipped_count += 1
                    continue
                
                user = user_dict[user_id]
                
                # Check if recipient already exists
                existing_query = select(CampaignRecipient).where(
                    and_(
                        CampaignRecipient.campaign_id == campaign_id,
                        CampaignRecipient.user_id == user_id
                    )
                )
                existing_result = await db.execute(existing_query)
                existing = existing_result.scalar_one_or_none()
                
                if existing:
                    skipped_count += 1
                    continue
                
                # Create new recipient
                recipient = CampaignRecipient(
                    campaign_id=campaign_id,
                    user_id=user_id,
                    customer_email=user.email,
                    customer_phone=user.phone,
                    status='pending'
                )
                
                db.add(recipient)
                added_count += 1
            
            await db.commit()
            
            logger.info(f"Added {added_count} recipients to campaign {campaign_id}, skipped {skipped_count}")
            
            return {
                'success': True,
                'added_count': added_count,
                'skipped_count': skipped_count
            }
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error adding recipients: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def remove_recipient(
        self, 
        db: AsyncSession, 
        campaign_id: int, 
        recipient_id: int
    ) -> Dict[str, Any]:
        """
        Remove a recipient from a messaging campaign
        
        Args:
            db: Database session
            campaign_id: Campaign ID
            recipient_id: Recipient ID to remove
        
        Returns:
            Dict with success status
        """
        try:
            recipient_query = select(CampaignRecipient).where(
                and_(
                    CampaignRecipient.id == recipient_id,
                    CampaignRecipient.campaign_id == campaign_id
                )
            )
            recipient_result = await db.execute(recipient_query)
            recipient = recipient_result.scalar_one_or_none()
            
            if not recipient:
                return {'success': False, 'error': 'Recipient not found'}
            
            # Only allow removal if not yet sent
            if recipient.status == 'sent':
                return {'success': False, 'error': 'Cannot remove recipient that has already been sent'}
            
            await db.delete(recipient)
            await db.commit()
            
            logger.info(f"Removed recipient {recipient_id} from campaign {campaign_id}")
            
            return {'success': True}
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error removing recipient: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_campaign_recipients(
        self, 
        db: AsyncSession, 
        campaign_id: int
    ) -> List[CampaignRecipient]:
        """
        Get all recipients for a messaging campaign
        
        Args:
            db: Database session
            campaign_id: Campaign ID
        
        Returns:
            List of campaign recipients
        """
        try:
            recipients_query = select(CampaignRecipient).where(
                CampaignRecipient.campaign_id == campaign_id
            ).order_by(desc(CampaignRecipient.created_at))
            
            recipients_result = await db.execute(recipients_query)
            recipients = recipients_result.scalars().all()
            
            return recipients
            
        except Exception as e:
            logger.error(f"Error getting campaign recipients: {str(e)}")
            return []
    
    async def send_campaign(
        self, 
        db: AsyncSession, 
        campaign_id: int
    ) -> Dict[str, Any]:
        """
        Send a messaging campaign to all pending recipients
        
        Args:
            db: Database session
            campaign_id: Campaign ID
        
        Returns:
            Dict with sending results
        """
        try:
            # Get campaign and verify it's messaging type
            campaign_query = select(Campaign).where(Campaign.id == campaign_id)
            campaign_result = await db.execute(campaign_query)
            campaign = campaign_result.scalar_one_or_none()
            
            if not campaign:
                return {'success': False, 'error': 'Campaign not found'}
            
            if campaign.type != 'messaging':
                return {'success': False, 'error': 'Campaign is not a messaging campaign'}
            
            # Get campaign messages
            messages_query = select(CampaignMessage).where(
                CampaignMessage.campaign_id == campaign_id
            )
            messages_result = await db.execute(messages_query)
            messages = messages_result.scalars().all()
            
            if not messages:
                return {'success': False, 'error': 'No messages configured for campaign'}
            
            # Get pending recipients
            recipients_query = select(CampaignRecipient).where(
                and_(
                    CampaignRecipient.campaign_id == campaign_id,
                    CampaignRecipient.status == 'pending'
                )
            )
            recipients_result = await db.execute(recipients_query)
            recipients = recipients_result.scalars().all()
            
            if not recipients:
                return {'success': False, 'error': 'No pending recipients found'}
            
            # Send messages via configured channels
            results = {
                'success': True,
                'sent_count': 0,
                'failed_count': 0,
                'channel_results': {}
            }
            
            for message in messages:
                channel = message.channel
                channel_results = {'sent': 0, 'failed': 0, 'errors': []}
                
                if channel == 'email':
                    # Send emails
                    email_recipients = [r for r in recipients if r.customer_email]
                    if email_recipients:
                        email_result = self.email_service.send_batch_campaign_emails(
                            recipients=email_recipients,
                            subject=message.subject or '',
                            body=message.message_body,
                            campaign_id=campaign_id,
                            db=db
                        )
                        channel_results['sent'] = email_result['sent_count']
                        channel_results['failed'] = email_result['failed_count']
                        channel_results['errors'] = email_result.get('errors', [])
                
                elif channel == 'whatsapp':
                    # Send WhatsApp messages
                    whatsapp_recipients = [r for r in recipients if r.customer_phone]
                    if whatsapp_recipients:
                        whatsapp_result = self.whatsapp_service.send_batch_messages(
                            recipients=whatsapp_recipients,
                            message=message.message_body,
                            campaign_id=campaign_id,
                            db=db
                        )
                        channel_results['sent'] = whatsapp_result['sent_count']
                        channel_results['failed'] = whatsapp_result['failed_count']
                        channel_results['errors'] = whatsapp_result.get('errors', [])
                
                results['channel_results'][channel] = channel_results
                results['sent_count'] += channel_results['sent']
                results['failed_count'] += channel_results['failed']
            
            # Update campaign status
            if results['sent_count'] > 0:
                campaign.status = 'active'
                await db.commit()
            
            logger.info(f"Campaign {campaign_id} sending completed. Sent: {results['sent_count']}, Failed: {results['failed_count']}")
            
            return results
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error sending campaign: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_campaign_stats(
        self, 
        db: AsyncSession, 
        campaign_id: int
    ) -> MessagingStatsResponse:
        """
        Get statistics for a messaging campaign
        
        Args:
            db: Database session
            campaign_id: Campaign ID
        
        Returns:
            Messaging campaign statistics
        """
        try:
            # Get recipient counts by status
            stats_query = select(
                CampaignRecipient.status,
                func.count(CampaignRecipient.id).label('count')
            ).where(
                CampaignRecipient.campaign_id == campaign_id
            ).group_by(CampaignRecipient.status)
            
            stats_result = await db.execute(stats_query)
            stats_data = stats_result.all()
            
            # Initialize counters
            total_recipients = 0
            sent_count = 0
            failed_count = 0
            pending_count = 0
            
            for status, count in stats_data:
                total_recipients += count
                if status == 'sent':
                    sent_count = count
                elif status == 'failed':
                    failed_count = count
                elif status == 'pending':
                    pending_count = count
            
            # Calculate delivery rate
            delivery_rate = 0.0
            if total_recipients > 0:
                delivery_rate = (sent_count / total_recipients) * 100
            
            # Get channel counts
            email_query = select(func.count(CampaignRecipient.id)).where(
                and_(
                    CampaignRecipient.campaign_id == campaign_id,
                    CampaignRecipient.customer_email.isnot(None)
                )
            )
            email_result = await db.execute(email_query)
            email_count = email_result.scalar()
            
            whatsapp_query = select(func.count(CampaignRecipient.id)).where(
                and_(
                    CampaignRecipient.campaign_id == campaign_id,
                    CampaignRecipient.customer_phone.isnot(None)
                )
            )
            whatsapp_result = await db.execute(whatsapp_query)
            whatsapp_count = whatsapp_result.scalar()
            
            # Get last sent time
            last_sent_query = select(func.max(CampaignRecipient.sent_at)).where(
                and_(
                    CampaignRecipient.campaign_id == campaign_id,
                    CampaignRecipient.status == 'sent'
                )
            )
            last_sent_result = await db.execute(last_sent_query)
            last_sent = last_sent_result.scalar()
            
            return MessagingStatsResponse(
                total_recipients=total_recipients,
                sent_count=sent_count,
                failed_count=failed_count,
                pending_count=pending_count,
                delivery_rate=round(delivery_rate, 2),
                email_count=email_count,
                whatsapp_count=whatsapp_count,
                last_sent_at=last_sent
            )
            
        except Exception as e:
            logger.error(f"Error getting campaign stats: {str(e)}")
            return MessagingStatsResponse(
                total_recipients=0,
                sent_count=0,
                failed_count=0,
                pending_count=0,
                delivery_rate=0.0,
                email_count=0,
                whatsapp_count=0,
                last_sent_at=None
            )


# Global instance
messaging_campaign_service = MessagingCampaignService()

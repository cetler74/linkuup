"""
Campaign Scheduler
Handles scheduled sending of messaging campaigns.
"""
import asyncio
import logging
from datetime import datetime, timezone
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import select, and_

from ..core.database import get_db
from ..models.campaign import Campaign
from ..services.messaging_campaign_service import messaging_campaign_service

logger = logging.getLogger(__name__)


class CampaignScheduler:
    """Scheduler for handling scheduled messaging campaigns"""
    
    def __init__(self):
        self.running = False
        self.check_interval = 300  # 5 minutes in seconds
    
    async def start(self):
        """Start the campaign scheduler"""
        if self.running:
            logger.warning("Campaign scheduler is already running")
            return
        
        self.running = True
        logger.info("Campaign scheduler started")
        
        while self.running:
            try:
                await self.check_scheduled_campaigns()
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"Error in campaign scheduler: {str(e)}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying
    
    def stop(self):
        """Stop the campaign scheduler"""
        self.running = False
        logger.info("Campaign scheduler stopped")
    
    async def check_scheduled_campaigns(self):
        """Check for campaigns that are ready to be sent"""
        try:
            # Get database session
            async for db in get_db():
                # Find campaigns that are scheduled and ready to send
                now = datetime.now(timezone.utc)
                
                campaigns_query = select(Campaign).where(
                    and_(
                        Campaign.type == 'messaging',
                        Campaign.status == 'scheduled',
                        Campaign.config['scheduled_send_time'].astext <= now.isoformat()
                    )
                )
                
                result = await db.execute(campaigns_query)
                campaigns = result.scalars().all()
                
                if not campaigns:
                    logger.debug("No scheduled campaigns ready to send")
                    return
                
                logger.info(f"Found {len(campaigns)} scheduled campaigns ready to send")
                
                # Process each campaign
                for campaign in campaigns:
                    await self.process_scheduled_campaign(db, campaign)
                
                break  # Exit the async generator
                
        except Exception as e:
            logger.error(f"Error checking scheduled campaigns: {str(e)}")
    
    async def process_scheduled_campaign(self, db: Session, campaign: Campaign):
        """Process a single scheduled campaign"""
        try:
            logger.info(f"Processing scheduled campaign: {campaign.name} (ID: {campaign.id})")
            
            # Send the campaign
            result = await messaging_campaign_service.send_campaign(db, campaign.id)
            
            if result['success']:
                # Update campaign status to active
                campaign.status = 'active'
                await db.commit()
                
                logger.info(f"Successfully sent scheduled campaign: {campaign.name}")
                logger.info(f"Sent: {result['sent_count']}, Failed: {result['failed_count']}")
            else:
                # Update campaign status to failed
                campaign.status = 'failed'
                await db.commit()
                
                logger.error(f"Failed to send scheduled campaign: {campaign.name}")
                logger.error(f"Error: {result['error']}")
                
        except Exception as e:
            logger.error(f"Error processing scheduled campaign {campaign.id}: {str(e)}")
            
            # Mark campaign as failed
            try:
                campaign.status = 'failed'
                await db.commit()
            except Exception as commit_error:
                logger.error(f"Error updating campaign status: {str(commit_error)}")
    
    async def send_campaign_now(self, campaign_id: int) -> dict:
        """Send a campaign immediately (for testing or manual triggers)"""
        try:
            async for db in get_db():
                result = await messaging_campaign_service.send_campaign(db, campaign_id)
                
                if result['success']:
                    # Update campaign status
                    campaign_query = select(Campaign).where(Campaign.id == campaign_id)
                    campaign_result = await db.execute(campaign_query)
                    campaign = campaign_result.scalar_one_or_none()
                    
                    if campaign:
                        campaign.status = 'active'
                        await db.commit()
                
                return result
                
        except Exception as e:
            logger.error(f"Error sending campaign immediately: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def get_scheduled_campaigns(self) -> List[dict]:
        """Get list of scheduled campaigns for monitoring"""
        try:
            async for db in get_db():
                now = datetime.now(timezone.utc)
                
                # Get all scheduled messaging campaigns
                campaigns_query = select(Campaign).where(
                    and_(
                        Campaign.type == 'messaging',
                        Campaign.status == 'scheduled'
                    )
                )
                
                result = await db.execute(campaigns_query)
                campaigns = result.scalars().all()
                
                scheduled_campaigns = []
                for campaign in campaigns:
                    scheduled_time = None
                    if campaign.config and 'scheduled_send_time' in campaign.config:
                        try:
                            scheduled_time = datetime.fromisoformat(
                                campaign.config['scheduled_send_time'].replace('Z', '+00:00')
                            )
                        except (ValueError, TypeError):
                            pass
                    
                    scheduled_campaigns.append({
                        'id': campaign.id,
                        'name': campaign.name,
                        'scheduled_send_time': scheduled_time,
                        'is_ready': scheduled_time and scheduled_time <= now if scheduled_time else False,
                        'created_at': campaign.created_at
                    })
                
                return scheduled_campaigns
                
        except Exception as e:
            logger.error(f"Error getting scheduled campaigns: {str(e)}")
            return []


# Global scheduler instance
campaign_scheduler = CampaignScheduler()


async def start_campaign_scheduler():
    """Start the campaign scheduler (called from main app)"""
    await campaign_scheduler.start()


def stop_campaign_scheduler():
    """Stop the campaign scheduler (called from main app)"""
    campaign_scheduler.stop()


# CLI command for manual testing
if __name__ == "__main__":
    async def main():
        """Manual testing of campaign scheduler"""
        print("Starting campaign scheduler for testing...")
        
        # Check scheduled campaigns
        await campaign_scheduler.check_scheduled_campaigns()
        
        # Get scheduled campaigns list
        scheduled = await campaign_scheduler.get_scheduled_campaigns()
        print(f"Found {len(scheduled)} scheduled campaigns:")
        for campaign in scheduled:
            print(f"  - {campaign['name']} (ID: {campaign['id']}) - Ready: {campaign['is_ready']}")
    
    asyncio.run(main())

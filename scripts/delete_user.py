#!/usr/bin/env python3
"""
Script to safely delete a user and all related records from the database.
Usage: python3 scripts/delete_user.py <email>
"""

import asyncio
import sys
import os

# Add backend directory to path
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.insert(0, backend_dir)

from sqlalchemy import text, select
from core.database import AsyncSessionLocal
from models.user import User
from models.billing import BillingCustomer, Subscription as BillingSubscription, Invoice as BillingInvoice
from models.subscription import UserPlaceSubscription
from models.notification import Notification
from models.campaign import Campaign


async def delete_user_by_email(email: str) -> bool:
    """
    Delete a user and all related records from the database.
    
    Args:
        email: User email address
        
    Returns:
        True if user was deleted, False if user not found
    """
    async with AsyncSessionLocal() as db:
        try:
            # Find the user
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            
            if not user:
                print(f"❌ User with email '{email}' not found.")
                return False
            
            user_id = user.id
            print(f"🔍 Found user: ID={user_id}, Email={email}, Name={user.name}")
            
            # Confirm deletion
            print(f"\n⚠️  WARNING: This will delete the user and ALL related data!")
            print(f"   User ID: {user_id}")
            print(f"   Email: {email}")
            print(f"   Name: {user.name}")
            print(f"   User Type: {user.user_type}")
            
            # Count related records
            print(f"\n📊 Counting related records...")
            
            # Count notifications
            notifications_count = await db.execute(
                text("SELECT COUNT(*) FROM notifications WHERE owner_id = :user_id"),
                {"user_id": user_id}
            )
            notif_count = notifications_count.scalar() or 0
            print(f"   Notifications: {notif_count}")
            
            # Count bookings
            bookings_count = await db.execute(
                text("SELECT COUNT(*) FROM bookings WHERE user_id = :user_id"),
                {"user_id": user_id}
            )
            bookings_cnt = bookings_count.scalar() or 0
            print(f"   Bookings: {bookings_cnt}")
            
            # Count subscriptions
            subs_count = await db.execute(
                select(BillingSubscription).where(BillingSubscription.user_id == user_id)
            )
            subs_list = subs_count.scalars().all()
            print(f"   Billing Subscriptions: {len(subs_list)}")
            
            # Count place subscriptions
            place_subs_count = await db.execute(
                select(UserPlaceSubscription).where(UserPlaceSubscription.user_id == user_id)
            )
            place_subs_list = place_subs_count.scalars().all()
            print(f"   Place Subscriptions: {len(place_subs_list)}")
            
            # Count campaigns
            campaigns_count = await db.execute(
                select(Campaign).where(Campaign.created_by == user_id)
            )
            campaigns_list = campaigns_count.scalars().all()
            print(f"   Campaigns: {len(campaigns_list)}")
            
            # Count billing customers
            billing_customers_count = await db.execute(
                select(BillingCustomer).where(BillingCustomer.user_id == user_id)
            )
            billing_customers_list = billing_customers_count.scalars().all()
            print(f"   Billing Customers: {len(billing_customers_list)}")
            
            # Count invoices
            invoices_count = await db.execute(
                select(BillingInvoice).where(BillingInvoice.user_id == user_id)
            )
            invoices_list = invoices_count.scalars().all()
            print(f"   Billing Invoices: {len(invoices_list)}")
            
            print(f"\n🗑️  Proceeding with deletion...")
            
            # Delete in correct order to handle foreign keys
            
            # 1. Delete notifications (has CASCADE, but being explicit)
            if notif_count > 0:
                await db.execute(
                    text("DELETE FROM notifications WHERE owner_id = :user_id"),
                    {"user_id": user_id}
                )
                print(f"   ✅ Deleted {notif_count} notifications")
            
            # 2. Delete bookings (may have foreign keys)
            if bookings_cnt > 0:
                await db.execute(
                    text("DELETE FROM bookings WHERE user_id = :user_id"),
                    {"user_id": user_id}
                )
                print(f"   ✅ Deleted {bookings_cnt} bookings")
            
            # 3. Delete place subscriptions
            if place_subs_list:
                for sub in place_subs_list:
                    await db.delete(sub)
                print(f"   ✅ Deleted {len(place_subs_list)} place subscriptions")
            
            # 4. Delete billing subscriptions
            if subs_list:
                for sub in subs_list:
                    await db.delete(sub)
                print(f"   ✅ Deleted {len(subs_list)} billing subscriptions")
            
            # 5. Delete billing invoices
            if invoices_list:
                for invoice in invoices_list:
                    await db.delete(invoice)
                print(f"   ✅ Deleted {len(invoices_list)} billing invoices")
            
            # 6. Delete billing customers
            if billing_customers_list:
                for bc in billing_customers_list:
                    await db.delete(bc)
                print(f"   ✅ Deleted {len(billing_customers_list)} billing customers")
            
            # 7. Delete campaigns (using created_by, not owner_id)
            if campaigns_list:
                for campaign in campaigns_list:
                    await db.delete(campaign)
                print(f"   ✅ Deleted {len(campaigns_list)} campaigns")
            
            # 8. Delete any other related records (campaign recipients, etc.)
            # Check for campaign recipients
            campaign_recipients_count = await db.execute(
                text("""
                    SELECT COUNT(*) FROM campaign_recipients cr
                    JOIN campaigns c ON c.id = cr.campaign_id
                    WHERE c.created_by = :user_id
                """),
                {"user_id": user_id}
            )
            cr_count = campaign_recipients_count.scalar() or 0
            if cr_count > 0:
                await db.execute(
                    text("""
                        DELETE FROM campaign_recipients
                        WHERE campaign_id IN (
                            SELECT id FROM campaigns WHERE created_by = :user_id
                        )
                    """),
                    {"user_id": user_id}
                )
                print(f"   ✅ Deleted {cr_count} campaign recipients")
            
            # 9. Finally, delete the user
            await db.delete(user)
            await db.commit()
            
            print(f"\n✅ Successfully deleted user '{email}' (ID: {user_id})")
            print(f"   Total records deleted:")
            print(f"   - User: 1")
            print(f"   - Notifications: {notif_count}")
            print(f"   - Bookings: {bookings_cnt}")
            print(f"   - Place Subscriptions: {len(place_subs_list)}")
            print(f"   - Billing Subscriptions: {len(subs_list)}")
            print(f"   - Billing Invoices: {len(invoices_list)}")
            print(f"   - Billing Customers: {len(billing_customers_list)}")
            print(f"   - Campaigns: {len(campaigns_list)}")
            print(f"   - Campaign Recipients: {cr_count}")
            
            return True
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Error deleting user: {e}")
            import traceback
            print(traceback.format_exc())
            return False


async def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/delete_user.py <email>")
        print("Example: python3 scripts/delete_user.py user@example.com")
        sys.exit(1)
    
    email = sys.argv[1].strip()
    
    if not email:
        print("❌ Error: Email cannot be empty")
        sys.exit(1)
    
    print(f"🗑️  Deleting user: {email}\n")
    
    success = await delete_user_by_email(email)
    
    if success:
        print(f"\n✅ User deletion completed successfully!")
        sys.exit(0)
    else:
        print(f"\n❌ User deletion failed!")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())


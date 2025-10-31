import asyncio
from sqlalchemy import text
from core.database import AsyncSessionLocal


FEATURE_CODE = 'promotions'
FEATURE_NAME = 'Promotions'
PLAN_ID = 1001
PLAN_NAME = 'Dev Plan'

# Adjust these if your dev user/place differ
DEV_USER_ID = 8
DEV_PLACE_ID = 2


async def seed():
    async with AsyncSessionLocal() as session:
        # Ensure feature exists
        await session.execute(
            text(
                """
                INSERT INTO features (code, name)
                VALUES (:code, :name)
                ON CONFLICT (code) DO NOTHING
                """
            ),
            {"code": FEATURE_CODE, "name": FEATURE_NAME},
        )

        # Ensure plan exists
        await session.execute(
            text(
                """
                INSERT INTO plans (id, name)
                VALUES (:id, :name)
                ON CONFLICT (id) DO NOTHING
                """
            ),
            {"id": PLAN_ID, "name": PLAN_NAME},
        )

        # Link plan -> feature and enable
        await session.execute(
            text(
                """
                INSERT INTO plan_features (plan_id, feature_id, enabled)
                SELECT :plan_id, f.id, TRUE
                FROM features f
                WHERE f.code = :code
                ON CONFLICT DO NOTHING
                """
            ),
            {"plan_id": PLAN_ID, "code": FEATURE_CODE},
        )

        # Create active subscription for user/place
        await session.execute(
            text(
                """
                INSERT INTO user_place_subscriptions (user_id, place_id, plan_id, status)
                VALUES (:user_id, :place_id, :plan_id, 'ACTIVE')
                ON CONFLICT DO NOTHING
                """
            ),
            {"user_id": DEV_USER_ID, "place_id": DEV_PLACE_ID, "plan_id": PLAN_ID},
        )

        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())



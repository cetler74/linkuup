-- Create internal subscription tables (place-scoped)
-- Database: linkuup_db

BEGIN;

-- Plans
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
  trial_days INTEGER NOT NULL DEFAULT 14,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Features
CREATE TABLE IF NOT EXISTS features (
  id SERIAL PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Plan features matrix
CREATE TABLE IF NOT EXISTS plan_features (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  feature_id INTEGER NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  limit_value INTEGER NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_plan_feature UNIQUE(plan_id, feature_id)
);

-- Enum for subscription status
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('trialing','active','past_due','canceled','expired','none');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Subscription per user and place
CREATE TABLE IF NOT EXISTS user_place_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  place_id INTEGER NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES plans(id),
  status subscription_status NOT NULL DEFAULT 'trialing',
  trial_start_at TIMESTAMPTZ NULL,
  trial_end_at TIMESTAMPTZ NULL,
  current_period_start TIMESTAMPTZ NULL,
  current_period_end TIMESTAMPTZ NULL,
  canceled_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial unique index to ensure a single active/trialing subscription per (user, place)
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_user_place_subscription
ON user_place_subscriptions (user_id, place_id)
WHERE status IN ('trialing','active');

-- Subscription events (audit)
CREATE TABLE IF NOT EXISTS subscription_events (
  id SERIAL PRIMARY KEY,
  user_place_subscription_id INTEGER NOT NULL REFERENCES user_place_subscriptions(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;



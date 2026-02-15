-- Add missing columns to profiles table to support financial settings and consultation requirements
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS price_brl_per_minute DECIMAL(10,2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS initial_fee_brl DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS requires_birthdate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_birthtime BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN profiles.price_brl_per_minute IS 'Oracle earnings per minute in BRL';
COMMENT ON COLUMN profiles.initial_fee_brl IS 'Initial fee for opening a consultation in BRL';
COMMENT ON COLUMN profiles.requires_birthdate IS 'Whether the oracle requires the client birthday';
COMMENT ON COLUMN profiles.requires_birthtime IS 'Whether the oracle requires the client birth time';

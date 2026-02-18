-- Create a view to calculate average prices of oracles
CREATE OR REPLACE VIEW oracle_average_prices AS
SELECT
  ROUND(AVG(price_brl_per_minute)::numeric, 2) as avg_price_per_minute,
  ROUND(AVG(initial_fee_brl)::numeric, 2) as avg_initial_fee,
  ROUND(AVG(price_per_message)::numeric, 0) as avg_price_per_message
FROM profiles
WHERE (role = 'oracle' OR role = 'owner')
AND application_status = 'approved'
AND is_ai = false;

-- Grant access to authenticated users
GRANT SELECT ON oracle_average_prices TO authenticated;
GRANT SELECT ON oracle_average_prices TO anon;

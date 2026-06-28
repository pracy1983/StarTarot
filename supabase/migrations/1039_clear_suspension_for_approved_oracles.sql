-- Migration 1039: approved oracles should not remain hidden by stale suspension dates.

UPDATE public.profiles
SET suspended_until = NULL
WHERE application_status = 'approved'
  AND role IN ('oracle', 'owner')
  AND suspended_until IS NOT NULL
  AND suspended_until > now();

-- Migration 1038: approved oracles must have at least one visible service.
-- If both service flags are false/null, the marketplace filtered them out entirely.

UPDATE public.profiles
SET allows_video = false,
    allows_text = true
WHERE application_status = 'approved'
  AND role IN ('oracle', 'owner')
  AND COALESCE(allows_video, false) = false
  AND COALESCE(allows_text, false) = false;

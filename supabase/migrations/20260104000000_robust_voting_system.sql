-- =====================================================
-- Migration: Robust Voting System with Anti-Spam
-- =====================================================
-- Creates:
-- - votes table (audit trail + deduplication)
-- - vote_rate_limits table (rate limiting + spam detection)
-- - vote_for_checkpoint_v2() function (robust voting logic)
-- - detect_spam_patterns() function (automated spam detection)
-- =====================================================

-- =====================================================
-- 1. CREATE VOTES TABLE
-- =====================================================
-- Stores complete vote history for audit and deduplication
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  voter_fingerprint TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('up', 'down')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  -- One fingerprint = one vote per checkpoint
  UNIQUE(checkpoint_id, voter_fingerprint)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_votes_checkpoint ON votes(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_votes_fingerprint ON votes(voter_fingerprint);
CREATE INDEX IF NOT EXISTS idx_votes_ip ON votes(ip_address);
CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes(created_at);

COMMENT ON TABLE votes IS 'Complete vote history for audit trail and deduplication';
COMMENT ON COLUMN votes.voter_fingerprint IS 'SHA-256 hash of browser fingerprint (anonymous)';
COMMENT ON COLUMN votes.ip_address IS 'IP address for spam pattern detection';

-- =====================================================
-- 2. CREATE VOTE_RATE_LIMITS TABLE
-- =====================================================
-- Tracks rate limiting and spam detection per fingerprint
CREATE TABLE IF NOT EXISTS public.vote_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voter_fingerprint TEXT NOT NULL UNIQUE,
  vote_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_vote_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  is_suspicious BOOLEAN DEFAULT false,
  suspicious_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_fingerprint ON vote_rate_limits(voter_fingerprint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_suspicious ON vote_rate_limits(is_suspicious);

COMMENT ON TABLE vote_rate_limits IS 'Rate limiting and spam detection tracking per fingerprint';
COMMENT ON COLUMN vote_rate_limits.vote_count IS 'Number of votes in current sliding window';
COMMENT ON COLUMN vote_rate_limits.window_start IS 'Start of current 1-hour sliding window';
COMMENT ON COLUMN vote_rate_limits.is_suspicious IS 'Flagged as suspicious by spam detection';

-- =====================================================
-- 3. CREATE VOTE_FOR_CHECKPOINT_V2 FUNCTION
-- =====================================================
-- Robust voting function with anti-spam and vote modification
CREATE OR REPLACE FUNCTION vote_for_checkpoint_v2(
  p_checkpoint_id UUID,
  p_vote_type TEXT,
  p_voter_fingerprint TEXT,
  p_ip_address INET,
  p_user_agent TEXT
) RETURNS TABLE(
  success BOOLEAN,
  error_code TEXT,
  message TEXT,
  requires_captcha BOOLEAN
) AS $$
DECLARE
  v_existing_vote TEXT;
  v_is_suspicious BOOLEAN;
  v_vote_count INTEGER;
  v_last_vote TIMESTAMPTZ;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- ===============================================
  -- STEP 1: CHECK RATE LIMIT (10 votes/hour)
  -- ===============================================
  SELECT
    rl.vote_count,
    rl.last_vote_at,
    rl.is_suspicious,
    rl.window_start
  INTO v_vote_count, v_last_vote, v_is_suspicious, v_window_start
  FROM vote_rate_limits rl
  WHERE rl.voter_fingerprint = p_voter_fingerprint;

  -- Reset window if expired
  IF v_window_start IS NOT NULL AND v_window_start < NOW() - INTERVAL '1 hour' THEN
    v_vote_count := 0;
    v_window_start := NOW();
  END IF;

  -- Rate limit exceeded?
  IF v_vote_count IS NOT NULL AND v_vote_count >= 10 THEN
    RETURN QUERY SELECT
      false,
      'RATE_LIMIT_EXCEEDED'::TEXT,
      'Limite de votes atteinte (10/heure)'::TEXT,
      false;
    RETURN;
  END IF;

  -- ===============================================
  -- STEP 2: CHECK COOLDOWN (3 seconds)
  -- ===============================================
  IF v_last_vote IS NOT NULL AND v_last_vote > NOW() - INTERVAL '3 seconds' THEN
    RETURN QUERY SELECT
      false,
      'COOLDOWN_ACTIVE'::TEXT,
      'Veuillez attendre avant de voter à nouveau'::TEXT,
      false;
    RETURN;
  END IF;

  -- ===============================================
  -- STEP 3: CHECK SUSPICIOUS FLAG
  -- ===============================================
  IF v_is_suspicious THEN
    RETURN QUERY SELECT
      false,
      'CAPTCHA_REQUIRED'::TEXT,
      'Validation CAPTCHA nécessaire'::TEXT,
      true;
    RETURN;
  END IF;

  -- ===============================================
  -- STEP 4: GET EXISTING VOTE
  -- ===============================================
  SELECT vote_type INTO v_existing_vote
  FROM votes
  WHERE checkpoint_id = p_checkpoint_id
    AND voter_fingerprint = p_voter_fingerprint;

  -- ===============================================
  -- STEP 5: PROCESS VOTE WITH TRANSACTION
  -- ===============================================

  IF v_existing_vote IS NULL THEN
    -- ========================================
    -- CASE A: NEW VOTE
    -- ========================================
    INSERT INTO votes (checkpoint_id, voter_fingerprint, vote_type, ip_address, user_agent)
    VALUES (p_checkpoint_id, p_voter_fingerprint, p_vote_type, p_ip_address, p_user_agent);

    -- Increment counter
    IF p_vote_type = 'up' THEN
      UPDATE checkpoints SET upvotes = upvotes + 1 WHERE id = p_checkpoint_id;
    ELSE
      UPDATE checkpoints SET downvotes = downvotes + 1 WHERE id = p_checkpoint_id;
    END IF;

  ELSIF v_existing_vote = p_vote_type THEN
    -- ========================================
    -- CASE B: CANCEL VOTE (same type)
    -- ========================================
    DELETE FROM votes
    WHERE checkpoint_id = p_checkpoint_id
      AND voter_fingerprint = p_voter_fingerprint;

    -- Decrement counter
    IF p_vote_type = 'up' THEN
      UPDATE checkpoints SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = p_checkpoint_id;
    ELSE
      UPDATE checkpoints SET downvotes = GREATEST(downvotes - 1, 0) WHERE id = p_checkpoint_id;
    END IF;

  ELSE
    -- ========================================
    -- CASE C: CHANGE VOTE (up ↔ down)
    -- ========================================
    UPDATE votes
    SET vote_type = p_vote_type, updated_at = NOW()
    WHERE checkpoint_id = p_checkpoint_id
      AND voter_fingerprint = p_voter_fingerprint;

    -- Adjust both counters
    IF p_vote_type = 'up' THEN
      UPDATE checkpoints
      SET upvotes = upvotes + 1,
          downvotes = GREATEST(downvotes - 1, 0)
      WHERE id = p_checkpoint_id;
    ELSE
      UPDATE checkpoints
      SET downvotes = downvotes + 1,
          upvotes = GREATEST(upvotes - 1, 0)
      WHERE id = p_checkpoint_id;
    END IF;
  END IF;

  -- ===============================================
  -- STEP 6: UPDATE RATE LIMIT
  -- ===============================================
  INSERT INTO vote_rate_limits (voter_fingerprint, vote_count, last_vote_at, window_start)
  VALUES (p_voter_fingerprint, 1, NOW(), NOW())
  ON CONFLICT (voter_fingerprint) DO UPDATE
  SET vote_count = CASE
        WHEN vote_rate_limits.window_start < NOW() - INTERVAL '1 hour'
        THEN 1
        ELSE vote_rate_limits.vote_count + 1
      END,
      last_vote_at = NOW(),
      window_start = CASE
        WHEN vote_rate_limits.window_start < NOW() - INTERVAL '1 hour'
        THEN NOW()
        ELSE vote_rate_limits.window_start
      END,
      updated_at = NOW();

  -- ===============================================
  -- STEP 7: RETURN SUCCESS
  -- ===============================================
  RETURN QUERY SELECT
    true,
    NULL::TEXT,
    'Vote enregistré'::TEXT,
    false;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION vote_for_checkpoint_v2 IS 'Robust voting function with rate limiting, cooldown, and vote modification support';

-- =====================================================
-- 4. CREATE DETECT_SPAM_PATTERNS FUNCTION
-- =====================================================
-- Analyzes voting patterns and flags suspicious users
CREATE OR REPLACE FUNCTION detect_spam_patterns()
RETURNS void AS $$
BEGIN
  -- ===============================================
  -- PATTERN 1: Multiple rapid votes on different checkpoints
  -- ===============================================
  UPDATE vote_rate_limits
  SET is_suspicious = true,
      suspicious_reason = 'Multiple votes rapides détectés',
      updated_at = NOW()
  WHERE voter_fingerprint IN (
    SELECT voter_fingerprint
    FROM votes
    WHERE created_at > NOW() - INTERVAL '5 minutes'
    GROUP BY voter_fingerprint
    HAVING COUNT(DISTINCT checkpoint_id) > 5
  )
  AND NOT is_suspicious; -- Only flag if not already flagged

  -- ===============================================
  -- PATTERN 2: Same IP with different fingerprints
  -- ===============================================
  UPDATE vote_rate_limits
  SET is_suspicious = true,
      suspicious_reason = 'Multiples fingerprints depuis même IP',
      updated_at = NOW()
  WHERE voter_fingerprint IN (
    SELECT DISTINCT v1.voter_fingerprint
    FROM votes v1
    JOIN votes v2 ON v1.ip_address = v2.ip_address
      AND v1.voter_fingerprint != v2.voter_fingerprint
    WHERE v1.created_at > NOW() - INTERVAL '1 hour'
      AND v1.ip_address IS NOT NULL
  )
  AND NOT is_suspicious;

  -- ===============================================
  -- PATTERN 3: Excessive voting frequency
  -- ===============================================
  UPDATE vote_rate_limits
  SET is_suspicious = true,
      suspicious_reason = 'Fréquence de votes excessive',
      updated_at = NOW()
  WHERE voter_fingerprint IN (
    SELECT voter_fingerprint
    FROM votes
    WHERE created_at > NOW() - INTERVAL '10 minutes'
    GROUP BY voter_fingerprint
    HAVING COUNT(*) > 8
  )
  AND NOT is_suspicious;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detect_spam_patterns IS 'Automated spam detection - analyzes patterns and flags suspicious users';

-- =====================================================
-- 5. DROP OLD VOTING FUNCTION
-- =====================================================
-- Remove simple vote_checkpoint function (replaced by v2)
DROP FUNCTION IF EXISTS vote_checkpoint(UUID, TEXT);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'Robust voting system migration completed successfully!';
  RAISE NOTICE 'Created tables: votes, vote_rate_limits';
  RAISE NOTICE 'Created functions: vote_for_checkpoint_v2, detect_spam_patterns';
  RAISE NOTICE 'Removed old function: vote_checkpoint';
END $$;

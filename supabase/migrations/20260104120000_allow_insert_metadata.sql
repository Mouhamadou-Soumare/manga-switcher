-- =====================================================
-- Allow INSERT for series_metadata (for seeding)
-- =====================================================

-- Policy: Allow inserts from service role or during seeding
CREATE POLICY "Allow service role to insert metadata" ON public.series_metadata
  FOR INSERT
  WITH CHECK (true);

-- Alternative: Si vous voulez permettre aux utilisateurs authentifiés
-- CREATE POLICY "Authenticated users can insert metadata" ON public.series_metadata
--   FOR INSERT
--   WITH CHECK (auth.role() = 'authenticated');

-- Note: Cette policy permet l'insertion depuis n'importe quelle clé API.
-- En production, vous voudrez peut-être la restreindre davantage.

-- Success
DO $$
BEGIN
  RAISE NOTICE '✅ Insert policy created for series_metadata';
  RAISE NOTICE '📝 You can now run the seed script';
END $$;

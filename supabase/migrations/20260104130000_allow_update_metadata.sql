-- Migration: Permettre les mises à jour de series_metadata
-- Description: Ajoute une policy RLS pour permettre les UPDATE sur series_metadata

-- Supprimer l'ancienne policy si elle existe
DROP POLICY IF EXISTS "Allow update of metadata" ON public.series_metadata;

-- Créer une policy permettant les UPDATE (pour le script de liaison)
CREATE POLICY "Allow update of metadata"
ON public.series_metadata
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Note: Cette policy permet à tous d'UPDATE.
-- En production, vous voudrez peut-être restreindre à authenticated users ou service role.

-- ============================================================
-- EVOLVIA FATTURAZIONE — Migrazione 007
-- Aggiunge campo descrizione (opzionale) alla tabella fatture_entrata
-- ============================================================

ALTER TABLE fatture_entrata
  ADD COLUMN IF NOT EXISTS descrizione TEXT;

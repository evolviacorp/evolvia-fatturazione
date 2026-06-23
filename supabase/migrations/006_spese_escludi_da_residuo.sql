-- ============================================================
-- EVOLVIA FATTURAZIONE — Migrazione 006
-- Aggiunge campo escludi_da_residuo alla tabella spese.
-- Le spese con categoria 'Commissione agente/rete' vengono
-- escluse automaticamente dal calcolo del residuo soci perché
-- già detratte dall'imponibile in fattura entrata.
-- ============================================================

-- 1. Aggiungi colonna (se non esiste già)
ALTER TABLE spese
  ADD COLUMN IF NOT EXISTS escludi_da_residuo BOOLEAN NOT NULL DEFAULT false;

-- 2. Allinea le righe esistenti
UPDATE spese
SET escludi_da_residuo = true
WHERE categoria = 'Commissione agente/rete';

-- 3. Trigger: imposta automaticamente escludi_da_residuo su INSERT/UPDATE
CREATE OR REPLACE FUNCTION trg_spese_escludi_da_residuo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.escludi_da_residuo := (NEW.categoria = 'Commissione agente/rete');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_escludi_da_residuo ON spese;
CREATE TRIGGER set_escludi_da_residuo
  BEFORE INSERT OR UPDATE OF categoria ON spese
  FOR EACH ROW EXECUTE FUNCTION trg_spese_escludi_da_residuo();

-- Aggiunge i 3 campi "fattura allegata" direttamente sulla tabella spese.
-- La tabella spese_fatture rimane in DB ma non è più usata dall'applicazione.

ALTER TABLE spese ADD COLUMN IF NOT EXISTS ritenuta_acconto   NUMERIC(12,2) DEFAULT 0;
ALTER TABLE spese ADD COLUMN IF NOT EXISTS contributo_albo     NUMERIC(12,2) DEFAULT 0;
ALTER TABLE spese ADD COLUMN IF NOT EXISTS contributo_albo_nome TEXT;

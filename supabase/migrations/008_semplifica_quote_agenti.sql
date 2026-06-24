-- Migration 008: semplifica fatture_entrata_quote_agenti
-- Rimuove percentuale_trattenuta, importo_lordo, importo_trattenuto
-- Rende importo_girato una colonna semplice (non più GENERATED)

-- 1. Elimina prima le colonne generate (dipendono dalle altre)
ALTER TABLE fatture_entrata_quote_agenti
  DROP COLUMN IF EXISTS importo_trattenuto,
  DROP COLUMN IF EXISTS importo_girato;

-- 2. Elimina le colonne di input non più necessarie
ALTER TABLE fatture_entrata_quote_agenti
  DROP COLUMN IF EXISTS importo_lordo,
  DROP COLUMN IF EXISTS percentuale_trattenuta;

-- 3. Aggiungi importo_girato come colonna semplice
ALTER TABLE fatture_entrata_quote_agenti
  ADD COLUMN importo_girato NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 4. Svuota la tabella trattenuto_soci (concetto rimosso)
--    I dati storici non sono più validi con il nuovo modello
TRUNCATE TABLE fatture_entrata_trattenuto_soci;

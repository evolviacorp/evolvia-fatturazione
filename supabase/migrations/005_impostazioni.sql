-- ============================================================
-- EVOLVIA FATTURAZIONE — Tabelle impostazioni
-- Esegui nell'editor SQL di Supabase
-- ============================================================

-- Categorie spese personalizzate (quelle di default rimangono in formato.js)
CREATE TABLE IF NOT EXISTS categorie_spese (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gruppo     TEXT NOT NULL,
  voce       TEXT NOT NULL,
  ordine     INT  DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (gruppo, voce)
);

ALTER TABLE categorie_spese ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_access" ON categorie_spese
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS banche (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL UNIQUE,
  ordine     INT  DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE banche ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_access" ON banche
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS aliquote_iva (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  percentuale  NUMERIC(5,2) NOT NULL UNIQUE,
  descrizione  TEXT,
  predefinita  BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE aliquote_iva ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_access" ON aliquote_iva
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Aliquote standard italiane
INSERT INTO aliquote_iva (percentuale, descrizione, predefinita) VALUES
  (0,  'Esente / Escluso IVA', false),
  (4,  'IVA agevolata 4%',     false),
  (10, 'IVA ridotta 10%',      false),
  (22, 'IVA ordinaria 22%',    true)
ON CONFLICT (percentuale) DO NOTHING;

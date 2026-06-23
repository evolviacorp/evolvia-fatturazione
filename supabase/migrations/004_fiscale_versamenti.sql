-- ============================================================
-- EVOLVIA FATTURAZIONE — Versamenti IVA e Ritenute d'acconto
-- Esegui nell'editor SQL di Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS versamenti_iva (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anno            INT NOT NULL,
  trimestre       INT NOT NULL CHECK (trimestre IN (1, 2, 3, 4)),
  importo         NUMERIC(12,2) NOT NULL CHECK (importo > 0),
  data_versamento DATE NOT NULL,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE versamenti_iva ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_access" ON versamenti_iva
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_versamenti_iva_anno_trim
  ON versamenti_iva(anno, trimestre);

-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS versamenti_ritenute (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anno            INT NOT NULL,
  mese            INT NOT NULL CHECK (mese BETWEEN 1 AND 12),
  importo         NUMERIC(12,2) NOT NULL CHECK (importo > 0),
  data_versamento DATE NOT NULL,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE versamenti_ritenute ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full_access" ON versamenti_ritenute
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_versamenti_ritenute_anno_mese
  ON versamenti_ritenute(anno, mese);

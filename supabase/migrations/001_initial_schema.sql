-- ============================================================
-- EVOLVIA FATTURAZIONE — Schema iniziale
-- Esegui questo script nell'editor SQL di Supabase
-- ============================================================

-- Abilita estensione per UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABELLA: agenti
-- ============================================================
CREATE TABLE IF NOT EXISTS agenti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  codice_fiscale TEXT,
  iban TEXT,
  percentuale_trattenuta NUMERIC(5,2) NOT NULL DEFAULT 10,
  attivo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABELLA: fatture_entrata
-- ============================================================
CREATE TABLE IF NOT EXISTS fatture_entrata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  numero_fattura TEXT,
  cliente TEXT NOT NULL,
  imponibile NUMERIC(12,2) NOT NULL,
  iva_pct NUMERIC(5,2) NOT NULL DEFAULT 22,
  totale_lordo NUMERIC(12,2) GENERATED ALWAYS AS (imponibile * (1 + iva_pct/100)) STORED,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABELLA: fatture_entrata_quote_soci
-- ============================================================
CREATE TABLE IF NOT EXISTS fatture_entrata_quote_soci (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fattura_id UUID NOT NULL REFERENCES fatture_entrata(id) ON DELETE CASCADE,
  socio TEXT NOT NULL CHECK (socio IN ('riccardo', 'mattia', 'sergio')),
  importo NUMERIC(12,2) NOT NULL,
  UNIQUE(fattura_id, socio)
);

-- ============================================================
-- TABELLA: fatture_entrata_quote_agenti
-- ============================================================
CREATE TABLE IF NOT EXISTS fatture_entrata_quote_agenti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fattura_id UUID NOT NULL REFERENCES fatture_entrata(id) ON DELETE CASCADE,
  agente_id UUID REFERENCES agenti(id),
  importo_lordo NUMERIC(12,2) NOT NULL,
  percentuale_trattenuta NUMERIC(5,2) NOT NULL,
  importo_trattenuto NUMERIC(12,2) GENERATED ALWAYS AS (importo_lordo * percentuale_trattenuta / 100) STORED,
  importo_girato NUMERIC(12,2) GENERATED ALWAYS AS (importo_lordo * (1 - percentuale_trattenuta / 100)) STORED
);

-- ============================================================
-- TABELLA: fatture_entrata_trattenuto_soci
-- ============================================================
CREATE TABLE IF NOT EXISTS fatture_entrata_trattenuto_soci (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fattura_id UUID NOT NULL REFERENCES fatture_entrata(id) ON DELETE CASCADE,
  socio TEXT NOT NULL CHECK (socio IN ('riccardo', 'mattia', 'sergio')),
  importo NUMERIC(12,2) NOT NULL,
  UNIQUE(fattura_id, socio)
);

-- ============================================================
-- TABELLA: spese
-- ============================================================
CREATE TABLE IF NOT EXISTS spese (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_documento DATE NOT NULL,
  data_pagamento DATE,
  numero_documento TEXT,
  fornitore TEXT NOT NULL,
  descrizione TEXT,
  categoria TEXT NOT NULL,
  importo NUMERIC(12,2) NOT NULL,
  mese INT,
  anno INT,
  banca TEXT,
  link_drive TEXT,
  pagata BOOLEAN DEFAULT false,
  nota_di_credito BOOLEAN DEFAULT false,
  iva_pct NUMERIC(5,2) DEFAULT 22,
  iva_personalizzata BOOLEAN DEFAULT false,
  iva_importo NUMERIC(12,2) DEFAULT 0,
  ripartizione_tipo TEXT NOT NULL DEFAULT 'uguale' CHECK (ripartizione_tipo IN ('uguale', 'custom')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- TABELLA: spese_quote_soci
-- ============================================================
CREATE TABLE IF NOT EXISTS spese_quote_soci (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spesa_id UUID NOT NULL REFERENCES spese(id) ON DELETE CASCADE,
  socio TEXT NOT NULL CHECK (socio IN ('riccardo', 'mattia', 'sergio')),
  importo NUMERIC(12,2) NOT NULL,
  UNIQUE(spesa_id, socio)
);

-- ============================================================
-- TABELLA: spese_fatture
-- ============================================================
CREATE TABLE IF NOT EXISTS spese_fatture (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spesa_id UUID NOT NULL REFERENCES spese(id) ON DELETE CASCADE UNIQUE,
  numero_fattura TEXT,
  fornitore TEXT NOT NULL,
  data DATE NOT NULL,
  imponibile NUMERIC(12,2) NOT NULL,
  iva_pct NUMERIC(5,2) DEFAULT 0,
  iva_importo NUMERIC(12,2) DEFAULT 0,
  ritenuta_acconto_pct NUMERIC(5,2) DEFAULT 0,
  contributo_albo_pct NUMERIC(5,2) DEFAULT 0,
  contributo_albo_nome TEXT,
  totale_da_pagare NUMERIC(12,2) NOT NULL,
  note TEXT
);

-- ============================================================
-- TABELLA: fatture_soci
-- ============================================================
CREATE TABLE IF NOT EXISTS fatture_soci (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  numero_fattura TEXT,
  socio TEXT NOT NULL CHECK (socio IN ('riccardo', 'mattia', 'sergio')),
  imponibile NUMERIC(12,2) NOT NULL,
  iva_pct NUMERIC(5,2) DEFAULT 0,
  iva_importo NUMERIC(12,2) GENERATED ALWAYS AS (imponibile * iva_pct / 100) STORED,
  totale_fattura NUMERIC(12,2) GENERATED ALWAYS AS (imponibile * (1 + iva_pct / 100)) STORED,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS POLICIES — accesso completo per utenti autenticati
-- ============================================================

ALTER TABLE agenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE fatture_entrata ENABLE ROW LEVEL SECURITY;
ALTER TABLE fatture_entrata_quote_soci ENABLE ROW LEVEL SECURITY;
ALTER TABLE fatture_entrata_quote_agenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE fatture_entrata_trattenuto_soci ENABLE ROW LEVEL SECURITY;
ALTER TABLE spese ENABLE ROW LEVEL SECURITY;
ALTER TABLE spese_quote_soci ENABLE ROW LEVEL SECURITY;
ALTER TABLE spese_fatture ENABLE ROW LEVEL SECURITY;
ALTER TABLE fatture_soci ENABLE ROW LEVEL SECURITY;

-- Policy: utenti autenticati possono fare tutto
CREATE POLICY "auth_full_access" ON agenti FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON fatture_entrata FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON fatture_entrata_quote_soci FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON fatture_entrata_quote_agenti FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON fatture_entrata_trattenuto_soci FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON spese FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON spese_quote_soci FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON spese_fatture FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON fatture_soci FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- INDICI per performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_fatture_entrata_data ON fatture_entrata(data);
CREATE INDEX IF NOT EXISTS idx_fatture_entrata_quote_soci_fattura ON fatture_entrata_quote_soci(fattura_id);
CREATE INDEX IF NOT EXISTS idx_fatture_entrata_quote_soci_socio ON fatture_entrata_quote_soci(socio);
CREATE INDEX IF NOT EXISTS idx_fatture_entrata_quote_agenti_fattura ON fatture_entrata_quote_agenti(fattura_id);
CREATE INDEX IF NOT EXISTS idx_fatture_entrata_trattenuto_soci_fattura ON fatture_entrata_trattenuto_soci(fattura_id);
CREATE INDEX IF NOT EXISTS idx_spese_data ON spese(data_documento);
CREATE INDEX IF NOT EXISTS idx_spese_mese_anno ON spese(mese, anno);
CREATE INDEX IF NOT EXISTS idx_spese_quote_soci_spesa ON spese_quote_soci(spesa_id);
CREATE INDEX IF NOT EXISTS idx_spese_quote_soci_socio ON spese_quote_soci(socio);
CREATE INDEX IF NOT EXISTS idx_fatture_soci_socio ON fatture_soci(socio);
CREATE INDEX IF NOT EXISTS idx_fatture_soci_data ON fatture_soci(data);

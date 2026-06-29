-- Aggiunge il flag di pagamento alle fatture di entrata.
-- pagata=false ⇒ la quota soci è un credito ancora da incassare.
ALTER TABLE fatture_entrata
  ADD COLUMN IF NOT EXISTS pagata BOOLEAN DEFAULT false;

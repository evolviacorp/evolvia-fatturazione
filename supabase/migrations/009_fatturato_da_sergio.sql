-- Aggiunge il flag per fatture emesse da Mattia o Riccardo ma fatturate tramite Sergio
-- (regime ordinario con IVA 22%, ma il costo scala dal residuo di Mattia/Riccardo)
ALTER TABLE fatture_soci
  ADD COLUMN IF NOT EXISTS fatturato_da_sergio BOOLEAN DEFAULT false;

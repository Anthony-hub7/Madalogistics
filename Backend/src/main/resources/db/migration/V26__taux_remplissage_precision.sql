-- Élargir la colonne taux_remplissage de NUMERIC(5,2) à NUMERIC(7,2)
-- pour éviter les overflow lors de calculs de remplissage (ex: > 999.99%)
ALTER TABLE sac ALTER COLUMN taux_remplissage TYPE NUMERIC(7, 2);

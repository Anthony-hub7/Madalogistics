-- V15 : Prix dans grille_tarifaire reliée à catégorie (suppression colonnes prix de categorie_produit)

-- 1. Ajouter prix_par_km + categorie_id sur grille_tarifaire
ALTER TABLE grille_tarifaire ADD COLUMN prix_par_km    NUMERIC(10,2);
ALTER TABLE grille_tarifaire ADD COLUMN categorie_id   UUID REFERENCES categorie_produit(categorie_id) ON DELETE SET NULL;

CREATE INDEX idx_grille_categorie ON grille_tarifaire(categorie_id);

-- 2. Reprise de données : migrer les prix existants de categorie_produit vers grille_tarifaire
INSERT INTO grille_tarifaire (grille_id, tenant_id, libelle, prix_par_kg, prix_par_m3, prix_par_km, prix_minimum, actif, categorie_id, created_at)
SELECT uuid_generate_v4(),
       cp.tenant_id,
       cp.libelle || ' (migré V15)',
       cp.prix_par_kg,
       cp.prix_par_m3,
       cp.prix_par_km,
       cp.prix_minimum,
       true,
       cp.categorie_id,
       now()
FROM categorie_produit cp
WHERE cp.prix_par_kg IS NOT NULL
   OR cp.prix_par_m3 IS NOT NULL
   OR cp.prix_par_km IS NOT NULL
   OR cp.prix_minimum IS NOT NULL;

-- 3. Supprimer les colonnes prix de categorie_produit
ALTER TABLE categorie_produit DROP COLUMN IF EXISTS prix_par_kg;
ALTER TABLE categorie_produit DROP COLUMN IF EXISTS prix_par_m3;
ALTER TABLE categorie_produit DROP COLUMN IF EXISTS prix_par_km;
ALTER TABLE categorie_produit DROP COLUMN IF EXISTS prix_minimum;

-- V17 : Ajustement tarifaire MadaTrans — grilles réalistes PME Madagascar
-- Appliqué directement aux grilles existantes (pas de seed, pas de retouche V15)
--
-- Logique :
--   Standard (B) : base, prix médian marché Tana-Antsirabe
--   Fragile (A) : +50% (manutention, emballage, chauffeurs habilités)
--   Robuste (C) : +20% kg, -22% m³ (pondéreux, encombrant mais pas fragile)
--   Repli global : slightly above Standard (fallback de sécurité)
--
-- Routes Madagascar : ~1200-1500 Ar/km (coût carburant + usure véhicule)
-- Minimum : couvrant course urbaine Tana ~15-20k Ar

-- 1. Désactiver les anciennes grilles MadaTrans (conservation pour historique)
UPDATE grille_tarifaire
SET actif = false
WHERE tenant_id = '59018a1f-593b-4941-adbc-d6d2e415ea86'
  AND actif = true;

-- 2. Standard (B) — colis moyens, majorité des envois
INSERT INTO grille_tarifaire (grille_id, tenant_id, libelle, prix_par_kg, prix_par_m3, prix_par_km, prix_minimum, actif, categorie_id, created_at)
SELECT uuid_generate_v4(),
       '59018a1f-593b-4941-adbc-d6d2e415ea86',
       'Standard — Tana (V17)',
       900,
       9000,
       1000,
       12000,
       true,
       cp.categorie_id,
       now()
FROM categorie_produit cp
WHERE cp.tenant_id = '59018a1f-593b-4941-adbc-d6d2e415ea86'
  AND cp.classe_code = 'B';

-- 3. Fragile / Haute valeur (A) — manipulation renforcée, chauffeurs habilités
INSERT INTO grille_tarifaire (grille_id, tenant_id, libelle, prix_par_kg, prix_par_m3, prix_par_km, prix_minimum, actif, categorie_id, created_at)
SELECT uuid_generate_v4(),
       '59018a1f-593b-4941-adbc-d6d2e415ea86',
       'Fragile — Tana (V17)',
       1400,
       14000,
       1500,
       20000,
       true,
       cp.categorie_id,
       now()
FROM categorie_produit cp
WHERE cp.tenant_id = '59018a1f-593b-4941-adbc-d6d2e415ea86'
  AND cp.classe_code = 'A';

-- 4. Robuste / Lourd (C) — sacs de riz, briques, ferraille
INSERT INTO grille_tarifaire (grille_id, tenant_id, libelle, prix_par_kg, prix_par_m3, prix_par_km, prix_minimum, actif, categorie_id, created_at)
SELECT uuid_generate_v4(),
       '59018a1f-593b-4941-adbc-d6d2e415ea86',
       'Robuste — Tana (V17)',
       1100,
       7000,
       1300,
       18000,
       true,
       cp.categorie_id,
       now()
FROM categorie_produit cp
WHERE cp.tenant_id = '59018a1f-593b-4941-adbc-d6d2e415ea86'
  AND cp.classe_code = 'C';

-- 5. Repli global (categorie NULL) — fallback de sécurité
INSERT INTO grille_tarifaire (grille_id, tenant_id, libelle, prix_par_kg, prix_par_m3, prix_par_km, prix_minimum, actif, categorie_id, created_at)
VALUES (
    uuid_generate_v4(),
    '59018a1f-593b-4941-adbc-d6d2e415ea86',
    'Repli global — Tana (V17)',
    1000,
    10000,
    1200,
    15000,
    true,
    NULL,
    now()
);

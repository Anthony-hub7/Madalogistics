-- V23 : Seed données démo groupage comparatif (FFD vs Knapsack)
-- Tenant fictif MadTrans Démo, axe RN7, 3 hubs, 3 véhicules, catégories A/B/C
-- Idempotent : INSERT ... ON CONFLICT DO NOTHING

-- ══════════════════════════════════════════════════════════════
-- 1. TENANT
-- ══════════════════════════════════════════════════════════════
INSERT INTO pme_cliente (tenant_id, nom_entreprise, seuil_remplissage_min, marge_securite_pct,
                         seuil_ml_min_colis, clustering_dirty, referentiel_version, statut_dossier,
                         created_at, updated_at)
VALUES (
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
    'MadTrans Démo',
    80.00,  -- seuil_remplissage_min : exigeant
    15.00,
     30, false, 1, 'VALIDEE',
    now(), now()
) ON CONFLICT (tenant_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 2. HUBS — axe RN7 (lat/lon GPS réels)
-- ══════════════════════════════════════════════════════════════
INSERT INTO hub (hub_id, tenant_id, nom, latitude, longitude, zone_securisee_dispo, actif, created_at)
VALUES
    ('a0000001-0000-4000-8000-000000000001'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
     'Hub Antananarivo (RN7)', -18.914, 47.541, true, true, now()),
    ('a0000001-0000-4000-8000-000000000002'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
     'Hub Antsirabe', -19.866, 47.035, false, true, now()),
    ('a0000001-0000-4000-8000-000000000003'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
     'Hub Fianarantsoa', -21.453, 47.085, false, true, now())
ON CONFLICT (hub_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 3. VÉHICULES — 3 gabarits
-- ══════════════════════════════════════════════════════════════
INSERT INTO vehicule (vehicule_id, tenant_id, hub_id, immatriculation,
                     capacite_poids_kg, capacite_volume_m3, statut, created_at)
VALUES
    ('b0000001-0000-4000-8000-000000000001'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
     'a0000001-0000-4000-8000-000000000001'::uuid,
     'T-1234-AB', 800.00, 8.00, 'DISPONIBLE', now()),
    ('b0000001-0000-4000-8000-000000000002'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
     'a0000001-0000-4000-8000-000000000001'::uuid,
     'T-5678-CD', 3500.00, 15.00, 'DISPONIBLE', now()),
    ('b0000001-0000-4000-8000-000000000003'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
     'a0000001-0000-4000-8000-000000000001'::uuid,
     'T-9012-EF', 10000.00, 30.00, 'DISPONIBLE', now())
ON CONFLICT (vehicule_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 4. CATÉGORIES A/B/C (seed identique à AgenceRegistrationService)
-- ══════════════════════════════════════════════════════════════
INSERT INTO categorie_produit (categorie_id, tenant_id, libelle, classe_valeur, classe_code,
                               justification, seuils_ml, habilite_requis, ml_activable, actif, version)
VALUES
    ('c1000001-0000-4000-8000-000000000001'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
     'Fragile / Haute valeur', 'A', 'A',
     'Colis contenant des marchandises fragiles ou de grande valeur (bijoux, electronique, art). Obligation de manipulation precautionneuse, emballage renforce, pas de superposition. Affectation reservee aux chauffeurs habilites (habilite_valeur=true).',
     '{"poids_min":null,"poids_max":null,"volume_min":null,"volume_max":null,"fragilite_min":7,"fragilite_max":10,"valeur_min":200000,"valeur_max":null,"delai_max_h":null}',
     true, true, true, 1),
    ('c1000001-0000-4000-8000-000000000002'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
     'Standard', 'B', 'B',
     'Colis de poids et volume moyens, pas de contrainte de manipulation particuliere. Correspond a la majorite des envois (vetiments, petit commerce, documents). Groupage standard avec n''importe quel type.',
     '{"poids_min":null,"poids_max":null,"volume_min":null,"volume_max":null,"fragilite_min":null,"fragilite_max":null,"valeur_min":null,"valeur_max":null,"delai_max_h":null}',
     false, true, true, 1),
    ('c1000001-0000-4000-8000-000000000003'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
     'Robuste / Lourd', 'C', 'C',
     'Colis lourds ou encombrants, resistant a la manipulation (sacs de riz, briques, ferraille, engrais). Aucune contrainte de fragilite, mais necessite un vehicule a forte capacite ponderale.',
     '{"poids_min":40,"poids_max":null,"volume_min":null,"volume_max":null,"fragilite_min":null,"fragilite_max":null,"valeur_min":null,"valeur_max":null,"delai_max_h":null}',
     false, true, true, 1)
ON CONFLICT (categorie_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 5. CLIENT FINAL (1 client de démo pour les demandes)
-- ══════════════════════════════════════════════════════════════
INSERT INTO client_final (client_final_id, tenant_id, nom, created_at)
VALUES (
    'cf000001-0000-4000-8000-000000000001'::uuid,
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
    'Client Démo M1',
    now()
) ON CONFLICT (client_final_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 6. GRILLE TARIFAIRE STANDARD
-- ══════════════════════════════════════════════════════════════
INSERT INTO grille_tarifaire (grille_id, tenant_id, libelle, prix_par_kg, prix_par_m3, prix_minimum, actif, created_at)
VALUES (
    'd0000001-0000-4000-8000-000000000001'::uuid,
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
    'Standard', 2500.00, 50000.00, 15000.00, true, now()
) ON CONFLICT (grille_id) DO NOTHING;

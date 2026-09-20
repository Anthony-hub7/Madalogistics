-- V24 : Seed données démo affectation (Phase 5)
-- Chauffeurs (permis variés, 1 expiré, 1 non habilité), véhicules avec type/PTAC, matrice compatibilité
-- Idempotent : INSERT ... ON CONFLICT DO NOTHING

-- ══════════════════════════════════════════════════════════════
-- 1. UTILISATEURS CHAUFFEURS (5 chauffeurs rattachés)
-- ══════════════════════════════════════════════════════════════
INSERT INTO utilisateur (utilisateur_id, tenant_id, nom, email, mot_de_passe_hash, role,
                         habilite_valeur, cin, created_at)
VALUES
    -- Chauffeur 1 : B, habilité, disponible
    ('e0000001-0000-4000-8000-000000000001'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
     'Rakoto Jean', 'rakoto.jean@madtrans.mg', '$2a$10$dummyhash', 'CHAUFFEUR',
     true, '101112131415', now()),
    -- Chauffeur 2 : B+C, habilité, disponible
    ('e0000001-0000-4000-8000-000000000002'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
     'Rasoa Marie', 'rasoa.marie@madtrans.mg', '$2a$10$dummyhash', 'CHAUFFEUR',
     true, '201213141516', now()),
    -- Chauffeur 3 : B+C+D, NON habilité, disponible
    ('e0000001-0000-4000-8000-000000000003'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
     'Andry Rabe', 'andry.rabe@madtrans.mg', '$2a$10$dummyhash', 'CHAUFFEUR',
     false, '301314151617', now()),
    -- Chauffeur 4 : B, habilité, permis EXPIRÉ
    ('e0000001-0000-4000-8000-000000000004'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
     'Hery Rakotona', 'hery.r@madtrans.mg', '$2a$10$dummyhash', 'CHAUFFEUR',
     true, '401415161718', now()),
    -- Chauffeur 5 : B+C+E, habilité, disponible
    ('e0000001-0000-4000-8000-000000000005'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
     'Fara Andrianarivelo', 'fara.a@madtrans.mg', '$2a$10$dummyhash', 'CHAUFFEUR',
     true, '501516171819', now())
ON CONFLICT (utilisateur_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 2. CHAUFFEURS (détail métier : permis, type, dispo)
-- ══════════════════════════════════════════════════════════════
INSERT INTO chauffeur (chauffeur_id, tenant_id, utilisateur_id, telephone, disponible,
                       permis_numero, permis_categorie, permis_categories, permis_expiration,
                       experience_annees, type_chauffeur, statut_dossier, created_at)
VALUES
    -- Ch1 : B, expires 2028, rattaché
    ('f0000001-0000-4000-8000-000000000001'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
     'e0000001-0000-4000-8000-000000000001'::uuid,
     '+261 34 00 001', true,
     'PERM-001', 'B', 'B', '2028-12-31',
     5, 'RATTACHE', 'VALIDEE', now()),
    -- Ch2 : B+C, expires 2027, rattaché
    ('f0000001-0000-4000-8000-000000000002'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
     'e0000001-0000-4000-8000-000000000002'::uuid,
     '+261 34 00 002', true,
     'PERM-002', 'C', 'B,C', '2027-06-30',
     8, 'RATTACHE', 'VALIDEE', now()),
    -- Ch3 : B+C+D, expires 2026, NON habilite, rattaché
    ('f0000001-0000-4000-8000-000000000003'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
     'e0000001-0000-4000-8000-000000000003'::uuid,
     '+261 34 00 003', true,
     'PERM-003', 'D', 'B,C,D', '2026-03-15',
     12, 'RATTACHE', 'VALIDEE', now()),
    -- Ch4 : B, EXPIRE (2024), rattaché
    ('f0000001-0000-4000-8000-000000000004'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
     'e0000001-0000-4000-8000-000000000004'::uuid,
     '+261 34 00 004', true,
     'PERM-004', 'B', 'B', '2024-01-01',
     3, 'RATTACHE', 'VALIDEE', now()),
    -- Ch5 : B+C+E, expires 2029, rattaché
    ('f0000001-0000-4000-8000-000000000005'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
     'e0000001-0000-4000-8000-000000000005'::uuid,
     '+261 34 00 005', true,
     'PERM-005', 'E', 'B,C,E', '2029-09-30',
     15, 'RATTACHE', 'VALIDEE', now())
ON CONFLICT (chauffeur_id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 3. VÉHICULES — type et PTAC mis à jour
-- ══════════════════════════════════════════════════════════════
UPDATE vehicule SET type_vehicule = 'PICKUP', ptac_tonnes = 2.5
WHERE vehicule_id = 'b0000001-0000-4000-8000-000000000001'::uuid;

UPDATE vehicule SET type_vehicule = 'CAMION', ptac_tonnes = 5.0
WHERE vehicule_id = 'b0000001-0000-4000-8000-000000000002'::uuid;

UPDATE vehicule SET type_vehicule = 'CAMION', ptac_tonnes = 12.0
WHERE vehicule_id = 'b0000001-0000-4000-8000-000000000003'::uuid;

-- ══════════════════════════════════════════════════════════════
-- 4. MATRICE COMPATIBILITÉ CHAUFFEUR × VÉHICULE
-- ══════════════════════════════════════════════════════════════
-- Ch1 (B, pickup) : compatible avec pickup seulement
INSERT INTO compatibilite_chauffeur_vehicule (chauffeur_id, vehicule_id, tenant_id, compatible)
VALUES
    ('f0000001-0000-4000-8000-000000000001'::uuid,
     'b0000001-0000-4000-8000-000000000001'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid, true)
ON CONFLICT (chauffeur_id, vehicule_id) DO NOTHING;

-- Ch2 (B+C) : compatible avec pickup et camion 5t
INSERT INTO compatibilite_chauffeur_vehicule (chauffeur_id, vehicule_id, tenant_id, compatible)
VALUES
    ('f0000001-0000-4000-8000-000000000002'::uuid,
     'b0000001-0000-4000-8000-000000000001'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid, true),
    ('f0000001-0000-4000-8000-000000000002'::uuid,
     'b0000001-0000-4000-8000-000000000002'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid, true)
ON CONFLICT (chauffeur_id, vehicule_id) DO NOTHING;

-- Ch3 (B+C+D) : compatible avec les 3 véhicules
INSERT INTO compatibilite_chauffeur_vehicule (chauffeur_id, vehicule_id, tenant_id, compatible)
VALUES
    ('f0000001-0000-4000-8000-000000000003'::uuid,
     'b0000001-0000-4000-8000-000000000001'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid, true),
    ('f0000001-0000-4000-8000-000000000003'::uuid,
     'b0000001-0000-4000-8000-000000000002'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid, true),
    ('f0000001-0000-4000-8000-000000000003'::uuid,
     'b0000001-0000-4000-8000-000000000003'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid, true)
ON CONFLICT (chauffeur_id, vehicule_id) DO NOTHING;

-- Ch4 (B, permis expiré) : compatible avec pickup mais sera exclu par PermisService
INSERT INTO compatibilite_chauffeur_vehicule (chauffeur_id, vehicule_id, tenant_id, compatible)
VALUES
    ('f0000001-0000-4000-8000-000000000004'::uuid,
     'b0000001-0000-4000-8000-000000000001'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid, true)
ON CONFLICT (chauffeur_id, vehicule_id) DO NOTHING;

-- Ch5 (B+C+E) : compatible avec les 3 véhicules
INSERT INTO compatibilite_chauffeur_vehicule (chauffeur_id, vehicule_id, tenant_id, compatible)
VALUES
    ('f0000001-0000-4000-8000-000000000005'::uuid,
     'b0000001-0000-4000-8000-000000000001'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid, true),
    ('f0000001-0000-4000-8000-000000000005'::uuid,
     'b0000001-0000-4000-8000-000000000002'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid, true),
    ('f0000001-0000-4000-8000-000000000005'::uuid,
     'b0000001-0000-4000-8000-000000000003'::uuid,
     'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid, true)
ON CONFLICT (chauffeur_id, vehicule_id) DO NOTHING;

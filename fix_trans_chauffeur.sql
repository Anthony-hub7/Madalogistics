-- ============================================================
-- REPARATION DONNEES : trans@gmail.com / chauffeurtrans@gmail.com
-- A executer dans la base PostgreSQL de MadaLogistix
-- ============================================================

-- ETAPE 1 : DIAGNOSTIC — verifier l'etat actuel
SELECT '--- UTILISATEURS ---' AS section;
SELECT u.utilisateur_id, u.email, u.role, u.tenant_id, u.nom,
       LEFT(u.mot_de_passe_hash, 7) AS hash_prefix
FROM utilisateur u
WHERE u.email IN ('trans@gmail.com', 'chauffeurtrans@gmail.com');

SELECT '--- CHAUFFEURS ---' AS section;
SELECT c.chauffeur_id, c.utilisateur_id, c.tenant_id AS c_tenant,
       c.agence_cible_id, c.type_chauffeur, c.statut_dossier, c.motif_refus
FROM chauffeur c
WHERE c.utilisateur_id IN (
  SELECT u.utilisateur_id FROM utilisateur u
  WHERE u.email IN ('trans@gmail.com', 'chauffeurtrans@gmail.com')
);

SELECT '--- TENANT AGENCE (trans) ---' AS section;
SELECT p.tenant_id, p.nom_entreprise, p.statut_dossier
FROM pme_cliente p
WHERE p.tenant_id IN (
  SELECT u.tenant_id FROM utilisateur u WHERE u.email = 'trans@gmail.com'
);

-- ETAPE 2 : REPARATION — aligner les tenant_id et statuts
-- Adapte les UUID ci-dessous selon le resultat de l'etape 1

-- 2a. S'assurer que trans@gmail.com a un tenant et est DIRECTION
-- (deja fait par finaliserCompte, mais verifie)
UPDATE utilisateur
SET role = 'DIRECTION'
WHERE email = 'trans@gmail.com' AND role != 'DIRECTION';

-- 2b. Recuperer le tenant_id de trans (agence)
DO $$
DECLARE
  v_trans_tenant UUID;
  v_chauffeur_user_id UUID;
BEGIN
  -- Tenant de l'agence trans
  SELECT tenant_id INTO v_trans_tenant
  FROM utilisateur WHERE email = 'trans@gmail.com';

  -- Utilisateur chauffeurtrans
  SELECT utilisateur_id INTO v_chauffeur_user_id
  FROM utilisateur WHERE email = 'chauffeurtrans@gmail.com';

  IF v_trans_tenant IS NULL THEN
    RAISE EXCEPTION 'trans@gmail.com n''a pas de tenant_id — creez d''abord l''agence';
  END IF;

  IF v_chauffeur_user_id IS NULL THEN
    RAISE EXCEPTION 'chauffeurtrans@gmail.com n''existe pas dans utilisateur';
  END IF;

  -- 2c. Aligner utilisateur.tenant_id du chauffeur sur le tenant de l'agence
  UPDATE utilisateur
  SET tenant_id = v_trans_tenant,
      role = 'CHAUFFEUR'
  WHERE utilisateur_id = v_chauffeur_user_id
    AND (tenant_id IS DISTINCT FROM v_trans_tenant OR role != 'CHAUFFEUR');

  -- 2d. Creer ou mettre a jour la ligne chauffeur
  INSERT INTO chauffeur (chauffeur_id, tenant_id, utilisateur_id, type_chauffeur, statut_dossier, disponible, created_at)
  VALUES (
    uuid_generate_v4(),
    v_trans_tenant,
    v_chauffeur_user_id,
    'RATTACHE',
    'EN_ATTENTE',
    true,
    NOW()
  )
  ON CONFLICT (utilisateur_id) DO UPDATE
  SET tenant_id = v_trans_tenant,
      agence_cible_id = v_trans_tenant,
      type_chauffeur = 'RATTACHE',
      statut_dossier = 'EN_ATTENTE';

  -- 2e. S'assurer que agence_cible_id pointe vers l'agence trans
  UPDATE chauffeur
  SET agence_cible_id = v_trans_tenant
  WHERE utilisateur_id = v_chauffeur_user_id
    AND (agence_cible_id IS DISTINCT FROM v_trans_tenant);

  RAISE NOTICE 'Reparation effectuee : tenant=%, chauffeur=%', v_trans_tenant, v_chauffeur_user_id;
END $$;

-- ETAPE 3 : VERIFICATION FINALE
SELECT '--- APRES REPARATION ---' AS section;
SELECT u.email, u.role, u.tenant_id AS u_tenant,
       c.tenant_id AS c_tenant, c.agence_cible_id, c.type_chauffeur, c.statut_dossier,
       LEFT(u.mot_de_passe_hash, 7) AS hash_prefix
FROM utilisateur u
LEFT JOIN chauffeur c ON c.utilisateur_id = u.utilisateur_id
WHERE u.email IN ('trans@gmail.com', 'chauffeurtrans@gmail.com');

-- ETAPE 4 : verifier que le hash est bien BCrypt ($2b$10$)
-- Si ce n'est pas le cas, il faut regenere le mot de passe via l'API :
--   POST /api/auth/chauffeurs/dossier  (pour chauffeurtrans)
--   ou UPDATE direct avec un hash BCrypt genere en Java/Python
SELECT '--- VERIFICATION HASH ---' AS section;
SELECT email,
       CASE WHEN mot_de_passe_hash LIKE '$2b$10$%' THEN 'BCrypt OK'
            ELSE 'HASH NON-BCrypt — a corriger via API'
       END AS hash_status
FROM utilisateur
WHERE email IN ('trans@gmail.com', 'chauffeurtrans@gmail.com');

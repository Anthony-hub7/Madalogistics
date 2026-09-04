-- V2__enable_rls.sql
-- Active Row-Level Security (RLS) sur les tables métier.
-- Politique combinée : admin_saas bypass RLS, sinon filtrage par tenant_id.

-- 1. Fonction PostgreSQL pour récupérer le tenant courant depuis SET LOCAL
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
$$;

-- 2. Enable RLS sur chaque table métier (16 tables)
--    pme_cliente et utilisateur exclus (admin SAAS + unicité email globale)
ALTER TABLE hub ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_final ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorie_produit ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicule ENABLE ROW LEVEL SECURITY;
ALTER TABLE chauffeur ENABLE ROW LEVEL SECURITY;
ALTER TABLE compatibilite_chauffeur_vehicule ENABLE ROW LEVEL SECURITY;
ALTER TABLE grille_tarifaire ENABLE ROW LEVEL SECURITY;
ALTER TABLE demande_transport ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimisation_run ENABLE ROW LEVEL SECURITY;
ALTER TABLE sac ENABLE ROW LEVEL SECURITY;
ALTER TABLE colis ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident ENABLE ROW LEVEL SECURITY;
ALTER TABLE facture ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournee ENABLE ROW LEVEL SECURITY;
ALTER TABLE etape_livraison ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 3. Policy combinée pour chaque table :
--    - admin_saas : bypass total (voit toutes les données)
--    - autres rôles : filtrage par tenant_id via current_tenant_id()

-- hub
CREATE POLICY tenant_isolation_hub ON hub
  FOR ALL
  USING (
    current_setting('app.current_role', true) = 'admin_saas'
    OR tenant_id = current_tenant_id()
  );

-- client_final
CREATE POLICY tenant_isolation_client_final ON client_final
  FOR ALL
  USING (
    current_setting('app.current_role', true) = 'admin_saas'
    OR tenant_id = current_tenant_id()
  );

-- categorie_produit
CREATE POLICY tenant_isolation_categorie_produit ON categorie_produit
  FOR ALL
  USING (
    current_setting('app.current_role', true) = 'admin_saas'
    OR tenant_id = current_tenant_id()
  );

-- vehicule
CREATE POLICY tenant_isolation_vehicule ON vehicule
  FOR ALL
  USING (
    current_setting('app.current_role', true) = 'admin_saas'
    OR tenant_id = current_tenant_id()
  );

-- chauffeur
CREATE POLICY tenant_isolation_chauffeur ON chauffeur
  FOR ALL
  USING (
    current_setting('app.current_role', true) = 'admin_saas'
    OR tenant_id = current_tenant_id()
  );

-- compatibilite_chauffeur_vehicule
CREATE POLICY tenant_isolation_compatibilite ON compatibilite_chauffeur_vehicule
  FOR ALL
  USING (
    current_setting('app.current_role', true) = 'admin_saas'
    OR tenant_id = current_tenant_id()
  );

-- grille_tarifaire
CREATE POLICY tenant_isolation_grille_tarifaire ON grille_tarifaire
  FOR ALL
  USING (
    current_setting('app.current_role', true) = 'admin_saas'
    OR tenant_id = current_tenant_id()
  );

-- demande_transport
CREATE POLICY tenant_isolation_demande_transport ON demande_transport
  FOR ALL
  USING (
    current_setting('app.current_role', true) = 'admin_saas'
    OR tenant_id = current_tenant_id()
  );

-- optimisation_run
CREATE POLICY tenant_isolation_optimisation_run ON optimisation_run
  FOR ALL
  USING (
    current_setting('app.current_role', true) = 'admin_saas'
    OR tenant_id = current_tenant_id()
  );

-- sac
CREATE POLICY tenant_isolation_sac ON sac
  FOR ALL
  USING (
    current_setting('app.current_role', true) = 'admin_saas'
    OR tenant_id = current_tenant_id()
  );

-- colis
CREATE POLICY tenant_isolation_colis ON colis
  FOR ALL
  USING (
    current_setting('app.current_role', true) = 'admin_saas'
    OR tenant_id = current_tenant_id()
  );

-- incident
CREATE POLICY tenant_isolation_incident ON incident
  FOR ALL
  USING (
    current_setting('app.current_role', true) = 'admin_saas'
    OR tenant_id = current_tenant_id()
  );

-- facture
CREATE POLICY tenant_isolation_facture ON facture
  FOR ALL
  USING (
    current_setting('app.current_role', true) = 'admin_saas'
    OR tenant_id = current_tenant_id()
  );

-- tournee
CREATE POLICY tenant_isolation_tournee ON tournee
  FOR ALL
  USING (
    current_setting('app.current_role', true) = 'admin_saas'
    OR tenant_id = current_tenant_id()
  );

-- etape_livraison
CREATE POLICY tenant_isolation_etape_livraison ON etape_livraison
  FOR ALL
  USING (
    current_setting('app.current_role', true) = 'admin_saas'
    OR tenant_id = current_tenant_id()
  );

-- audit_log
CREATE POLICY tenant_isolation_audit_log ON audit_log
  FOR ALL
  USING (
    current_setting('app.current_role', true) = 'admin_saas'
    OR tenant_id = current_tenant_id()
  );

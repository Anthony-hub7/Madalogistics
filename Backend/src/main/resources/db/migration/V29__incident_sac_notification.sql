-- V29 : gestion d'incident vehicule (version minimale).
-- 1. Annulation douce des sacs : nouveau statut 'ANNULE' (historise, colis liberes).
-- 2. Table notification : alertes gestionnaire/client (polling frontend, pas de push).

-- ── 1. Statut ANNULE sur sac (CHECK inline nomme sac_statut_check par Postgres) ──
ALTER TABLE sac DROP CONSTRAINT IF EXISTS sac_statut_check;
ALTER TABLE sac ADD CONSTRAINT sac_statut_check
    CHECK (statut IN ('CONSTITUE','AFFECTE','EN_TRANSIT','LIVRE','ANNULE'));

-- ── 2. Table notification ──
CREATE TABLE notification (
    notification_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id         UUID NOT NULL REFERENCES pme_cliente(tenant_id) ON DELETE CASCADE,
    destinataire_role VARCHAR(30) NOT NULL, -- GESTIONNAIRE, CLIENT_FINAL, CHAUFFEUR, DIRECTION
    type              VARCHAR(50) NOT NULL, -- INCIDENT_DECLARE, SAC_ANNULE
    titre             VARCHAR(255) NOT NULL,
    message           TEXT,
    sac_id            UUID REFERENCES sac(sac_id) ON DELETE SET NULL,
    lu                BOOLEAN NOT NULL DEFAULT false,
    created_at        TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_notification_tenant ON notification(tenant_id);
CREATE INDEX idx_notification_role_lu ON notification(tenant_id, destinataire_role, lu, created_at DESC);

-- ── 3. RLS (meme pattern que V2__enable_rls.sql) ──
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_notification ON notification
  FOR ALL
  USING (
    current_setting('app.current_role', true) = 'admin_saas'
    OR tenant_id = current_tenant_id()
  );

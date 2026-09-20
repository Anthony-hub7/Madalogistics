-- V7 : Unicite de l'immatriculation par tenant
-- 2 PME differentes peuvent avoir le meme numero, mais pas dans le meme tenant.

ALTER TABLE vehicule
    ADD CONSTRAINT uq_vehicule_tenant_immat UNIQUE (tenant_id, immatriculation);

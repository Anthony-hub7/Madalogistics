INSERT INTO utilisateur (tenant_id, nom, email, mot_de_passe_hash, role)
VALUES (NULL, 'Administrateur SaaS', 'admin@mada.mg', '$2b$10$t3UmTCR9/zlpgLwRudTHHulzPq8Lelew6lSUdUIAGsv2m0dfuCfJe', 'ADMIN_SAAS')
ON CONFLICT (email) DO NOTHING;

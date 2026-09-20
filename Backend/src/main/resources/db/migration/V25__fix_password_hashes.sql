UPDATE utilisateur
SET mot_de_passe_hash = '$2a$10$VHKKKwkQNLRI0aG5/9rdz.CqUa6MUPAMDk7lBGaJlKfOy9eYBp/mi'
WHERE email = 'admin@mada.mg';

-- Create gestionnaire user for the demo tenant
INSERT INTO utilisateur (utilisateur_id, tenant_id, nom, email, mot_de_passe_hash, role, habilite_valeur, created_at)
VALUES (
    'e0000001-0000-0000-0000-000000000001'::uuid,
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'::uuid,
    'Rakoto Jean',
    'gestionnaire@test.mg',
    '$2a$10$0VkEYEYbBR1ZoUjrLVWHu.OaKrZiwAYp2Fng.SMfucaMtFtCDmWYe',
    'GESTIONNAIRE', true, now()
) ON CONFLICT (email) DO NOTHING;

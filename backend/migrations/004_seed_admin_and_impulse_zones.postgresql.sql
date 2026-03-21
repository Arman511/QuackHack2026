-- PostgreSQL: Seed admin user
-- Password: admin (bcrypt hash)
INSERT INTO
    users (
        username,
        email,
        full_name,
        hashed_password,
        is_active,
        type
    )
VALUES (
        'admin',
        'admin@quackhack.local',
        'Admin User',
        '$argon2id$v=19$m=16,t=2,p=1$d3o1RjJJdWxvaFBqZzJqbQ$i42Wd3KTudY3rC3+d5166g',
        TRUE,
        'ADMIN'
    )
ON CONFLICT (username) DO NOTHING;

-- Create default impulse zones
INSERT INTO
    impulse_zones (name)
VALUES ('Fast Food'),
    ('Entertainment'),
    ('Shopping'),
    ('Dining Out'),
    ('Subscriptions')
ON CONFLICT (name) DO NOTHING;

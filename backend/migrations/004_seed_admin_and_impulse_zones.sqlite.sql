-- SQLite: Seed admin user
-- Password: admin (bcrypt hash)
INSERT OR IGNORE INTO
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
        1,
        'ADMIN'
    );

-- Create default impulse zones
INSERT OR IGNORE INTO
    impulse_zones (name)
VALUES ('Fast Food'),
    ('Entertainment'),
    ('Shopping'),
    ('Dining Out'),
    ('Subscriptions');

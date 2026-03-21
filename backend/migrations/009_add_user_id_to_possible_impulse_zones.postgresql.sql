ALTER TABLE IF EXISTS possible_impulse_zones
ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_possible_impulse_zones_user_id ON possible_impulse_zones (user_id);

ALTER TABLE IF EXISTS possible_impulse_zones
DROP CONSTRAINT IF EXISTS possible_impulse_zones_name_key;

ALTER TABLE IF EXISTS possible_impulse_zones
ADD CONSTRAINT uq_possible_impulse_zones_user_id_name UNIQUE (user_id, name);

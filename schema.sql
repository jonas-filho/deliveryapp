-- ═══════════════════════════════════════════════════
--  DeliveryApp — Schema do Banco D1
--  Execute este arquivo UMA VEZ para criar o banco
-- ═══════════════════════════════════════════════════

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  password    TEXT NOT NULL,
  role        TEXT NOT NULL CHECK(role IN ('admin','vendedor','entregador','apoio')),
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tabela de filiais
CREATE TABLE IF NOT EXISTS branches (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  street        TEXT NOT NULL,
  number        TEXT NOT NULL,
  complement    TEXT DEFAULT '',
  neighborhood  TEXT NOT NULL,
  city          TEXT NOT NULL,
  state         TEXT NOT NULL,
  zip           TEXT DEFAULT '',
  phone         TEXT DEFAULT '',
  color         TEXT DEFAULT '#2563EB',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Tabela de entregas
CREATE TABLE IF NOT EXISTS deliveries (
  id                TEXT PRIMARY KEY,
  order_num         INTEGER NOT NULL,
  created_at        TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'criado',
  status_history    TEXT NOT NULL DEFAULT '[]',
  customer_name     TEXT NOT NULL,
  customer_phone1   TEXT NOT NULL,
  customer_phone2   TEXT DEFAULT '',
  addr_street       TEXT NOT NULL,
  addr_number       TEXT NOT NULL,
  addr_complement   TEXT DEFAULT '',
  addr_neighborhood TEXT NOT NULL,
  addr_city         TEXT NOT NULL,
  addr_state        TEXT NOT NULL,
  addr_zip          TEXT DEFAULT '',
  notes             TEXT DEFAULT '',
  priority          TEXT DEFAULT 'Normal',
  payment_method    TEXT NOT NULL,
  change_for        TEXT DEFAULT '',
  store_order_num   TEXT DEFAULT '',
  volumes           INTEGER DEFAULT 1,
  branch_id         TEXT,
  seller_id         TEXT NOT NULL,
  seller_name       TEXT NOT NULL,
  deliverer_id      TEXT DEFAULT '',
  deliverer_name    TEXT DEFAULT '',
  FOREIGN KEY(branch_id) REFERENCES branches(id),
  FOREIGN KEY(seller_id) REFERENCES users(id)
);

-- ─── DADOS INICIAIS ─────────────────────────────────────────────

-- Usuário admin padrão (troque a senha depois!)
INSERT OR IGNORE INTO users(id, name, password, role) VALUES
  ('u1', 'Admin',        'admin123',  'admin'),
  ('u2', 'João Silva',   'joao123',   'vendedor'),
  ('u3', 'Ana Costa',    'ana123',    'vendedor'),
  ('u4', 'Carlos Moto',  'carlos123', 'entregador'),
  ('u5', 'Pedro Moto',   'pedro123',  'entregador'),
  ('u6', 'Marcos Apoio', 'marcos123', 'apoio');

-- Filiais de exemplo (edite com seus dados reais depois)
INSERT OR IGNORE INTO branches(id, name, street, number, neighborhood, city, state, color) VALUES
  ('b1', 'Filial Centro',     'Rua 7 de Setembro', '100', 'Centro',     'Caruaru', 'PE', '#2563EB'),
  ('b2', 'Filial Petrópolis', 'Av. Rio Branco',    '450', 'Petrópolis', 'Caruaru', 'PE', '#16A34A');

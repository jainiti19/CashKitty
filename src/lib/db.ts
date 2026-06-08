import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "kitty.db");

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    color      TEXT NOT NULL DEFAULT '#6B7280',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id            TEXT PRIMARY KEY,
    type          TEXT NOT NULL CHECK(type IN ('income', 'expense')),
    amount        REAL NOT NULL CHECK(amount > 0),
    description   TEXT,
    category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    helper_name   TEXT NOT NULL,
    invoice_image TEXT,
    ocr_raw       TEXT,
    date          TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
  CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);

  INSERT OR IGNORE INTO categories (name, color) VALUES
    ('Grocery',    '#22C55E'),
    ('Taxi',       '#F59E0B'),
    ('Household',  '#3B82F6'),
    ('Medical',    '#EF4444'),
    ('Utilities',  '#8B5CF6'),
    ('Other',      '#6B7280');
`);

export default db;

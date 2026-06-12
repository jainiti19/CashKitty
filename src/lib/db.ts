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

// Payment channels
db.exec(`
  CREATE TABLE IF NOT EXISTS payment_channels (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL UNIQUE,
    type          TEXT NOT NULL CHECK(type IN ('cash','wallet','card')),
    monthly_limit REAL DEFAULT NULL,
    color         TEXT NOT NULL DEFAULT '#6B7280',
    icon          TEXT NOT NULL DEFAULT '💵',
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
  INSERT OR IGNORE INTO payment_channels (name, type, color, icon) VALUES
    ('Cash', 'cash', '#5c6b3c', '💵'),
    ('Octopus', 'wallet', '#06B6D4', '🐙'),
    ('Credit Card', 'card', '#8B5CF6', '💳');
`);

// Migration: add channel_id column
const txnCols = db.prepare("PRAGMA table_info(transactions)").all() as { name: string }[];
if (!txnCols.some((c) => c.name === "channel_id")) {
  db.exec("ALTER TABLE transactions ADD COLUMN channel_id INTEGER REFERENCES payment_channels(id) DEFAULT NULL");
  // Default existing transactions to Cash channel
  const cashChannel = db.prepare("SELECT id FROM payment_channels WHERE name = 'Cash'").get() as { id: number } | undefined;
  if (cashChannel) {
    db.prepare("UPDATE transactions SET channel_id = ? WHERE channel_id IS NULL").run(cashChannel.id);
  }
}

// Migration: add fraud_flag column
const cols = db.prepare("PRAGMA table_info(transactions)").all() as { name: string }[];
if (!cols.some((c) => c.name === "fraud_flag")) {
  db.exec("ALTER TABLE transactions ADD COLUMN fraud_flag TEXT DEFAULT NULL");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS alerts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    type            TEXT NOT NULL CHECK(type IN ('category_deviation','upward_trend','invoice_mismatch')),
    severity        TEXT NOT NULL CHECK(severity IN ('low','medium','high')),
    message         TEXT NOT NULL,
    details         TEXT,
    transaction_ids TEXT,
    recommendation  TEXT,
    detected_at     TEXT NOT NULL DEFAULT (datetime('now')),
    resolved        INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
  CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);
`);

// Users & Auth
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    role       TEXT NOT NULL CHECK(role IN ('employer','helper','family')),
    password   TEXT NOT NULL,
    salary     REAL DEFAULT NULL,
    phone      TEXT DEFAULT NULL,
    active     INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migration: add phone column
const userCols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
if (!userCols.some((c) => c.name === "phone")) {
  db.exec("ALTER TABLE users ADD COLUMN phone TEXT DEFAULT NULL");
}

// Salary payments
db.exec(`
  CREATE TABLE IF NOT EXISTS salary_payments (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL REFERENCES users(id),
    month            TEXT NOT NULL,
    base_salary      REAL NOT NULL,
    loan_deduction   REAL NOT NULL DEFAULT 0,
    other_deduction  REAL NOT NULL DEFAULT 0,
    bonus            REAL NOT NULL DEFAULT 0,
    net_paid         REAL NOT NULL,
    status           TEXT NOT NULL CHECK(status IN ('pending','paid')) DEFAULT 'pending',
    paid_date        TEXT,
    notes            TEXT,
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Loans
db.exec(`
  CREATE TABLE IF NOT EXISTS loans (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id),
    amount        REAL NOT NULL,
    balance       REAL NOT NULL,
    emi           REAL NOT NULL,
    reason        TEXT,
    status        TEXT NOT NULL CHECK(status IN ('active','paid_off')) DEFAULT 'active',
    disbursed_at  TEXT NOT NULL DEFAULT (datetime('now')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Loan transactions (history of all balance changes)
db.exec(`
  CREATE TABLE IF NOT EXISTS loan_transactions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id    INTEGER NOT NULL REFERENCES loans(id),
    type       TEXT NOT NULL CHECK(type IN ('disbursement','emi','adhoc_repayment')),
    amount     REAL NOT NULL,
    balance_after REAL NOT NULL,
    note       TEXT,
    date       TEXT NOT NULL DEFAULT (date('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// App settings
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  INSERT OR IGNORE INTO settings (key, value) VALUES
    ('currency_symbol', 'HK$'),
    ('currency_code', 'HKD'),
    ('household_name', 'My Household');
`);

export default db;

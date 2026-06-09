import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

const db = new Database(join(process.cwd(), "data", "kitty.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Ensure categories exist
db.exec(`
  INSERT OR IGNORE INTO categories (name, color) VALUES
    ('Meals', '#D97706'),
    ('Accommodation', '#7C3AED'),
    ('Octopus', '#06B6D4'),
    ('Transport', '#F59E0B');
`);

// Load category IDs
const categories = db.prepare("SELECT id, name FROM categories").all();
const catMap = {};
for (const c of categories) catMap[c.name.toLowerCase()] = c.id;

// Map Goodbudget envelopes to CashKitty categories
function mapEnvelope(envelope) {
  const lower = envelope.toLowerCase().trim();
  if (lower === "groceries") return catMap["grocery"] || catMap["groceries"];
  if (lower === "taxi/bus etc." || lower === "taxi/bus etc") return catMap["transport"] || catMap["taxi"];
  if (lower === "octopus") return catMap["octopus"];
  if (lower === "other") return catMap["other"];
  if (lower === "meals") return catMap["meals"];
  return catMap["other"];
}

// Parse CSV
const csv = readFileSync(join(process.cwd(), "Sample Receipts", "history.csv"), "utf-8");
const lines = csv.split("\n").slice(1).filter(l => l.trim());

// Simple CSV parser that handles quoted fields with commas
function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += line[i];
    }
  }
  fields.push(current.trim());
  return fields;
}

// Parse date DD/MM/YYYY → YYYY-MM-DD
function parseDate(str) {
  const parts = str.split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

// Parse amount (handles "1,234.56" and negative)
function parseAmount(str) {
  const cleaned = str.replace(/,/g, "").replace(/"/g, "").trim();
  return parseFloat(cleaned);
}

const insertStmt = db.prepare(
  `INSERT INTO transactions (id, type, amount, description, category_id, helper_name, date)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);

let imported = 0;
let skipped = 0;
let incomeCount = 0;
let expenseCount = 0;

const insertMany = db.transaction(() => {
  for (const line of lines) {
    const fields = parseCSVLine(line);
    if (fields.length < 7) { skipped++; continue; }

    const [dateStr, envelope, , name, , , amountStr] = fields;
    const date = parseDate(dateStr);
    if (!date) { skipped++; continue; }

    const amount = parseAmount(amountStr);
    if (isNaN(amount) || amount === 0) { skipped++; continue; }

    const isIncome = amount > 0;
    const absAmount = Math.abs(amount);
    const categoryId = mapEnvelope(envelope);
    const description = name || envelope;

    insertStmt.run(
      randomUUID(),
      isIncome ? "income" : "expense",
      absAmount,
      description,
      isIncome ? null : categoryId,
      "Iti",
      date
    );

    if (isIncome) incomeCount++;
    else expenseCount++;
    imported++;
  }
});

insertMany();

console.log(`\nImport complete!`);
console.log(`  Total imported: ${imported}`);
console.log(`  Income entries: ${incomeCount}`);
console.log(`  Expense entries: ${expenseCount}`);
console.log(`  Skipped: ${skipped}`);

// Show summary
const balance = db.prepare(
  "SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END), 0) as balance FROM transactions"
).get();
console.log(`  Current balance: HK$${Math.round(balance.balance)}`);

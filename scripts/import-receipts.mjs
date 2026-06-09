import { GoogleGenerativeAI } from "@google/generative-ai";
import Database from "better-sqlite3";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname, basename } from "path";
import { randomUUID } from "crypto";
import { config } from "dotenv";

config({ path: ".env.local" });

const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) { console.error("Missing GEMINI_API_KEY in .env.local"); process.exit(1); }

const genAI = new GoogleGenerativeAI(GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const db = new Database(join(process.cwd(), "data", "kitty.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Category mapping
const CATEGORY_MAP = {
  meals: db.prepare("SELECT id FROM categories WHERE name = 'Meals'").get()?.id,
  taxi: db.prepare("SELECT id FROM categories WHERE name = 'Taxi'").get()?.id,
  accommodation: db.prepare("SELECT id FROM categories WHERE name = 'Accommodation'").get()?.id,
  other: db.prepare("SELECT id FROM categories WHERE name = 'Other'").get()?.id,
};

const HELPER_NAME = "Iti";
const RECEIPTS_DIR = "/tmp/cashkitty-receipts";

const IMAGE_EXTS = new Set([".jpeg", ".jpg", ".png", ".webp", ".gif"]);
const PDF_EXT = ".pdf";

function collectFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectFiles(full));
    } else {
      const ext = extname(entry).toLowerCase();
      if (IMAGE_EXTS.has(ext) || ext === PDF_EXT) {
        files.push(full);
      }
    }
  }
  return files;
}

function getMediaType(filePath) {
  const ext = extname(filePath).toLowerCase();
  const map = { ".jpeg": "image/jpeg", ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".pdf": "application/pdf" };
  return map[ext] || "image/jpeg";
}

function mapCategory(text) {
  if (!text) return CATEGORY_MAP.other;
  const lower = text.toLowerCase();

  const taxiWords = ["taxi", "cab", "uber", "grab", "ride", "transport", "gojek", "fare", "bus", "mrt", "train", "metro", "petrol", "fuel", "parking", "toll"];
  const mealWords = ["restaurant", "food", "meal", "lunch", "dinner", "breakfast", "coffee", "cafe", "drink", "bar", "eat", "kitchen", "bistro", "hawker", "noodle", "rice", "chicken", "pizza", "burger", "tea", "juice", "bakery", "snack"];
  const accomWords = ["hotel", "hostel", "airbnb", "accommodation", "stay", "room", "resort", "lodge", "check-in", "check-out", "booking", "night"];

  const taxiHits = taxiWords.filter(w => lower.includes(w)).length;
  const mealHits = mealWords.filter(w => lower.includes(w)).length;
  const accomHits = accomWords.filter(w => lower.includes(w)).length;

  const max = Math.max(taxiHits, mealHits, accomHits);
  if (max === 0) return CATEGORY_MAP.other;
  if (mealHits === max) return CATEGORY_MAP.meals;
  if (taxiHits === max) return CATEGORY_MAP.taxi;
  if (accomHits === max) return CATEGORY_MAP.accommodation;
  return CATEGORY_MAP.other;
}

async function processReceipt(filePath) {
  const buffer = readFileSync(filePath);
  const base64 = buffer.toString("base64");
  const mediaType = getMediaType(filePath);

  const response = await model.generateContent([
    { inlineData: { mimeType: mediaType, data: base64 } },
    { text: `Extract from this receipt/invoice. Return ONLY valid JSON, no markdown:
{"date":"YYYY-MM-DD or null","amount":<number or null>,"currency":"3-letter code or null","description":"brief what was purchased","confidence":"high|medium|low"}` },
  ]);

  const text = response.response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : {};
  }

  return {
    date: parsed.date || null,
    amount: typeof parsed.amount === "number" ? parsed.amount : null,
    currency: parsed.currency || null,
    description: parsed.description || null,
    confidence: parsed.confidence || "low",
    raw_text: text,
  };
}

const insertStmt = db.prepare(
  `INSERT INTO transactions (id, type, amount, description, category_id, helper_name, ocr_raw, date)
   VALUES (?, 'expense', ?, ?, ?, ?, ?, ?)`
);

async function main() {
  const files = collectFiles(RECEIPTS_DIR);
  console.log(`Found ${files.length} receipt files`);

  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = basename(file);

    // Rate limit: 15 requests/minute
    if (i > 0 && i % 14 === 0) {
      console.log(`  [rate limit] Waiting 60s... (${i}/${files.length})`);
      await new Promise(r => setTimeout(r, 62000));
    }

    try {
      process.stdout.write(`[${i + 1}/${files.length}] ${fileName.slice(0, 50)}... `);
      const result = await processReceipt(file);

      if (!result.amount || result.amount <= 0) {
        console.log(`SKIP (no amount)`);
        skipped++;
        continue;
      }

      const date = result.date || "2025-01-01";
      const categoryId = mapCategory(result.description);
      const id = randomUUID();

      insertStmt.run(
        id,
        result.amount,
        result.description || fileName,
        categoryId,
        HELPER_NAME,
        JSON.stringify(result),
        date
      );

      console.log(`OK → ${result.amount} ${result.currency || ""} | ${result.description?.slice(0, 40) || "-"} | ${date}`);
      processed++;
    } catch (err) {
      console.log(`ERROR: ${err.message?.slice(0, 80)}`);
      errors++;
      // If rate limited, wait and retry
      if (err.message?.includes("429") || err.message?.includes("quota")) {
        console.log("  [rate limited] Waiting 90s...");
        await new Promise(r => setTimeout(r, 90000));
        i--; // retry this file
      }
    }
  }

  console.log(`\nDone! Processed: ${processed}, Skipped: ${skipped}, Errors: ${errors}`);
}

main();

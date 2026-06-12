import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { sendWhatsApp, downloadMedia } from "@/lib/whatsapp";
import { extractInvoiceData } from "@/lib/ocr";
import { fmt } from "@/lib/config";

// Map WhatsApp numbers to user names (stored in DB)
function getUserByPhone(phone: string): { name: string; role: string } | null {
  // Strip whatsapp: prefix
  const num = phone.replace("whatsapp:", "");
  const user = db.prepare(
    "SELECT name, role FROM users WHERE phone = ? AND active = 1"
  ).get(num) as { name: string; role: string } | undefined;
  return user || null;
}

// Simple session state for multi-step flows
const sessions = new Map<string, { step: string; data: Record<string, unknown>; expires: number }>();

function getSession(phone: string) {
  const s = sessions.get(phone);
  if (s && s.expires > Date.now()) return s;
  sessions.delete(phone);
  return null;
}

function setSession(phone: string, step: string, data: Record<string, unknown> = {}) {
  sessions.set(phone, { step, data, expires: Date.now() + 10 * 60 * 1000 }); // 10 min expiry
}

function clearSession(phone: string) {
  sessions.delete(phone);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const from = formData.get("From") as string;
  const body = (formData.get("Body") as string || "").trim();
  const numMedia = parseInt(formData.get("NumMedia") as string || "0");
  const mediaUrl = formData.get("MediaUrl0") as string | null;
  const mediaType = formData.get("MediaContentType0") as string | null;

  // Identify user by phone
  let user = getUserByPhone(from);
  const userName = user?.name || from.replace("whatsapp:", "");

  const cmd = body.toLowerCase();

  try {
    // --- Photo received: OCR flow ---
    if (numMedia > 0 && mediaUrl) {
      const { base64, contentType } = await downloadMedia(mediaUrl);
      const ocrResult = await extractInvoiceData(
        base64,
        contentType as "image/jpeg" | "image/png" | "image/gif" | "image/webp"
      );

      // Store OCR data in session for confirmation
      setSession(from, "confirm_expense", {
        amount: ocrResult.amount,
        description: ocrResult.description,
        date: ocrResult.date || new Date().toISOString().split("T")[0],
        category: ocrResult.recommended_category,
        source_type: ocrResult.source_type,
        wallet_name: ocrResult.wallet_name,
      });

      const msg = [
        `📸 *Receipt Detected*`,
        `Amount: *${ocrResult.amount ? fmt(ocrResult.amount) : "Unknown"}*`,
        `Description: ${ocrResult.description || "N/A"}`,
        `Date: ${ocrResult.date || "Today"}`,
        `Category: ${ocrResult.recommended_category || "Other"}`,
        ocrResult.source_type === "wallet_statement" ? `Wallet: ${ocrResult.wallet_name || "Unknown"}` : "",
        ``,
        `Reply *yes* to save, *edit* to modify, or *cancel*.`,
      ].filter(Boolean).join("\n");

      await sendWhatsApp(from, msg);
      return twimlResponse();
    }

    // --- Check session for multi-step flows ---
    const session = getSession(from);

    if (session?.step === "confirm_expense") {
      if (cmd === "yes" || cmd === "y") {
        const d = session.data;
        const categoryRow = d.category ? db.prepare("SELECT id FROM categories WHERE name = ?").get(d.category) as { id: number } | undefined : null;
        const cashChannel = db.prepare("SELECT id FROM payment_channels WHERE name = 'Cash'").get() as { id: number } | undefined;

        db.prepare(
          `INSERT INTO transactions (id, type, amount, description, category_id, helper_name, date, channel_id)
           VALUES (?, 'expense', ?, ?, ?, ?, ?, ?)`
        ).run(
          uuidv4(), d.amount, d.description || null, categoryRow?.id || null,
          userName, d.date, cashChannel?.id || null
        );

        clearSession(from);
        await sendWhatsApp(from, `✅ Expense saved: ${fmt(d.amount as number)} — ${d.description || "Expense"}`);
        return twimlResponse();
      }

      if (cmd === "cancel" || cmd === "no") {
        clearSession(from);
        await sendWhatsApp(from, "❌ Cancelled.");
        return twimlResponse();
      }
    }

    // --- Text commands ---
    if (cmd === "hi" || cmd === "hello" || cmd === "menu" || cmd === "help") {
      const menu = [
        `🐱 *CashKitty*`,
        ``,
        `📸 Send a *photo* of a receipt to record an expense`,
        ``,
        `Or type a command:`,
        `• *balance* — Check kitty balance`,
        `• *today* — Today's transactions`,
        `• *history* — Last 5 transactions`,
        `• *salary* — Check your salary info`,
        `• *spend 200 grocery market* — Quick expense`,
        `• *add 5000* — Add money to kitty`,
        `• *help* — Show this menu`,
      ].join("\n");
      await sendWhatsApp(from, menu);
      return twimlResponse();
    }

    if (cmd === "balance" || cmd === "bal") {
      const result = db.prepare(
        "SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END), 0) as balance FROM transactions"
      ).get() as { balance: number };
      await sendWhatsApp(from, `💰 *Kitty Balance:* ${fmt(result.balance)}`);
      return twimlResponse();
    }

    if (cmd === "today") {
      const today = new Date().toISOString().split("T")[0];
      const txns = db.prepare(
        `SELECT t.*, c.name as category_name FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.date = ? ORDER BY t.created_at DESC LIMIT 10`
      ).all(today) as { type: string; amount: number; description: string; category_name: string }[];

      if (txns.length === 0) {
        await sendWhatsApp(from, "📅 No transactions today.");
      } else {
        const lines = txns.map((t) =>
          `${t.type === "income" ? "➕" : "➖"} ${fmt(t.amount)} — ${t.description || t.category_name || "N/A"}`
        );
        await sendWhatsApp(from, `📅 *Today's Transactions*\n\n${lines.join("\n")}`);
      }
      return twimlResponse();
    }

    if (cmd === "history" || cmd === "recent") {
      const txns = db.prepare(
        `SELECT t.*, c.name as category_name FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
         ORDER BY t.date DESC, t.created_at DESC LIMIT 5`
      ).all() as { date: string; type: string; amount: number; description: string; category_name: string }[];

      const lines = txns.map((t) =>
        `${t.date} ${t.type === "income" ? "➕" : "➖"} ${fmt(t.amount)} — ${t.description || t.category_name || "N/A"}`
      );
      await sendWhatsApp(from, `📋 *Recent Transactions*\n\n${lines.join("\n")}`);
      return twimlResponse();
    }

    if (cmd === "salary") {
      if (!user) {
        await sendWhatsApp(from, "⚠️ Your phone number is not linked to a user account. Ask your employer to add your phone number in Admin.");
        return twimlResponse();
      }
      const userRow = db.prepare("SELECT id, salary FROM users WHERE name = ?").get(user.name) as { id: number; salary: number | null } | undefined;
      if (!userRow?.salary) {
        await sendWhatsApp(from, "ℹ️ No salary set for your account.");
        return twimlResponse();
      }

      const loans = db.prepare("SELECT SUM(balance) as total FROM loans WHERE user_id = ? AND status = 'active'").get(userRow.id) as { total: number | null };
      const lastPayment = db.prepare("SELECT month, net_paid, status, paid_date FROM salary_payments WHERE user_id = ? ORDER BY month DESC LIMIT 1").get(userRow.id) as { month: string; net_paid: number; status: string; paid_date: string } | undefined;

      const msg = [
        `💵 *Salary Info*`,
        `Monthly: ${fmt(userRow.salary)}`,
        loans.total ? `Outstanding Loans: ${fmt(loans.total)}` : "No active loans",
        lastPayment ? `\nLast Payment: ${lastPayment.month} — ${fmt(lastPayment.net_paid)} (${lastPayment.status})` : "",
      ].filter(Boolean).join("\n");
      await sendWhatsApp(from, msg);
      return twimlResponse();
    }

    // Quick spend: "spend 200 grocery market"
    const spendMatch = body.match(/^spend\s+(\d+\.?\d*)\s*(.*)$/i);
    if (spendMatch) {
      const amount = parseFloat(spendMatch[1]);
      const desc = spendMatch[2].trim() || "Expense";
      const categoryName = db.prepare(
        "SELECT name FROM categories WHERE LOWER(name) LIKE ? LIMIT 1"
      ).get(`%${desc.split(" ")[0].toLowerCase()}%`) as { name: string } | undefined;
      const categoryRow = categoryName ? db.prepare("SELECT id FROM categories WHERE name = ?").get(categoryName.name) as { id: number } | undefined : null;
      const cashChannel = db.prepare("SELECT id FROM payment_channels WHERE name = 'Cash'").get() as { id: number } | undefined;

      db.prepare(
        `INSERT INTO transactions (id, type, amount, description, category_id, helper_name, date, channel_id)
         VALUES (?, 'expense', ?, ?, ?, ?, ?, ?)`
      ).run(uuidv4(), amount, desc, categoryRow?.id || null, userName, new Date().toISOString().split("T")[0], cashChannel?.id || null);

      await sendWhatsApp(from, `✅ Recorded: ${fmt(amount)} — ${desc}`);
      return twimlResponse();
    }

    // Quick add: "add 5000"
    const addMatch = body.match(/^add\s+(\d+\.?\d*)\s*(.*)$/i);
    if (addMatch) {
      const amount = parseFloat(addMatch[1]);
      const desc = addMatch[2].trim() || "Cash top-up via WhatsApp";
      const cashChannel = db.prepare("SELECT id FROM payment_channels WHERE name = 'Cash'").get() as { id: number } | undefined;

      db.prepare(
        `INSERT INTO transactions (id, type, amount, description, helper_name, date, channel_id)
         VALUES (?, 'income', ?, ?, ?, ?, ?)`
      ).run(uuidv4(), amount, desc, userName, new Date().toISOString().split("T")[0], cashChannel?.id || null);

      await sendWhatsApp(from, `✅ Added: ${fmt(amount)} to kitty`);
      return twimlResponse();
    }

    // Unknown command
    await sendWhatsApp(from, `🤔 I didn't understand that. Type *help* for available commands or send a receipt photo.`);

  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    await sendWhatsApp(from, "⚠️ Something went wrong. Please try again.").catch(() => {});
  }

  return twimlResponse();
}

// Return empty TwiML (we send messages via API, not TwiML)
function twimlResponse() {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}

import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { sendWhatsApp, downloadMedia } from "@/lib/whatsapp";
import { extractInvoiceData } from "@/lib/ocr";
import { fmt } from "@/lib/config";
import { parseIntent } from "@/lib/intent-parser";
import { recommendCategory } from "@/lib/category-recommender";
import { checkDuplicate } from "@/lib/duplicate-detector";

function getUserByPhone(phone: string): { name: string; role: string } | null {
  const num = phone.replace("whatsapp:", "");
  const user = db.prepare(
    "SELECT name, role FROM users WHERE phone = ? AND active = 1"
  ).get(num) as { name: string; role: string } | undefined;
  return user || null;
}

const sessions = new Map<string, { step: string; data: Record<string, unknown>; expires: number }>();

function getSession(phone: string) {
  const s = sessions.get(phone);
  if (s && s.expires > Date.now()) return s;
  sessions.delete(phone);
  return null;
}

function setSession(phone: string, step: string, data: Record<string, unknown> = {}) {
  sessions.set(phone, { step, data, expires: Date.now() + 10 * 60 * 1000 });
}

function clearSession(phone: string) {
  sessions.delete(phone);
}

function getCashChannelId(): number | null {
  const ch = db.prepare("SELECT id FROM payment_channels WHERE name = 'Cash'").get() as { id: number } | undefined;
  return ch?.id || null;
}

function getCategoryId(description: string): number | null {
  const catName = recommendCategory(description);
  if (!catName) return null;
  const row = db.prepare("SELECT id FROM categories WHERE name = ?").get(catName) as { id: number } | undefined;
  return row?.id || null;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const from = formData.get("From") as string;
  const body = (formData.get("Body") as string || "").trim();
  const numMedia = parseInt(formData.get("NumMedia") as string || "0");
  const mediaUrl = formData.get("MediaUrl0") as string | null;

  const user = getUserByPhone(from);
  const userName = user?.name || from.replace("whatsapp:", "");

  try {
    // --- Photo received: OCR flow ---
    if (numMedia > 0 && mediaUrl) {
      const { base64, contentType } = await downloadMedia(mediaUrl);
      const ocrResult = await extractInvoiceData(
        base64,
        contentType as "image/jpeg" | "image/png" | "image/gif" | "image/webp"
      );

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
        `Reply *yes* to save, or *cancel*.`,
      ].filter(Boolean).join("\n");

      await sendWhatsApp(from, msg);
      return twimlResponse();
    }

    // --- Session flows ---
    const session = getSession(from);
    const cmd = body.toLowerCase();

    if (session?.step === "confirm_expense") {
      if (["yes", "y", "ok", "save", "confirm", "sure", "yep", "yeah", "correct", "right"].includes(cmd)) {
        const d = session.data;

        // Check for duplicate before saving
        const dup = checkDuplicate("expense", d.amount as number, d.description as string, userName, d.date as string);
        if (dup.isDuplicate && !session.data.dupOverride) {
          session.data.dupOverride = true;
          await sendWhatsApp(from, `⚠️ ${dup.message}\n\nReply *yes* again to save anyway, or *cancel*.`);
          return twimlResponse();
        }

        const categoryId = d.category ? (db.prepare("SELECT id FROM categories WHERE name = ?").get(d.category) as { id: number } | undefined)?.id || null : null;

        db.prepare(
          `INSERT INTO transactions (id, type, amount, description, category_id, helper_name, date, channel_id)
           VALUES (?, 'expense', ?, ?, ?, ?, ?, ?)`
        ).run(uuidv4(), d.amount, d.description || null, categoryId, userName, d.date, getCashChannelId());

        clearSession(from);
        await sendWhatsApp(from, `✅ Saved: ${fmt(d.amount as number)} — ${d.description || "Expense"}`);
        return twimlResponse();
      }

      if (["no", "cancel", "nope", "skip", "discard", "delete", "wrong"].includes(cmd)) {
        clearSession(from);
        await sendWhatsApp(from, "❌ Cancelled.");
        return twimlResponse();
      }
    }

    // Confirm duplicate spend
    if (session?.step === "confirm_dup_spend") {
      if (["yes", "y", "ok", "save", "confirm", "sure"].includes(cmd)) {
        const d = session.data;
        const desc = (d.description as string) || "Expense";
        db.prepare(
          `INSERT INTO transactions (id, type, amount, description, category_id, helper_name, date, channel_id)
           VALUES (?, 'expense', ?, ?, ?, ?, ?, ?)`
        ).run(uuidv4(), d.amount, desc, getCategoryId(desc), userName, new Date().toISOString().split("T")[0], getCashChannelId());
        clearSession(from);
        await sendWhatsApp(from, `✅ Recorded: ${fmt(d.amount as number)} — ${desc}`);
        return twimlResponse();
      }
      if (["no", "cancel", "nope", "skip"].includes(cmd)) {
        clearSession(from);
        await sendWhatsApp(from, "👍 Skipped — no duplicate saved.");
        return twimlResponse();
      }
    }

    // Confirm duplicate add
    if (session?.step === "confirm_dup_add") {
      if (["yes", "y", "ok", "save", "confirm", "sure"].includes(cmd)) {
        const d = session.data;
        const desc = (d.description as string) || "Cash top-up";
        db.prepare(
          `INSERT INTO transactions (id, type, amount, description, helper_name, date, channel_id)
           VALUES (?, 'income', ?, ?, ?, ?, ?)`
        ).run(uuidv4(), d.amount, desc, userName, new Date().toISOString().split("T")[0], getCashChannelId());
        clearSession(from);
        await sendWhatsApp(from, `✅ Added: ${fmt(d.amount as number)} — ${desc}`);
        return twimlResponse();
      }
      if (["no", "cancel", "nope", "skip"].includes(cmd)) {
        clearSession(from);
        await sendWhatsApp(from, "👍 Skipped — no duplicate saved.");
        return twimlResponse();
      }
    }

    // Confirm delete
    if (session?.step === "confirm_delete") {
      if (["yes", "y", "ok", "confirm", "sure", "yep", "yeah", "delete"].includes(cmd)) {
        db.prepare("DELETE FROM transactions WHERE id = ?").run(session.data.id);
        clearSession(from);
        await sendWhatsApp(from, `🗑️ Deleted: ${fmt(session.data.amount as number)} — ${session.data.description || "N/A"}`);
        return twimlResponse();
      }
      if (["no", "cancel", "nope", "keep"].includes(cmd)) {
        clearSession(from);
        await sendWhatsApp(from, "👍 Kept as is.");
        return twimlResponse();
      }
    }

    // Awaiting edit (amount or description)
    if (session?.step === "awaiting_edit") {
      if (["cancel", "no", "nope", "skip"].includes(cmd)) {
        clearSession(from);
        await sendWhatsApp(from, "👍 No changes made.");
        return twimlResponse();
      }

      const newAmount = parseFloat(body.replace(/[^\d.]/g, ""));
      if (newAmount > 0) {
        db.prepare("UPDATE transactions SET amount = ?, updated_at = datetime('now') WHERE id = ?")
          .run(newAmount, session.data.id);
        clearSession(from);
        await sendWhatsApp(from, `✏️ Updated: ${fmt(session.data.amount as number)} → ${fmt(newAmount)}`);
        return twimlResponse();
      }

      // Treat as new description
      if (body.length > 1) {
        db.prepare("UPDATE transactions SET description = ?, updated_at = datetime('now') WHERE id = ?")
          .run(body, session.data.id);
        clearSession(from);
        await sendWhatsApp(from, `✏️ Description updated to: "${body}"`);
        return twimlResponse();
      }
    }

    // Waiting for amount (when intent was recognized but no amount)
    if (session?.step === "awaiting_amount") {
      const amount = parseFloat(body.replace(/[^\d.]/g, ""));
      if (amount > 0) {
        const action = session.data.action as string;
        const desc = (session.data.description as string) || "";

        if (action === "spend") {
          db.prepare(
            `INSERT INTO transactions (id, type, amount, description, category_id, helper_name, date, channel_id)
             VALUES (?, 'expense', ?, ?, ?, ?, ?, ?)`
          ).run(uuidv4(), amount, desc || null, getCategoryId(desc), userName, new Date().toISOString().split("T")[0], getCashChannelId());

          clearSession(from);
          await sendWhatsApp(from, `✅ Recorded: ${fmt(amount)} — ${desc || "Expense"}`);
        } else {
          db.prepare(
            `INSERT INTO transactions (id, type, amount, description, helper_name, date, channel_id)
             VALUES (?, 'income', ?, ?, ?, ?, ?)`
          ).run(uuidv4(), amount, desc || "Cash top-up", userName, new Date().toISOString().split("T")[0], getCashChannelId());

          clearSession(from);
          await sendWhatsApp(from, `✅ Added: ${fmt(amount)} to kitty`);
        }
        return twimlResponse();
      }
    }

    // --- Parse intent ---
    const intent = parseIntent(body);

    switch (intent.action) {
      case "help": {
        const menu = [
          `🐱 *CashKitty*`,
          ``,
          `Just chat naturally! For example:`,
          `• "Spent 200 at the market"`,
          `• "Gave Rita 5000 cash"`,
          `• "How much is left?"`,
          `• "What did we spend today?"`,
          `• "Show recent transactions"`,
          `• "Check my salary"`,
          `• "Check my loan"`,
          `• "Delete last" — remove last transaction`,
          `• "That was wrong" — undo last entry`,
          `• "Change amount to 300" — edit last entry`,
          ``,
          `Or send a 📸 *receipt photo* to auto-record.`,
        ].join("\n");
        await sendWhatsApp(from, menu);
        break;
      }

      case "balance": {
        const result = db.prepare(
          "SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE -amount END), 0) as balance FROM transactions"
        ).get() as { balance: number };
        await sendWhatsApp(from, `💰 *Kitty Balance:* ${fmt(result.balance)}`);
        break;
      }

      case "today": {
        const today = new Date().toISOString().split("T")[0];
        const txns = db.prepare(
          `SELECT t.*, c.name as category_name FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
           WHERE t.date = ? ORDER BY t.created_at DESC LIMIT 10`
        ).all(today) as { type: string; amount: number; description: string; category_name: string }[];

        if (txns.length === 0) {
          await sendWhatsApp(from, "📅 No transactions today yet.");
        } else {
          const total = txns.reduce((s, t) => s + (t.type === "expense" ? t.amount : 0), 0);
          const lines = txns.map((t) =>
            `${t.type === "income" ? "➕" : "➖"} ${fmt(t.amount)} — ${t.description || t.category_name || "N/A"}`
          );
          lines.push(`\n*Total spent today: ${fmt(total)}*`);
          await sendWhatsApp(from, `📅 *Today*\n\n${lines.join("\n")}`);
        }
        break;
      }

      case "history": {
        const txns = db.prepare(
          `SELECT t.*, c.name as category_name FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
           ORDER BY t.date DESC, t.created_at DESC LIMIT 5`
        ).all() as { date: string; type: string; amount: number; description: string; category_name: string }[];

        const lines = txns.map((t) =>
          `${t.date} ${t.type === "income" ? "➕" : "➖"} ${fmt(t.amount)} — ${t.description || t.category_name || "N/A"}`
        );
        await sendWhatsApp(from, `📋 *Recent*\n\n${lines.join("\n")}`);
        break;
      }

      case "salary": {
        if (!user) {
          await sendWhatsApp(from, "⚠️ Your phone isn't linked to an account. Ask your employer to add it in Admin.");
          break;
        }
        const userRow = db.prepare("SELECT id, salary FROM users WHERE name = ?").get(user.name) as { id: number; salary: number | null } | undefined;
        if (!userRow?.salary) {
          await sendWhatsApp(from, "ℹ️ No salary set for your account.");
          break;
        }

        const loans = db.prepare("SELECT SUM(balance) as total FROM loans WHERE user_id = ? AND status = 'active'").get(userRow.id) as { total: number | null };
        const lastPayment = db.prepare("SELECT month, net_paid, status, paid_date FROM salary_payments WHERE user_id = ? ORDER BY month DESC LIMIT 1").get(userRow.id) as { month: string; net_paid: number; status: string; paid_date: string } | undefined;

        const msg = [
          `💵 *Salary Info*`,
          `Monthly: ${fmt(userRow.salary)}`,
          loans.total ? `Outstanding Loans: ${fmt(loans.total)}` : "No active loans",
          lastPayment ? `\nLast: ${lastPayment.month} — ${fmt(lastPayment.net_paid)} (${lastPayment.status})` : "",
        ].filter(Boolean).join("\n");
        await sendWhatsApp(from, msg);
        break;
      }

      case "spend": {
        if (intent.amount) {
          const desc = intent.description || "Expense";
          const today = new Date().toISOString().split("T")[0];

          const dup = checkDuplicate("expense", intent.amount, desc, userName, today);
          if (dup.isDuplicate) {
            setSession(from, "confirm_dup_spend", { amount: intent.amount, description: desc });
            await sendWhatsApp(from, `⚠️ ${dup.message}\n\nSave anyway? Reply *yes* or *cancel*.`);
            break;
          }

          db.prepare(
            `INSERT INTO transactions (id, type, amount, description, category_id, helper_name, date, channel_id)
             VALUES (?, 'expense', ?, ?, ?, ?, ?, ?)`
          ).run(uuidv4(), intent.amount, desc, getCategoryId(desc), userName, today, getCashChannelId());

          await sendWhatsApp(from, `✅ Recorded: ${fmt(intent.amount)} — ${desc}`);
        } else {
          setSession(from, "awaiting_amount", { action: "spend", description: intent.description });
          await sendWhatsApp(from, `💸 Got it — expense for "${intent.description || "something"}". How much?`);
        }
        break;
      }

      case "add": {
        if (intent.amount) {
          const desc = intent.description || "Cash top-up";
          const today = new Date().toISOString().split("T")[0];

          const dup = checkDuplicate("income", intent.amount, desc, userName, today);
          if (dup.isDuplicate) {
            setSession(from, "confirm_dup_add", { amount: intent.amount, description: desc });
            await sendWhatsApp(from, `⚠️ ${dup.message}\n\nAdd anyway? Reply *yes* or *cancel*.`);
            break;
          }

          db.prepare(
            `INSERT INTO transactions (id, type, amount, description, helper_name, date, channel_id)
             VALUES (?, 'income', ?, ?, ?, ?, ?)`
          ).run(uuidv4(), intent.amount, desc, userName, today, getCashChannelId());

          await sendWhatsApp(from, `✅ Added: ${fmt(intent.amount)} — ${desc}`);
        } else {
          setSession(from, "awaiting_amount", { action: "add", description: intent.description });
          await sendWhatsApp(from, `💰 Adding money to kitty. How much?`);
        }
        break;
      }

      case "loan": {
        if (!user) {
          await sendWhatsApp(from, "⚠️ Your phone isn't linked to an account. Ask your employer to add it in Admin.");
          break;
        }
        const userForLoan = db.prepare("SELECT id FROM users WHERE name = ?").get(user.name) as { id: number } | undefined;
        if (!userForLoan) { await sendWhatsApp(from, "ℹ️ No account found."); break; }

        const activeLoans = db.prepare(
          "SELECT reason, amount, balance, emi, disbursed_at FROM loans WHERE user_id = ? AND status = 'active' ORDER BY disbursed_at DESC"
        ).all(userForLoan.id) as { reason: string; amount: number; balance: number; emi: number; disbursed_at: string }[];

        const paidLoans = db.prepare(
          "SELECT reason, amount FROM loans WHERE user_id = ? AND status = 'paid_off' ORDER BY disbursed_at DESC LIMIT 3"
        ).all(userForLoan.id) as { reason: string; amount: number }[];

        if (activeLoans.length === 0 && paidLoans.length === 0) {
          await sendWhatsApp(from, "ℹ️ No loans on record.");
          break;
        }

        const lines: string[] = ["💳 *Loan Status*\n"];

        if (activeLoans.length > 0) {
          lines.push("*Active Loans:*");
          for (const l of activeLoans) {
            lines.push(`• ${l.reason || "Loan"}: ${fmt(l.balance)} remaining (of ${fmt(l.amount)}, EMI ${fmt(l.emi)}/mo)`);
          }
          const totalOwed = activeLoans.reduce((s, l) => s + l.balance, 0);
          lines.push(`\n*Total outstanding: ${fmt(totalOwed)}*`);
        }

        if (paidLoans.length > 0) {
          lines.push("\n*Recently Paid Off:*");
          for (const l of paidLoans) {
            lines.push(`• ${l.reason || "Loan"}: ${fmt(l.amount)} ✅`);
          }
        }

        await sendWhatsApp(from, lines.join("\n"));
        break;
      }

      case "delete_last": {
        const lastTxn = db.prepare(
          "SELECT id, type, amount, description, date FROM transactions ORDER BY created_at DESC LIMIT 1"
        ).get() as { id: string; type: string; amount: number; description: string; date: string } | undefined;

        if (!lastTxn) {
          await sendWhatsApp(from, "ℹ️ No transactions to delete.");
          break;
        }

        setSession(from, "confirm_delete", { id: lastTxn.id, amount: lastTxn.amount, description: lastTxn.description });
        await sendWhatsApp(from, `🗑️ Delete this transaction?\n\n${lastTxn.type === "income" ? "➕" : "➖"} ${fmt(lastTxn.amount)} — ${lastTxn.description || "N/A"} (${lastTxn.date})\n\nReply *yes* to delete or *cancel*.`);
        break;
      }

      case "edit_last": {
        const lastForEdit = db.prepare(
          "SELECT id, type, amount, description, date FROM transactions ORDER BY created_at DESC LIMIT 1"
        ).get() as { id: string; type: string; amount: number; description: string; date: string } | undefined;

        if (!lastForEdit) {
          await sendWhatsApp(from, "ℹ️ No transactions to edit.");
          break;
        }

        if (intent.amount) {
          // Direct edit with new amount
          db.prepare("UPDATE transactions SET amount = ?, updated_at = datetime('now') WHERE id = ?")
            .run(intent.amount, lastForEdit.id);
          await sendWhatsApp(from, `✏️ Updated: ${fmt(lastForEdit.amount)} → ${fmt(intent.amount)} (${lastForEdit.description || "N/A"})`);
        } else {
          setSession(from, "awaiting_edit", { id: lastForEdit.id, amount: lastForEdit.amount, description: lastForEdit.description });
          await sendWhatsApp(from, `✏️ Editing: ${fmt(lastForEdit.amount)} — ${lastForEdit.description || "N/A"}\n\nSend the correct amount, or type the new description, or *cancel*.`);
        }
        break;
      }

      default:
        await sendWhatsApp(from, `🤔 Not sure what you mean. Try saying things like:\n• "Spent 150 on groceries"\n• "How much is left?"\n• "Check my loan"\n• "Delete last"\n\nOr send a receipt photo 📸`);
    }

  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    await sendWhatsApp(from, "⚠️ Something went wrong. Please try again.").catch(() => {});
  }

  return twimlResponse();
}

function twimlResponse() {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}

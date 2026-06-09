import db from "./db";

export const KEYWORD_MAP: Record<string, string[]> = {
  Grocery: [
    "grocery", "supermarket", "vegetables", "fruits", "milk", "bread",
    "rice", "food", "provisions", "eggs", "meat", "fish", "flour",
    "oil", "sugar", "spices", "daal", "atta", "sabzi", "kirana",
  ],
  Taxi: [
    "taxi", "cab", "uber", "ola", "ride", "transport", "auto",
    "rickshaw", "fare", "metro", "bus", "petrol", "diesel", "fuel",
  ],
  Household: [
    "cleaning", "broom", "detergent", "soap", "maintenance", "repair",
    "bucket", "mop", "dustbin", "bulb", "plumber", "electrician",
  ],
  Medical: [
    "pharmacy", "medicine", "doctor", "hospital", "clinic", "tablet",
    "health", "prescription", "medical", "chemist", "lab", "test",
  ],
  Utilities: [
    "electricity", "water", "gas", "internet", "phone", "recharge",
    "bill", "wifi", "broadband", "mobile", "dth",
  ],
};

export function recommendCategory(description: string | null): string | null {
  if (!description) return null;
  const lower = description.toLowerCase();

  for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }

  return recommendCategoryFromHistory(description);
}

function recommendCategoryFromHistory(description: string): string | null {
  const words = description
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  if (words.length === 0) return null;

  const likeConditions = words.map(() => `LOWER(t.description) LIKE ?`).join(" OR ");
  const params = words.map((w) => `%${w}%`);

  const result = db
    .prepare(
      `SELECT c.name, COUNT(*) as cnt
       FROM transactions t JOIN categories c ON t.category_id = c.id
       WHERE ${likeConditions}
       GROUP BY c.name ORDER BY cnt DESC LIMIT 1`
    )
    .get(...params) as { name: string; cnt: number } | undefined;

  return result ? result.name : null;
}

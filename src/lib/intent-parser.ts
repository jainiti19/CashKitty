// Smart local intent parser — no API calls, privacy-safe
// Handles natural language variations locally

export interface ParsedIntent {
  action: "help" | "balance" | "today" | "history" | "salary" | "spend" | "add" | "loan" | "delete_last" | "edit_last" | "unknown";
  amount?: number;
  description?: string;
}

// Amount patterns: "200", "$200", "HK$200", "two hundred", etc.
const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
};

function parseAmount(text: string): number | null {
  // Try numeric: "200", "200.50", "$200", "HK$200"
  const numMatch = text.match(/[\$]?\s*(\d+\.?\d*)/);
  if (numMatch) return parseFloat(numMatch[1]);

  // Try word numbers: "two hundred", "fifty"
  const words = text.toLowerCase().split(/\s+/);
  let total = 0;
  let current = 0;
  let found = false;

  for (const w of words) {
    if (NUMBER_WORDS[w] !== undefined) {
      found = true;
      const val = NUMBER_WORDS[w];
      if (val === 100) current = (current || 1) * 100;
      else if (val === 1000) current = (current || 1) * 1000;
      else current += val;
    } else if (found) {
      total += current;
      current = 0;
    }
  }
  total += current;
  return found && total > 0 ? total : null;
}

// Strip amount and common filler words to get description
function extractDescription(text: string): string {
  return text
    .replace(/[\$HK\$]?\s*\d+\.?\d*/g, "")
    .replace(/\b(spent|paid|bought|got|for|at|on|the|a|an|some|from|to|gave|added|put|in|into|of|with|my|our|i|we)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseIntent(text: string): ParsedIntent {
  const lower = text.toLowerCase().trim();

  // --- HELP ---
  const helpPatterns = [
    /^(hi|hello|hey|menu|help|commands|what can you do|options|start)/,
    /how (do|does|can) (i|this|it) work/,
    /what('s| is) available/,
  ];
  if (helpPatterns.some((p) => p.test(lower))) {
    return { action: "help" };
  }

  // --- BALANCE ---
  const balancePatterns = [
    /^(balance|bal|kitty balance)$/,
    /how much (money|cash|do we have|is left|remaining|is there)/,
    /what('s| is) the balance/,
    /what('s| is) left/,
    /check (the )?(balance|kitty|cash)/,
    /remaining (cash|money|balance|amount)/,
    /kitty (status|check)/,
  ];
  if (balancePatterns.some((p) => p.test(lower))) {
    return { action: "balance" };
  }

  // --- TODAY ---
  const todayPatterns = [
    /^today$/,
    /today('s| s)? (transactions|expenses|spending|summary|report)/,
    /what (did we|was) spen(d|t) today/,
    /show (me )?today/,
    /today('s)? (spend|expense)/,
  ];
  if (todayPatterns.some((p) => p.test(lower))) {
    return { action: "today" };
  }

  // --- HISTORY ---
  const historyPatterns = [
    /^(history|recent|last|latest)$/,
    /recent (transactions|expenses|spending)/,
    /last (few|5|five)? ?(transactions|expenses)/,
    /show (me )?(recent|history|latest|last)/,
    /what (have we|did we) spen(d|t)/,
    /transaction (history|list)/,
  ];
  if (historyPatterns.some((p) => p.test(lower))) {
    return { action: "history" };
  }

  // --- SALARY ---
  const salaryPatterns = [
    /^salary$/,
    /my salary/,
    /(check|show|view) (my )?salary/,
    /salary (info|status|details|check)/,
    /has my salary been paid/,
    /when (is|was) (my )?salary/,
    /pay(ment|slip|check)/,
    /loan (status|balance|info)/,
  ];
  if (salaryPatterns.some((p) => p.test(lower))) {
    return { action: "salary" };
  }

  // --- ADD MONEY ---
  const addPatterns = [
    /^add\s/,
    /(gave|given|handed|deposited|topped|top.?up|put in|added|adding|refill)/,
    /(add|put) .*(money|cash|funds|kitty)/,
    /cash kitty .*(top|add|refill)/,
    /(top|topped) up/,
  ];
  if (addPatterns.some((p) => p.test(lower))) {
    const amount = parseAmount(lower);
    if (amount && amount > 0) {
      return { action: "add", amount, description: extractDescription(text) || "Cash top-up" };
    }
    // Has intent but no amount — still recognize
    return { action: "add", description: extractDescription(text) || "Cash top-up" };
  }

  // --- SPEND / EXPENSE ---
  const spendPatterns = [
    /^spend\s/,
    /(spent|paid|bought|purchased|expense|cost|charged)/,
    /(grocery|groceries|market|taxi|cab|uber|bus|mtr|food|lunch|dinner|breakfast|medicine|doctor)/,
  ];
  if (spendPatterns.some((p) => p.test(lower))) {
    const amount = parseAmount(lower);
    if (amount && amount > 0) {
      return { action: "spend", amount, description: extractDescription(text) || "Expense" };
    }
    // Recognized intent but no amount
    return { action: "spend", description: extractDescription(text) || "Expense" };
  }

  // --- LOAN ---
  const loanPatterns = [
    /^loan$/,
    /loan (status|balance|info|details|check|amount)/,
    /my loan/,
    /(check|show|view|how much) .*(loan|owe|owing|debt)/,
    /outstanding (loan|debt|amount)/,
    /how much do i owe/,
    /loan (repay|repayment|pay)/,
    /repay (loan|debt)/,
  ];
  if (loanPatterns.some((p) => p.test(lower))) {
    return { action: "loan" };
  }

  // --- DELETE LAST ---
  const deletePatterns = [
    /^(delete|remove|undo|cancel) ?(last|previous|that|it)?$/,
    /delete (the )?(last|previous|latest) (one|transaction|entry|expense|payment)/,
    /undo (the )?(last|previous|that)/,
    /remove (the )?(last|previous|latest) (transaction|entry|expense)/,
    /that (was |is )?(wrong|incorrect|a mistake)/,
    /wrong (entry|transaction|amount)/,
    /made a mistake/,
    /cancel (the )?(last|previous)/,
  ];
  if (deletePatterns.some((p) => p.test(lower))) {
    return { action: "delete_last" };
  }

  // --- EDIT LAST ---
  const editPatterns = [
    /^(edit|change|update|correct|fix|modify) ?(last|previous|that|it)?$/,
    /(edit|change|update|correct|fix|modify) (the )?(last|previous|latest) (one|transaction|entry|expense|amount)/,
    /(change|update|correct) (the )?(amount|description|category)/,
    /it (should be|was actually|was really|is actually)/,
    /amount (should be|was|is) (\d+)/,
    /change (it |that )?(to|amount) (\d+)/,
  ];
  if (editPatterns.some((p) => p.test(lower))) {
    const amount = parseAmount(lower);
    return { action: "edit_last", amount: amount || undefined, description: extractDescription(text) || undefined };
  }

  // --- Last resort: check if there's just a number (likely an expense) ---
  const justNumber = lower.match(/^[\$HK\$]?\s*(\d+\.?\d*)\s*$/);
  if (justNumber) {
    return { action: "spend", amount: parseFloat(justNumber[1]) };
  }

  return { action: "unknown" };
}

export interface Category {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string | null;
  category_id: number | null;
  category_name?: string;
  category_color?: string;
  helper_name: string;
  invoice_image: string | null;
  ocr_raw: string | null;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface OcrResult {
  date: string | null;
  amount: number | null;
  description: string | null;
  recommended_category: string | null;
  confidence: "high" | "medium" | "low";
  raw_text: string;
}

export interface DailyReport {
  date: string;
  total_income: number;
  total_expense: number;
  net: number;
  transactions: Transaction[];
}

export interface TrendData {
  period: string;
  total_expense: number;
  total_income: number;
  by_category: { category: string; color: string; amount: number }[];
}

export interface KittyBalance {
  balance: number;
  total_income: number;
  total_expense: number;
}

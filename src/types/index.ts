export interface Category {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface FraudFlag {
  flagged: boolean;
  reason: string;
  severity: "low" | "medium" | "high";
}

export interface Alert {
  id: number;
  type: "category_deviation" | "upward_trend" | "invoice_mismatch";
  severity: "low" | "medium" | "high";
  message: string;
  details: Record<string, unknown> | null;
  transaction_ids: string[] | null;
  recommendation: string | null;
  detected_at: string;
  resolved: boolean;
}

export interface PaymentChannel {
  id: number;
  name: string;
  type: "cash" | "wallet" | "card";
  monthly_limit: number | null;
  color: string;
  icon: string;
  funded?: number;
  spent?: number;
  remaining?: number;
}

export interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string | null;
  category_id: number | null;
  category_name?: string;
  category_color?: string;
  channel_id: number | null;
  channel_name?: string;
  channel_icon?: string;
  helper_name: string;
  invoice_image: string | null;
  ocr_raw: string | null;
  fraud_flag?: FraudFlag | null;
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
  by_channel: PaymentChannel[];
}

export interface OcrResultExtended extends OcrResult {
  source_type: "invoice" | "wallet_statement";
  wallet_name: string | null;
}

export const CURRENCY = "HK$";
export const CURRENCY_CODE = "HKD";
export const LOCALE = "en-HK";

export function fmt(amount: number): string {
  return `${CURRENCY}${Math.round(amount).toLocaleString()}`;
}

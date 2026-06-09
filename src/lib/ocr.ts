import { GoogleGenerativeAI } from "@google/generative-ai";
import type { OcrResult } from "@/types";
import { recommendCategory } from "./category-recommender";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function extractInvoiceData(
  base64Image: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp"
): Promise<OcrResult & { source_type: string; wallet_name: string | null }> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const response = await model.generateContent([
    {
      inlineData: {
        mimeType: mediaType,
        data: base64Image,
      },
    },
    {
      text: `You are extracting transaction data from an image. The image could be:
1. A receipt/invoice from a purchase
2. A screenshot of a digital wallet (Octopus, PayMe, AlipayHK, WeChat Pay, etc.) or bank/credit card statement

Extract and return ONLY valid JSON with no markdown formatting, no code fences:
{
  "date": "YYYY-MM-DD or null if unclear",
  "amount": <total amount as a number, or null if unclear>,
  "description": "brief description of what was purchased or transaction description",
  "raw_text": "all readable text from the image",
  "confidence": "high" or "medium" or "low",
  "source_type": "invoice" or "wallet_statement",
  "wallet_name": "name of wallet/bank if visible (e.g. Octopus, PayMe, HSBC), or null"
}
If the image is not a receipt or statement, set confidence to "low" and extract what you can.`,
    },
  ]);

  const text = response.response.text();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  }

  const result = {
    date: typeof parsed.date === "string" ? parsed.date : null,
    amount: typeof parsed.amount === "number" ? parsed.amount : null,
    description: typeof parsed.description === "string" ? parsed.description : null,
    raw_text: typeof parsed.raw_text === "string" ? parsed.raw_text : "",
    confidence: (parsed.confidence as OcrResult["confidence"]) || "low",
    recommended_category: null as string | null,
    source_type: (parsed.source_type as string) || "invoice",
    wallet_name: typeof parsed.wallet_name === "string" ? parsed.wallet_name : null,
  };

  result.recommended_category = recommendCategory(result.description);

  return result;
}

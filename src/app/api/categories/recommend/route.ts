import { NextRequest, NextResponse } from "next/server";
import { recommendCategory } from "@/lib/category-recommender";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const description = searchParams.get("description");

  const recommended = recommendCategory(description);
  return NextResponse.json({ recommended });
}

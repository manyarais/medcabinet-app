// POST /api/reorder/instacart — create Instacart shopping-list URL (OTC restock).
// Body: { items: Array<{ name: string; quantity?: number }>, title?: string }

import {
  createInstacartShoppingListUrl,
  isInstacartConfigured,
  type InstacartLineItem,
} from "@/lib/instacart";
import { NextRequest, NextResponse } from "next/server";

type Body = {
  items?: InstacartLineItem[];
  title?: string;
};

export async function POST(request: NextRequest) {
  if (!isInstacartConfigured()) {
    return NextResponse.json(
      { error: "Instacart not configured." },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "items must be a non-empty array of { name, quantity? }." },
      { status: 400 },
    );
  }

  for (const item of body.items) {
    if (!item || typeof item.name !== "string" || !item.name.trim()) {
      return NextResponse.json(
        { error: "Each item needs a non-empty name." },
        { status: 400 },
      );
    }
  }

  try {
    const url = await createInstacartShoppingListUrl(
      body.items,
      body.title?.trim() || "Pillio restock",
    );
    return NextResponse.json({ url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create Instacart list.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

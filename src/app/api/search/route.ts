import { NextResponse } from "next/server";

import { search } from "@/lib/data";

/** GET /api/search?q=... */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";

  // Cap the input so nobody can hand us a megabyte to run ILIKE against.
  if (q.length > 100) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  try {
    return NextResponse.json(await search(q));
  } catch (error) {
    console.error("GET /api/search", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

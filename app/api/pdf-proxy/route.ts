import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("file");
  if (!url)
    return NextResponse.json({ error: "missing file param" }, { status: 400 });

  const res = await fetch(url);
  if (!res.ok)
    return NextResponse.json({ error: "failed fetch" }, { status: 500 });

  const blob = await res.arrayBuffer();
  return new NextResponse(blob, {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

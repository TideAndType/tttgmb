import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const OPENLENS_BASE = "https://openlens.com/api";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const __u = session.user as any;
  const __v = cookies().get("adminViewingAs")?.value;
  const effId = (__v && (__u.role === "ADMIN" || __u.role === "SUPER_ADMIN")) ? __v : __u.id;
  const user = await prisma.user.findUnique({
    where: { id: effId },
    select: { openLensApiKey: true },
  });
  if (!user?.openLensApiKey) return NextResponse.json({ error: "No OpenLens API key configured" }, { status: 400 });

  const { path, method = "GET", body, params } = await req.json();
  const url = new URL(`${OPENLENS_BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const upstream = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Bearer ${user.openLensApiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // PDF passthrough
  if (upstream.headers.get("content-type")?.includes("application/pdf")) {
    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": upstream.headers.get("Content-Disposition") ?? "attachment; filename=report.pdf",
      },
    });
  }

  // SSE onboard endpoint returns chunked text — collect and parse last data: line
  const text = await upstream.text();
  if (text.includes("data: ")) {
    const lines = text.trim().split("\n").filter((l) => l.startsWith("data: "));
    const last = lines[lines.length - 1]?.replace("data: ", "");
    try {
      return NextResponse.json(JSON.parse(last));
    } catch {
      return new NextResponse(text, { status: upstream.status });
    }
  }

  try {
    return NextResponse.json(JSON.parse(text), { status: upstream.status });
  } catch {
    return new NextResponse(text, { status: upstream.status });
  }
}

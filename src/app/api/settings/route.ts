import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULTS = {
  id: "singleton",
  appName: "Client Portal",
  logoFilename: null,
  primaryColor: "#2dd4bf",
  accentColor: "#6366f1",
};

export async function GET() {
  try {
    const settings = await prisma.appSettings.findUnique({
      where: { id: "singleton" },
    });
    return NextResponse.json(settings ?? DEFAULTS);
  } catch {
    return NextResponse.json(DEFAULTS);
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN" && (session.user as any).role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const data: Record<string, string> = {};
  if (typeof body.appName === "string") data.appName = body.appName;
  if (typeof body.primaryColor === "string") data.primaryColor = body.primaryColor;
  if (typeof body.accentColor === "string") data.accentColor = body.accentColor;

  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { ...DEFAULTS, ...data, id: "singleton" },
  });

  return NextResponse.json(settings);
}

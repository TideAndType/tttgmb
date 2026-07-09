import { NextRequest, NextResponse } from "next/server";
import { agencyForHost, publicBranding } from "@/lib/agency";

export const dynamic = "force-dynamic";

// Public: resolve branding for a host (used by the white-label login page
// before the user authenticates). Falls back to null branding.
export async function GET(req: NextRequest) {
  const host = req.nextUrl.searchParams.get("host") || req.headers.get("host");
  const agency = await agencyForHost(host);
  if (!agency) return NextResponse.json({ branding: null });
  return NextResponse.json({ branding: publicBranding(agency) });
}

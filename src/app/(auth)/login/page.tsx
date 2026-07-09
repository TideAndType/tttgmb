import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { agencyForHost } from "@/lib/agency";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

const DEFAULTS = {
  appName: "Client Portal",
  logoFilename: null as string | null,
  primaryColor: "#2dd4bf",
};

async function getAppSettings() {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
    return settings ?? DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export default async function LoginPage() {
  // White-label: if the request host maps to an agency (custom domain or
  // {slug}.<root>), show that agency's branding. Otherwise fall back to the
  // global app settings.
  const host = headers().get("host");
  const agency = await agencyForHost(host).catch(() => null);

  if (agency) {
    return (
      <LoginForm
        appName={agency.appName}
        logoFilename={null}
        logoUrl={agency.logoData}
        primaryColor={agency.primaryColor}
        headline={agency.loginHeadline}
        subtext={agency.loginSubtext}
      />
    );
  }

  const settings = await getAppSettings();
  return (
    <LoginForm
      appName={settings.appName}
      logoFilename={settings.logoFilename ?? null}
      primaryColor={settings.primaryColor}
    />
  );
}

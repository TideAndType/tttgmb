import { prisma } from "@/lib/prisma";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

const DEFAULTS = {
  appName: "Client Portal",
  logoFilename: null as string | null,
  primaryColor: "#2dd4bf",
};

async function getAppSettings() {
  try {
    const settings = await prisma.appSettings.findUnique({
      where: { id: "singleton" },
    });
    return settings ?? DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export default async function LoginPage() {
  const settings = await getAppSettings();
  return (
    <LoginForm
      appName={settings.appName}
      logoFilename={settings.logoFilename ?? null}
      primaryColor={settings.primaryColor}
    />
  );
}

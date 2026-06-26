"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

interface Props {
  appName: string;
  logoFilename: string | null;
  primaryColor: string;
}

export default function LoginForm({ appName, logoFilename, primaryColor }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [needs2fa, setNeeds2fa] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      totp,
      redirect: false,
    });

    if (result?.error) {
      if (result.error === "2FA_REQUIRED") {
        setNeeds2fa(true);
        setError("");
        setLoading(false);
        return;
      }
      if (result.error === "INVALID_2FA") {
        setNeeds2fa(true);
        setError("Invalid authentication code. Please try again.");
        setLoading(false);
        return;
      }
      setError("Invalid email or password. Please try again.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/auth/session");
    const session = await response.json();

    if (session?.user?.role === "ADMIN") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {logoFilename && (
            <div className="flex justify-center mb-4">
              <img
                src={`/api/uploads/${logoFilename}`}
                alt={appName}
                style={{ maxHeight: "64px", width: "auto", objectFit: "contain" }}
              />
            </div>
          )}
          <h1 className="text-3xl font-bold text-foreground">{appName}</h1>
          <p className="text-muted-foreground mt-2">Sign in to your account</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to access the portal</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  {error}
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              {needs2fa && (
                <div className="space-y-2">
                  <Label htmlFor="totp">Authentication code</Label>
                  <Input
                    id="totp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    value={totp}
                    onChange={(e) => setTotp(e.target.value)}
                    required
                    autoFocus
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 w-full text-primary-foreground"
                style={{ backgroundColor: primaryColor }}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { User } from "lucide-react";

export function WelcomeWidget() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const firstName = user?.name?.split(" ")[0] ?? "there";
  return (
    <Card>
      <CardContent className="pt-6 pb-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-lg text-foreground">Welcome back, {firstName}</p>
            <p className="text-sm text-muted-foreground">{user?.companyName ?? user?.email ?? ""}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Here&apos;s a summary of your portal activity.</p>
      </CardContent>
    </Card>
  );
}

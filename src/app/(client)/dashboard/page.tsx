import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Key, BookOpen, Globe } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: { brandColors: true, brandFonts: true, brandAssets: true },
      },
    },
  });

  const cards = [
    {
      title: "SEO Overview",
      description: user?.gscProperty ? "Connected to Google Search Console" : "Connect GSC to view data",
      icon: Search,
      href: "/seo",
      badge: user?.gscProperty ? "Connected" : "Not connected",
      badgeVariant: user?.gscProperty ? "default" : "outline",
    },
    {
      title: "Keywords",
      description: "View your keyword rankings",
      icon: Key,
      href: "/keywords",
      badge: user?.gscProperty ? "Active" : "Setup required",
      badgeVariant: user?.gscProperty ? "default" : "outline",
    },
    {
      title: "Brand Book",
      description: `${user?._count.brandColors || 0} colors · ${user?._count.brandFonts || 0} fonts · ${user?._count.brandAssets || 0} assets`,
      icon: BookOpen,
      href: "/brand-book",
      badge: "Active",
      badgeVariant: "secondary",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {session?.user?.name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground mt-1">
          {(session?.user as any)?.companyName || "Your Company"} &mdash; SEO & Brand Dashboard
        </p>
      </div>

      {user?.gscProperty && (
        <div className="flex items-center gap-2 mb-6 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <Globe className="h-4 w-4 text-primary" />
          <span className="text-sm text-foreground">GSC Property: <span className="font-medium">{user.gscProperty}</span></span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="p-2 bg-primary/10 rounded-md">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant={card.badgeVariant as any}>{card.badge}</Badge>
                </CardHeader>
                <CardContent>
                  <h3 className="font-semibold text-foreground mb-1">{card.title}</h3>
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

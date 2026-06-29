import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, LayoutGrid, ArrowRight, Clock, FileText, Star } from "lucide-react";
import { ProjectNotes } from "@/components/projects/project-notes";
import { SatisfactionRating } from "@/components/projects/satisfaction-rating";
import { projectTimeMinutes } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ProjectHomePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user as any;

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { _count: { select: { comments: true } } },
      },
      columns: {
        orderBy: { position: "asc" },
        include: { _count: { select: { cards: true } } },
      },
      ratings: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!project) notFound();
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && project.userId !== user.id) redirect("/projects");

  const myRating = project.ratings.find((r) => r.userId === user.id) ?? null;
  const totalMinutes = await projectTimeMinutes(project.id);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <div
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: project.color }}
        />
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
        {totalMinutes > 0 && (
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{(totalMinutes / 60).toFixed(1)}h</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end"><Clock className="h-3 w-3" />total time</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Message Board Preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Message Board</CardTitle>
            </div>
            <Link href={`/projects/${params.id}/messages`}>
              <Button variant="ghost" size="sm" className="gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {project.messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No messages yet.</p>
            ) : (
              <div className="space-y-3">
                {project.messages.map((msg) => (
                  <Link key={msg.id} href={`/projects/${params.id}/messages/${msg.id}`}>
                    <div className="p-3 rounded-md border border-border hover:border-primary/40 transition-colors">
                      <p className="font-medium text-sm text-foreground truncate">{msg.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(msg.createdAt).toLocaleDateString()}
                        <span>&middot;</span>
                        <MessageSquare className="h-3 w-3" />
                        {msg._count.comments} comment{msg._count.comments !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <Link href={`/projects/${params.id}/messages/new`}>
              <Button variant="outline" size="sm" className="w-full mt-4">
                New Message
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Card Table Preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Card Board</CardTitle>
            </div>
            <Link href={`/projects/${params.id}/cards`}>
              <Button variant="ghost" size="sm" className="gap-1">
                Open <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {project.columns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No columns yet.</p>
            ) : (
              <div className="space-y-2">
                {project.columns.map((col) => (
                  <div
                    key={col.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/40"
                  >
                    <span className="text-sm font-medium">{col.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {col._count.cards} card{col._count.cards !== 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Link href={`/projects/${params.id}/cards`}>
              <Button variant="outline" size="sm" className="w-full mt-4">
                Manage Board
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Ratings overview — admins see all client feedback */}
      {(user.role === "ADMIN" || user.role === "SUPER_ADMIN") && project.ratings.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                <CardTitle className="text-lg">
                  Client Satisfaction · {(project.ratings.reduce((s, r) => s + r.score, 0) / project.ratings.length).toFixed(1)}/5
                  <span className="text-sm font-normal text-muted-foreground ml-1">({project.ratings.length})</span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {project.ratings.map((r) => (
                <div key={r.id} className="border-b border-border last:border-0 pb-2 last:pb-0">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`h-4 w-4 ${n <= r.score ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  {r.comment && <p className="text-sm text-muted-foreground mt-1 italic">&ldquo;{r.comment}&rdquo;</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Satisfaction rating — shown to clients once the project is completed */}
      {user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && project.status === "completed" && (
        <div className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-400" />
                <CardTitle className="text-lg">Your Feedback</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <SatisfactionRating
                projectId={params.id}
                initialScore={myRating?.score ?? null}
                initialComment={myRating?.comment ?? null}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Project Notes */}
      <div className="mt-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Project Notes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ProjectNotes
              projectId={params.id}
              initialNotes={project.notes ?? ""}
              readOnly={user.role !== "ADMIN" && user.role !== "SUPER_ADMIN"}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { NewProposalForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NewProposalPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    select: { id: true, name: true, companyName: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">New Proposal</h1>
      <NewProposalForm clients={clients} />
    </div>
  );
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ClientProposalView } from "./client-view";

export const dynamic = "force-dynamic";

export default async function ClientProposalPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = session.user as any;

  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, name: true, companyName: true } } },
  });

  if (!proposal || proposal.userId !== user.id || proposal.status === "DRAFT") {
    notFound();
  }

  return (
    <ClientProposalView
      proposal={{
        id: proposal.id,
        title: proposal.title,
        status: proposal.status,
        currency: proposal.currency,
        validUntil: proposal.validUntil?.toISOString() ?? null,
        sections: proposal.sections as any[],
        totalAmount: proposal.totalAmount,
        sentAt: proposal.sentAt?.toISOString() ?? null,
        acceptedBy: proposal.acceptedBy,
        signatureData: proposal.signatureData,
        respondedAt: proposal.respondedAt?.toISOString() ?? null,
        createdAt: proposal.createdAt.toISOString(),
        brand: proposal.brand as any ?? null,
        user: proposal.user,
      }}
    />
  );
}

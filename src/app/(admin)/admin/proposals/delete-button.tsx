"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteProposalButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this proposal? This cannot be undone.")) return;
    setLoading(true);
    await fetch(`/api/proposals/${id}`, { method: "DELETE" });
    router.refresh();
    setLoading(false);
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleDelete} disabled={loading} className="text-destructive hover:text-destructive">
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

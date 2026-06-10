"use client";
import { useRouter } from "next/navigation";

export function ExitImpersonationButton() {
  const router = useRouter();
  const handleExit = async () => {
    await fetch("/api/admin/impersonate/exit", { method: "POST" });
    router.push("/admin");
  };
  return (
    <button onClick={handleExit} className="underline hover:no-underline text-white text-sm">
      Exit admin view
    </button>
  );
}

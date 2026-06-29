import { redirect } from "next/navigation";

// Time tracking is agency-side now; clients view time per task and per project.
export default function TimeRedirect() {
  redirect("/dashboard");
}

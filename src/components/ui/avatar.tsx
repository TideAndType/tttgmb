import { cn } from "@/lib/utils";

const AVATAR_COLORS = ["bg-teal-500", "bg-violet-500", "bg-amber-500", "bg-rose-500", "bg-blue-500", "bg-emerald-500", "bg-indigo-500", "bg-orange-500"];

function initialsOf(name: string) {
  return (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

// Initials/photo avatar. Pass `image` (a URL or data URL) to show a photo,
// otherwise renders colored initials seeded by `seed` (stable per user).
export function UserAvatar({
  name,
  seed,
  image,
  className,
}: {
  name: string;
  seed?: string;
  image?: string | null;
  className?: string;
}) {
  const base = cn("rounded-full shrink-0 overflow-hidden flex items-center justify-center h-8 w-8", className);
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={name} title={name} className={cn(base, "object-cover")} />;
  }
  const s = seed || name || "?";
  const idx = s.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return (
    <div className={cn(base, AVATAR_COLORS[idx], "text-white font-semibold")} title={name}>
      <span className="text-[0.7em]">{initialsOf(name)}</span>
    </div>
  );
}

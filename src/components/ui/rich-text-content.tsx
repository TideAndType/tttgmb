import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";

// Renders stored markdown (messages/comments/chat). Safe: renderMarkdown
// escapes all user HTML before emitting our own tags.
export function RichTextContent({ text, className }: { text: string; className?: string }) {
  return (
    <div
      className={cn("text-sm text-foreground/90 break-words", className)}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
    />
  );
}

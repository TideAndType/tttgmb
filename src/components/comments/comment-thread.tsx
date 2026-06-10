"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

interface CommentThreadProps {
  commentsUrl: string;
  initialCount?: number;
}

export function CommentThread({ commentsUrl, initialCount = 0 }: CommentThreadProps) {
  const [open, setOpen] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [postLoading, setPostLoading] = useState(false);
  const [commentCount, setCommentCount] = useState(initialCount);

  const handleToggle = async () => {
    if (!open && !fetched) {
      setLoading(true);
      try {
        const res = await fetch(commentsUrl);
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || []);
          setCommentCount(data.comments?.length ?? commentCount);
          setFetched(true);
        }
      } catch {
        // silently fail
      }
      setLoading(false);
    }
    setOpen((prev) => !prev);
  };

  const handlePost = async () => {
    if (!newComment.trim()) return;
    setPostLoading(true);
    try {
      const res = await fetch(commentsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newComment }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data.comment]);
        setCommentCount((prev) => prev + 1);
        setNewComment("");
      }
    } catch {
      // silently fail
    }
    setPostLoading(false);
  };

  return (
    <div>
      <Button
        size="sm"
        variant="ghost"
        onClick={handleToggle}
        className="text-xs h-7 gap-1 text-muted-foreground"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Comments ({commentCount})
      </Button>

      {open && (
        <div className="mt-4 border-t border-border pt-4 space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">No comments yet.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-foreground">{c.authorName}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={3}
              className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground resize-none"
            />
            <Button
              size="sm"
              onClick={handlePost}
              disabled={postLoading || !newComment.trim()}
            >
              {postLoading ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

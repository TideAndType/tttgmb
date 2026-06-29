"use client";

import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";

// Downscale an image file to a square ~160px data URL (JPEG) for compact storage.
function fileToAvatarDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 160;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        // Center-crop to square.
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AvatarUpload({ name, initialImage = null }: { name: string; initialImage?: string | null }) {
  const [image, setImage] = useState<string | null>(initialImage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialImage == null) {
      fetch("/api/profile/avatar").then((r) => r.json()).then((d) => setImage(d.image ?? null)).catch(() => {});
    }
  }, [initialImage]);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      const res = await fetch("/api/profile/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Upload failed");
      }
      setImage(dataUrl);
    } catch (err: any) {
      setError(err.message || "Couldn't update photo");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    await fetch("/api/profile/avatar", { method: "DELETE" });
    setImage(null);
    setBusy(false);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <UserAvatar name={name} image={image} className="h-20 w-20 text-2xl" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow ring-2 ring-card hover:opacity-90"
          aria-label="Change photo"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Profile photo</p>
        <p className="text-xs text-muted-foreground">JPG or PNG. Square images look best.</p>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        {image && (
          <Button size="sm" variant="ghost" className="mt-1 h-7 px-2 text-xs text-muted-foreground" onClick={remove} disabled={busy}>
            Remove photo
          </Button>
        )}
      </div>
    </div>
  );
}

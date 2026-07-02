"use client";

import { useRef, useState, useCallback } from "react";
import { Bold, Italic, Code, List, ListOrdered, Link2, Table, Heading, Quote, Eye, Pencil, Mic, Square } from "lucide-react";
import { RichTextContent } from "@/components/ui/rich-text-content";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}

const MAX_AUDIO_SECONDS = 120;

// Markdown-based rich text editor: a toolbar that wraps/inserts markdown, a
// live preview toggle, and in-browser voice notes (recorded audio embedded as
// a data URL token that RichTextContent renders as an <audio> player).
export function RichTextEditor({ value, onChange, placeholder, rows = 4, className }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioError, setAudioError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Wrap the current selection with before/after, or insert a snippet.
  const surround = useCallback((before: string, after = before, placeholderText = "") => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end) || placeholderText;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + before.length + selected.length;
      ta.setSelectionRange(pos, pos);
    });
  }, [value, onChange]);

  const insertBlock = useCallback((text: string) => {
    const ta = ref.current;
    const start = ta?.selectionStart ?? value.length;
    const prefix = start > 0 && value[start - 1] !== "\n" ? "\n" : "";
    const next = value.slice(0, start) + prefix + text + value.slice(start);
    onChange(next);
  }, [value, onChange]);

  const addLink = () => {
    const url = window.prompt("Link URL (https://…)");
    if (!url) return;
    surround("[", `](${url})`, "link text");
  };

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startRecording = useCallback(async () => {
    setAudioError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setAudioError("Voice notes aren’t supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = String(reader.result);
          insertBlock(`%%audio:${dataUrl}%%`);
        };
        reader.readAsDataURL(blob);
        setRecording(false);
        setSeconds(0);
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_AUDIO_SECONDS) { stopRecording(); return MAX_AUDIO_SECONDS; }
          return s + 1;
        });
      }, 1000);
    } catch {
      setAudioError("Microphone access was denied.");
    }
  }, [insertBlock, stopRecording]);

  const Btn = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
    <button type="button" onClick={onClick} title={title} className="p-1.5 rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
      {children}
    </button>
  );

  return (
    <div className={cn("border border-input rounded-md bg-background", className)}>
      <div className="flex items-center gap-0.5 flex-wrap border-b border-border px-1 py-1">
        <Btn onClick={() => surround("**", "**", "bold")} title="Bold"><Bold className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={() => surround("*", "*", "italic")} title="Italic"><Italic className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={() => surround("`", "`", "code")} title="Inline code"><Code className="h-3.5 w-3.5" /></Btn>
        <span className="w-px h-4 bg-border mx-0.5" />
        <Btn onClick={() => insertBlock("### ")} title="Heading"><Heading className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={() => insertBlock("- ")} title="Bullet list"><List className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={() => insertBlock("1. ")} title="Numbered list"><ListOrdered className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={() => insertBlock("> ")} title="Quote"><Quote className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={() => insertBlock("```\ncode\n```\n")} title="Code block"><Code className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={() => insertBlock("| Col 1 | Col 2 |\n| --- | --- |\n| a | b |\n")} title="Table"><Table className="h-3.5 w-3.5" /></Btn>
        <Btn onClick={addLink} title="Link"><Link2 className="h-3.5 w-3.5" /></Btn>
        <span className="w-px h-4 bg-border mx-0.5" />
        {recording ? (
          <button type="button" onClick={stopRecording} title="Stop recording" className="flex items-center gap-1 px-2 py-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
            <Square className="h-3.5 w-3.5 fill-current" />
            <span className="text-xs font-mono">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span>
          </button>
        ) : (
          <Btn onClick={startRecording} title="Record voice note"><Mic className="h-3.5 w-3.5" /></Btn>
        )}
        <div className="ml-auto">
          <Btn onClick={() => setPreview((p) => !p)} title={preview ? "Edit" : "Preview"}>
            {preview ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Btn>
        </div>
      </div>

      {audioError && <p className="px-3 py-1 text-xs text-red-600">{audioError}</p>}

      {preview ? (
        <div className="px-3 py-2 min-h-[80px]">
          {value.trim() ? <RichTextContent text={value} /> : <p className="text-sm text-muted-foreground">Nothing to preview.</p>}
        </div>
      ) : (
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full px-3 py-2 text-sm bg-transparent text-foreground resize-y focus:outline-none"
        />
      )}
    </div>
  );
}

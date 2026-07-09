// Small, dependency-free Markdown → HTML renderer for user-authored content
// (messages, comments, chat). HTML is escaped FIRST so nothing user-supplied
// can inject markup; only our own generated tags survive. Supports headings,
// bold/italic, inline + fenced code, links, lists, blockquotes, GFM pipe
// tables, horizontal rules, and an audio token for voice notes.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Inline: code, bold, italic, links, and voice-note audio tokens.
function inline(text: string): string {
  let out = text;

  // Voice note: %%audio:<dataUrl>%% → <audio controls>
  out = out.replace(/%%audio:(data:audio\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+)%%/gi, (_m, url) => {
    return `<audio controls src="${url}" class="max-w-full my-1"></audio>`;
  });

  // Inline code (before other inline styles so its contents are literal).
  out = out.replace(/`([^`]+)`/g, (_m, code) => `<code class="px-1 py-0.5 rounded bg-muted text-[0.85em] font-mono">${code}</code>`);

  // Links [text](url) — only http(s)/mailto.
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
    (_m, label, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary underline">${label}</a>`);

  // Bold then italic.
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");

  return out;
}

export function renderMarkdown(src: string): string {
  if (!src) return "";
  const escaped = escapeHtml(src);
  const lines = escaped.split("\n");
  const html: string[] = [];

  let i = 0;
  let inList: "ul" | "ol" | null = null;

  const closeList = () => { if (inList) { html.push(`</${inList}>`); inList = null; } };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block.
    if (/^```/.test(line.trim())) {
      closeList();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) { buf.push(lines[i]); i++; }
      i++; // skip closing fence
      html.push(`<pre class="my-2 p-3 rounded-lg bg-muted overflow-x-auto text-[0.85em]"><code class="font-mono whitespace-pre">${buf.join("\n")}</code></pre>`);
      continue;
    }

    // GFM pipe table: header row + separator row of dashes.
    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes("-")) {
      closeList();
      const cells = (row: string) => row.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
      const header = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") { rows.push(cells(lines[i])); i++; }
      const thead = `<thead><tr>${header.map((h) => `<th class="border border-border px-2 py-1 text-left font-semibold">${inline(h)}</th>`).join("")}</tr></thead>`;
      const tbody = `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td class="border border-border px-2 py-1">${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
      html.push(`<table class="my-2 border-collapse text-sm">${thead}${tbody}</table>`);
      continue;
    }

    // Headings.
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      closeList();
      const level = h[1].length;
      const sizes = ["text-lg", "text-base", "text-sm"];
      html.push(`<h${level} class="font-bold ${sizes[level - 1]} mt-2 mb-1">${inline(h[2])}</h${level}>`);
      i++; continue;
    }

    // Horizontal rule.
    if (/^---+$/.test(line.trim())) { closeList(); html.push('<hr class="my-3 border-border" />'); i++; continue; }

    // Blockquote.
    if (/^>\s?/.test(line)) {
      closeList();
      html.push(`<blockquote class="border-l-2 border-border pl-3 my-1 text-muted-foreground">${inline(line.replace(/^>\s?/, ""))}</blockquote>`);
      i++; continue;
    }

    // Ordered list.
    const ol = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ol) {
      if (inList !== "ol") { closeList(); html.push('<ol class="list-decimal ml-5 my-1 space-y-0.5">'); inList = "ol"; }
      html.push(`<li>${inline(ol[1])}</li>`);
      i++; continue;
    }

    // Unordered list.
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    if (ul) {
      if (inList !== "ul") { closeList(); html.push('<ul class="list-disc ml-5 my-1 space-y-0.5">'); inList = "ul"; }
      html.push(`<li>${inline(ul[1])}</li>`);
      i++; continue;
    }

    // Blank line.
    if (line.trim() === "") { closeList(); i++; continue; }

    // Paragraph.
    closeList();
    html.push(`<p class="my-1 leading-relaxed">${inline(line)}</p>`);
    i++;
  }
  closeList();
  return html.join("");
}

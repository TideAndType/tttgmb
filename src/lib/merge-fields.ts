export interface MergeVars {
  clientName?: string;
  company?: string;
  date?: string;
  proposalValue?: string;
  contactEmail?: string;
}

export const MERGE_FIELDS: { token: string; label: string }[] = [
  { token: "{{client_name}}", label: "Client name" },
  { token: "{{company}}", label: "Company" },
  { token: "{{contact_email}}", label: "Contact email" },
  { token: "{{date}}", label: "Today's date" },
  { token: "{{proposal_value}}", label: "Proposal value" },
];

export function applyMerge(text: string, v: MergeVars): string {
  if (!text || typeof text !== "string" || !text.includes("{{")) return text;
  return text
    .replace(/\{\{\s*client_name\s*\}\}/gi, v.clientName || "")
    .replace(/\{\{\s*company\s*\}\}/gi, v.company || "")
    .replace(/\{\{\s*contact_email\s*\}\}/gi, v.contactEmail || "")
    .replace(/\{\{\s*date\s*\}\}/gi, v.date || "")
    .replace(/\{\{\s*proposal_value\s*\}\}/gi, v.proposalValue || "");
}

// Deep-clone sections and substitute merge tokens in every string value.
export function resolveMergeFields<T>(sections: T, v: MergeVars): T {
  const clone = JSON.parse(JSON.stringify(sections));
  const walk = (node: any) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node && typeof node === "object") {
      for (const k of Object.keys(node)) {
        if (typeof node[k] === "string") node[k] = applyMerge(node[k], v);
        else walk(node[k]);
      }
    }
  };
  walk(clone);
  return clone;
}

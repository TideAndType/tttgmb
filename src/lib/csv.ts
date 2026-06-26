// Minimal RFC 4180 CSV builder.

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Quote if the value contains comma, quote, or newline.
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Build a CSV string from an array of rows.
 * @param headers Column headers in order.
 * @param rows Each row is an array of cell values matching the headers order.
 */
export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(","));
  }
  // Prepend BOM so Excel opens UTF-8 correctly.
  return "﻿" + lines.join("\r\n");
}

/** Standard headers for a CSV download response. */
export function csvHeaders(filename: string): HeadersInit {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
  };
}

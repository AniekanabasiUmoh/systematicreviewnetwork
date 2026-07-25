/* Sprint 5.6 — RFC 4180 CSV encoding for admin exports.
 *
 * No `server-only` import: this module is pure string transformation and
 * needs to be unit-testable directly (tests/admin-csv.test.ts).
 *
 * Two defensive details that matter more than they look:
 *   - UTF-8 BOM at byte 0 is what makes Excel read the file as UTF-8 instead
 *     of the system codepage, so diacritics (e.g. "Adébáyọ̀ Ọlámidé") render
 *     correctly rather than as mojibake.
 *   - CSV injection: a cell starting with = + - @ \t \r is a formula to any
 *     spreadsheet app that opens the file. `=cmd|'/c calc'!A1` in a name
 *     field is remote code execution on the staffer's machine the moment they
 *     double-click the download. Prefixing with a bare apostrophe neutralises
 *     the formula while keeping the visible value intact (unlike stripping or
 *     tab-prefixing, which would change what the cell displays).
 */

const BOM = "﻿";
const INJECTION_LEAD = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  let str = value === null || value === undefined ? "" : String(value);
  if (INJECTION_LEAD.test(str)) str = `'${str}`;
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function csvRow(cells: ReadonlyArray<unknown>): string {
  return cells.map(csvCell).join(",");
}

export function toCsv(
  headers: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<unknown>>,
): string {
  const lines = [csvRow(headers), ...rows.map((row) => csvRow(row))];
  return BOM + lines.join("\r\n") + "\r\n";
}

export function csvFilename(table: string, now: Date = new Date()): string {
  const date = now.toISOString().slice(0, 10);
  return `srn-${table}-${date}.csv`;
}

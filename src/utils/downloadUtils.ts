import { HistoryEntry } from '../types';

/**
 * Triggers a browser file download for the given text content.
 */
export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Give the browser a tick to pick up the object URL before revoking it.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Neutralizes spreadsheet formula injection. Many spreadsheet applications
 * (Excel, Google Sheets, LibreOffice) treat a cell as a formula if it starts
 * with =, +, -, or @ — so a history entry like `=cmd|'/c calc'!A1` typed
 * into the ASCII/text tool would silently become an executable formula when
 * the exported CSV is opened, not inert text. Prefixing with a leading
 * apostrophe is the standard mitigation: spreadsheet apps render it as plain
 * text while dropping the apostrophe itself from the visible value. This
 * only applies to CSV — JSON/TXT exports aren't opened by spreadsheet
 * software and stay untouched so they remain semantically exact.
 */
function neutralizeFormulaInjection(val: string): string {
  return /^[=+\-@]/.test(val) ? `'${val}` : val;
}

function csvEscape(val: string): string {
  const safe = neutralizeFormulaInjection(val);
  if (/[",\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function historyToCSV(entries: HistoryEntry[]): string {
  const headers = ['Timestamp', 'Tool', 'Operation', 'Input Label', 'Input', 'Output Label', 'Output'];
  const rows = entries.map(e => [
    new Date(e.timestamp).toISOString(),
    e.mode,
    e.operation,
    e.inputLabel,
    e.input,
    e.outputLabel,
    e.output,
  ].map(v => csvEscape(String(v))).join(','));
  return [headers.join(','), ...rows].join('\n');
}

export function historyToJSON(entries: HistoryEntry[]): string {
  return JSON.stringify(
    entries.map(e => ({
      timestamp: new Date(e.timestamp).toISOString(),
      tool: e.mode,
      operation: e.operation,
      inputLabel: e.inputLabel,
      input: e.input,
      outputLabel: e.outputLabel,
      output: e.output,
    })),
    null,
    2
  );
}

export function historyToTXT(entries: HistoryEntry[]): string {
  return entries
    .map(e => {
      const date = new Date(e.timestamp).toLocaleString();
      return `[${date}] ${e.operation}\n  ${e.inputLabel}: ${e.input}\n  ${e.outputLabel}: ${e.output}`;
    })
    .join('\n\n');
}

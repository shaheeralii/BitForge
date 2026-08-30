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

function csvEscape(val: string): string {
  if (/[",\n]/.test(val)) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
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

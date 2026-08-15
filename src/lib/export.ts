import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import jsPDF from 'jspdf';
import { getStack, getAllDoses, getProgressNotes, type StackItem, type Dose, type ProgressNote } from './api';
import { toISODate } from './date';

export interface ExportData {
  stack: StackItem[];
  doses: Dose[];
  notes: ProgressNote[];
}

export async function gatherExportData(userId: string): Promise<ExportData> {
  const [stack, doses, notes] = await Promise.all([
    getStack(userId),
    getAllDoses(userId),
    getProgressNotes(userId),
  ]);
  return { stack, doses, notes };
}

function csvEscape(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? '' : String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function csvRow(values: (string | number | null | undefined)[]): string {
  return values.map(csvEscape).join(',');
}

export function buildCSV(data: ExportData): string {
  const lines: string[] = [];
  lines.push('Halfpast Export');
  lines.push(`Generated,${new Date().toISOString()}`);
  lines.push('');

  lines.push('STACK');
  lines.push(csvRow(['Name', 'Category', 'Expires']));
  for (const item of data.stack) {
    lines.push(csvRow([item.glossary.name, item.glossary.category, item.expires_on]));
  }
  lines.push('');

  lines.push('DOSE HISTORY');
  lines.push(csvRow(['Date', 'Time', 'Name', 'Amount', 'Taken', 'Injection Site', 'Notes']));
  for (const d of data.doses) {
    lines.push(
      csvRow([d.log_date, d.scheduled_time, d.name, d.amount, d.taken ? 'Yes' : 'No', d.injection_site, d.notes]),
    );
  }
  lines.push('');

  lines.push('PROGRESS NOTES');
  lines.push(csvRow(['Date', 'Measurement', 'Note']));
  for (const n of data.notes) {
    lines.push(csvRow([n.note_date, n.measurement, n.text_note]));
  }

  return lines.join('\n');
}

export function buildPDF(data: ExportData): jsPDF {
  const doc = new jsPDF();
  const marginX = 14;
  let y = 18;

  doc.setFontSize(18);
  doc.text('Halfpast Export', marginX, y);
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, marginX, y);
  doc.setTextColor(0);
  y += 12;

  const ensureRoom = (needed = 6) => {
    if (y > 297 - needed) {
      doc.addPage();
      y = 18;
    }
  };

  const addSectionTitle = (title: string) => {
    ensureRoom(14);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(title, marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    y += 8;
  };

  const addLine = (text: string) => {
    ensureRoom();
    const wrapped = doc.splitTextToSize(text, 180);
    doc.text(wrapped, marginX, y);
    y += 5 * wrapped.length + 1;
  };

  addSectionTitle('Stack');
  if (data.stack.length === 0) addLine('Nothing in stack.');
  for (const item of data.stack) {
    addLine(
      `${item.glossary.name} — ${item.glossary.category}${item.expires_on ? ` — expires ${item.expires_on}` : ''}`,
    );
  }
  y += 6;

  addSectionTitle('Dose History');
  if (data.doses.length === 0) addLine('No doses logged.');
  for (const d of data.doses) {
    const time = d.scheduled_time ? ` ${d.scheduled_time.slice(0, 5)}` : '';
    const site = d.injection_site ? ` · ${d.injection_site}` : '';
    addLine(`${d.log_date}${time} — ${d.name}, ${d.amount}${site} — ${d.taken ? 'Taken' : 'Not taken'}`);
  }
  y += 6;

  addSectionTitle('Progress Notes');
  if (data.notes.length === 0) addLine('No notes.');
  for (const n of data.notes) {
    const meas = n.measurement ? `${n.measurement} — ` : '';
    addLine(`${n.note_date} — ${meas}${n.text_note ?? ''}`);
  }

  return doc;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Web (dev server, desktop preview): a plain browser download — reliable and
 * directly testable. Native iOS: WKWebView blob downloads don't reach the
 * Files app on their own, so the file is written to cache and handed to the
 * native share sheet, where the user picks Save to Files / AirDrop / Mail.
 */
async function saveOrShare(filename: string, blob: Blob): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const base64 = await blobToBase64(blob);
    const written = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
    await Share.share({ title: filename, files: [written.uri] });
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}

export async function exportCSV(userId: string): Promise<void> {
  const data = await gatherExportData(userId);
  const csv = buildCSV(data);
  await saveOrShare(`halfpast-export-${toISODate(new Date())}.csv`, new Blob([csv], { type: 'text/csv' }));
}

export async function exportPDF(userId: string): Promise<void> {
  const data = await gatherExportData(userId);
  const doc = buildPDF(data);
  await saveOrShare(`halfpast-export-${toISODate(new Date())}.pdf`, doc.output('blob'));
}

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type {
  CsvRawRow, CsvParsedRow, ColumnMapping, CsvImportField,
} from '../types/csvImport';
import { MAX_IMPORT_ROWS } from '../types/csvImport';

// ─── File type detection ──────────────────────────────────────────────────────

export type SupportedFileType = 'csv' | 'xlsx';

export function getFileType(file: File): SupportedFileType | null {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv'))                             return 'csv';
  if (name.endsWith('.xlsx') || name.endsWith('.xls'))   return 'xlsx';
  return null;
}

export const ACCEPTED_EXTENSIONS = '.csv,.xlsx,.xls';
export const ACCEPTED_LABEL      = '.csv or .xlsx';

// ─── Parsing ──────────────────────────────────────────────────────────────────

export interface ParseResult {
  headers:   string[];
  rows:      CsvRawRow[];
  fileType?: SupportedFileType;
  error?:    string;
}

function parseCsv(file: File): Promise<ParseResult> {
  return new Promise(resolve => {
    Papa.parse<CsvRawRow>(file, {
      header:         true,
      skipEmptyLines: true,
      trimHeaders:    true,
      transform:      (val: string) => val.trim(),
      complete: result => {
        if (result.errors.length && result.data.length === 0) {
          resolve({ headers: [], rows: [], error: 'Could not parse CSV file. Please check the format.' });
          return;
        }
        const headers = result.meta.fields ?? [];
        if (headers.length === 0) {
          resolve({ headers: [], rows: [], error: 'No column headers found. The first row must contain column names.' });
          return;
        }
        resolve({ headers, rows: result.data as CsvRawRow[], fileType: 'csv' });
      },
      error: err => {
        resolve({ headers: [], rows: [], error: err.message });
      },
    });
  });
}

function parseXlsx(file: File): Promise<ParseResult> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data     = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          resolve({ headers: [], rows: [], error: 'The Excel file contains no sheets.' });
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: '',
          raw:    false,
        });

        if (jsonRows.length === 0) {
          resolve({ headers: [], rows: [], error: 'The Excel sheet is empty.' });
          return;
        }

        const headers = Object.keys(jsonRows[0]).map(h => h.trim()).filter(Boolean);
        if (headers.length === 0) {
          resolve({ headers: [], rows: [], error: 'No column headers found in the Excel file.' });
          return;
        }

        const rows: CsvRawRow[] = jsonRows.map(r => {
          const out: CsvRawRow = {};
          for (const h of headers) {
            const raw = r[h];
            if (raw instanceof Date) {
              out[h] = raw.toISOString().split('T')[0];
            } else {
              out[h] = String(raw ?? '').trim();
            }
          }
          return out;
        });

        resolve({ headers, rows, fileType: 'xlsx' });
      } catch (err) {
        resolve({
          headers: [],
          rows:    [],
          error:   `Could not read Excel file: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    };
    reader.onerror = () => resolve({ headers: [], rows: [], error: 'Failed to read file.' });
    reader.readAsArrayBuffer(file);
  });
}

export async function parseImportFile(file: File): Promise<ParseResult> {
  const type = getFileType(file);
  if (!type) {
    return { headers: [], rows: [], error: 'Unsupported file type. Please upload a .csv or .xlsx file.' };
  }
  return type === 'xlsx' ? parseXlsx(file) : parseCsv(file);
}

// ─── Auto-mapping ─────────────────────────────────────────────────────────────

const FIELD_ALIASES: Record<CsvImportField, string[]> = {
  date:   ['date', 'Date', 'DATE', 'payment_date', 'invoice_date', 'paid_date', 'when'],
  source: ['source', 'Source', 'SOURCE', 'client', 'Client', 'description', 'Description', 'from', 'name', 'Name'],
  amount: ['amount', 'Amount', 'AMOUNT', 'total', 'Total', 'value', 'Value', 'sum', 'payment', 'Payment'],
  notes:  ['notes', 'Notes', 'NOTES', 'note', 'Note', 'description', 'memo', 'Memo', 'details', 'Details'],
};

export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = { date: '', source: '', amount: '', notes: '' };
  const used = new Set<string>();
  for (const field of ['date', 'source', 'amount', 'notes'] as CsvImportField[]) {
    for (const alias of FIELD_ALIASES[field]) {
      const match = headers.find(h => h === alias || h.toLowerCase() === alias.toLowerCase());
      if (match && !used.has(match)) {
        mapping[field] = match;
        used.add(match);
        break;
      }
    }
  }
  return mapping;
}

// ─── Date parsing ─────────────────────────────────────────────────────────────

export function parseDate(raw: string): string | null {
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(raw + 'T00:00:00');
    return isNaN(d.getTime()) ? null : raw;
  }

  const dmy = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    const date = new Date(iso + 'T00:00:00');
    return isNaN(date.getTime()) ? null : iso;
  }

  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return null;
}

// ─── Row validation ───────────────────────────────────────────────────────────

function dupKey(source: string, amount: string, date: string): string {
  return `${source.toLowerCase().trim()}|${amount.trim()}|${date.trim()}`;
}

export function validateAndTransformRows(
  raw:     CsvRawRow[],
  mapping: ColumnMapping,
): { rows: CsvParsedRow[]; validCount: number; errorCount: number; tooLarge: boolean } {
  const tooLarge = raw.length > MAX_IMPORT_ROWS;
  const slice    = tooLarge ? raw.slice(0, MAX_IMPORT_ROWS) : raw;

  const keyCount: Record<string, number> = {};
  for (const r of slice) {
    const k = dupKey(r[mapping.source] ?? '', r[mapping.amount] ?? '', r[mapping.date] ?? '');
    keyCount[k] = (keyCount[k] ?? 0) + 1;
  }

  let validCount = 0;
  let errorCount = 0;

  const rows: CsvParsedRow[] = slice.map((r, i) => {
    const rawDate   = mapping.date   ? (r[mapping.date]   ?? '').trim() : '';
    const rawSource = mapping.source ? (r[mapping.source] ?? '').trim() : '';
    const rawAmount = mapping.amount ? (r[mapping.amount] ?? '').trim() : '';
    const rawNotes  = mapping.notes  ? (r[mapping.notes]  ?? '').trim() : '';

    const errors: string[] = [];

    const parsedDate = parseDate(rawDate);
    if (!rawDate) errors.push('Date is required');
    else if (!parsedDate) errors.push(`Unrecognised date format: "${rawDate}"`);

    if (!rawSource) errors.push('Source is required');

    const amountNum = parseFloat(rawAmount.replace(/[£$€,\s]/g, ''));
    if (!rawAmount) errors.push('Amount is required');
    else if (isNaN(amountNum)) errors.push(`Amount is not a number: "${rawAmount}"`);
    else if (amountNum <= 0)   errors.push('Amount must be greater than 0');

    const valid       = errors.length === 0;
    const isDuplicate = keyCount[dupKey(rawSource, rawAmount, rawDate)] > 1;

    if (valid) validCount++;
    else       errorCount++;

    return {
      _rowIndex: i + 1,
      date:    rawDate,
      source:  rawSource,
      amount:  rawAmount,
      notes:   rawNotes,
      valid,
      errors,
      isDuplicate,
      parsedDate:   parsedDate ?? undefined,
      parsedAmount: valid ? amountNum : undefined,
    };
  });

  return { rows, validCount, errorCount, tooLarge };
}

// ─── Template download ────────────────────────────────────────────────────────

export function downloadCsvTemplate(): void {
  const header = 'Date,Source,Amount,Notes';
  const rows = [
    '2026-01-05,Client Payment,1500,Website redesign',
    '2026-02-01,Retainer Client,1200,Monthly retainer',
    '2026-02-15,Consulting,800,Strategy session',
  ];
  const csv  = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'spendable-income-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

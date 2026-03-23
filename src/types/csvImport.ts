// ─── CSV Import Types ─────────────────────────────────────────────────────────

export type CsvImportField = 'date' | 'source' | 'amount' | 'notes';

export const CSV_IMPORT_FIELDS: CsvImportField[] = ['date', 'source', 'amount', 'notes'];

export const CSV_FIELD_LABELS: Record<CsvImportField, string> = {
  date:   'Date',
  source: 'Source',
  amount: 'Amount',
  notes:  'Notes',
};

/** A single raw row from the CSV (string values from PapaParse) */
export interface CsvRawRow {
  [column: string]: string;
}

/** A row that has been mapped + validated, ready for preview */
export interface CsvParsedRow {
  _rowIndex: number;          // 1-based row number for display
  date:      string;          // raw mapped value
  source:    string;          // raw mapped value
  amount:    string;          // raw mapped value
  notes:     string;          // raw mapped value
  // validation results
  valid:       boolean;
  errors:      string[];
  isDuplicate: boolean;
  // normalised values (set when valid)
  parsedDate?:   string;      // ISO date YYYY-MM-DD
  parsedAmount?: number;
}

/** What we insert into Supabase */
export interface CsvIncomeInsert {
  user_id: string;
  date:    string;
  source:  string;
  amount:  number;
  notes:   string;
}

export type ColumnMapping = Record<CsvImportField, string>; // field → csv header name

export type ImportStep =
  | 'upload'    // drag/drop or file picker
  | 'mapping'   // map CSV headers to fields
  | 'preview'   // preview + validation
  | 'importing' // in-flight
  | 'done';     // success

export const MAX_IMPORT_ROWS = 500;

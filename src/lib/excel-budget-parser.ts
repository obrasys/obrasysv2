import * as XLSX from 'xlsx';

export interface RawExcelRow {
  [key: string]: string | number | null;
}

export interface ParsedExcelData {
  sheetName: string;
  headers: string[];
  rows: RawExcelRow[];
}

/**
 * Parse an Excel or CSV file and return raw rows without assuming structure.
 * The AI will later organize these rows into chapters and articles.
 */
export async function parseExcelFile(file: File): Promise<ParsedExcelData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error('Ficheiro vazio ou sem folhas de cálculo.');
  }

  // Convert to JSON with raw headers
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
  });

  if (!rawData.length) {
    throw new Error('A folha de cálculo não contém dados.');
  }

  // Limit to 500 rows
  const limitedData = rawData.slice(0, 500);

  // Extract headers from first row keys
  const headers = Object.keys(limitedData[0]);

  // Normalize rows
  const rows: RawExcelRow[] = limitedData.map((row) => {
    const normalized: RawExcelRow = {};
    for (const key of headers) {
      const val = row[key];
      if (val === undefined || val === null || val === '') {
        normalized[key] = null;
      } else if (typeof val === 'number') {
        normalized[key] = val;
      } else {
        normalized[key] = String(val).trim();
      }
    }
    return normalized;
  });

  return {
    sheetName,
    headers,
    rows,
  };
}

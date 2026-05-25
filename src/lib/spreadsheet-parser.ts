// Unified spreadsheet parser: supports CSV and XLSX.
// Auto-detects the header row even when the file has extra metadata rows on top
// (e.g. title/obra/group headers above the actual column titles).

import * as XLSX from 'xlsx';
import { parseCSV, detectDelimiter, type ParsedCSV } from './csv-parser';

const HEADER_KEYWORDS = [
  'nome', 'name', 'empresa', 'company', 'razao', 'razão',
  'email', 'e-mail', 'mail',
  'telefone', 'telemovel', 'telemóvel', 'phone', 'tel', 'tlm', 'tlf',
  'contacto', 'contato', 'contact',
  'nif', 'contribuinte', 'vat',
  'morada', 'endereco', 'endereço', 'address',
  'codigo postal', 'código postal', 'cp', 'zip',
  'cidade', 'localidade', 'city',
  'pais', 'país', 'country',
  'especialidade', 'categoria', 'observ', 'notas', 'notes',
  'responsavel', 'responsável',
];

function looksLikeHeaderCell(v: unknown): boolean {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  if (!s || s.length > 40) return false;
  return HEADER_KEYWORDS.some(k => s.includes(k));
}

function scoreRowAsHeader(row: unknown[]): number {
  let kw = 0;
  let strs = 0;
  for (const cell of row) {
    if (cell == null) continue;
    const s = String(cell).trim();
    if (!s) continue;
    strs++;
    if (looksLikeHeaderCell(s)) kw += 3;
  }
  return kw + Math.min(strs, 8);
}

/**
 * Convert a 2D matrix (rows of cells) into a ParsedCSV by auto-detecting the
 * header row within the first N rows. Empty/unnamed columns get synthetic names.
 */
export function matrixToParsedCSV(matrix: unknown[][]): ParsedCSV {
  if (!matrix.length) return { headers: [], rows: [], rawData: [] };

  const scanLimit = Math.min(matrix.length, 20);
  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < scanLimit; i++) {
    const score = scoreRowAsHeader(matrix[i] || []);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  const rawHeaders = matrix[bestIdx] || [];
  // Determine max column width across header + a few data rows
  let maxCols = rawHeaders.length;
  for (let i = bestIdx; i < Math.min(matrix.length, bestIdx + 50); i++) {
    maxCols = Math.max(maxCols, (matrix[i] || []).length);
  }

  const usedNames = new Set<string>();
  const headers: string[] = [];
  for (let c = 0; c < maxCols; c++) {
    let name = String(rawHeaders[c] ?? '').trim();
    if (!name) name = `Coluna ${c + 1}`;
    let unique = name;
    let n = 2;
    while (usedNames.has(unique)) unique = `${name} (${n++})`;
    usedNames.add(unique);
    headers.push(unique);
  }

  const rows: string[][] = [];
  const rawData: Record<string, string>[] = [];
  for (let i = bestIdx + 1; i < matrix.length; i++) {
    const row = matrix[i] || [];
    // Skip fully-empty rows
    if (!row.some(v => v != null && String(v).trim() !== '')) continue;
    const stringRow: string[] = [];
    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const val = row[c];
      const s = val == null ? '' : String(val).trim();
      stringRow.push(s);
      obj[headers[c]] = s;
    }
    rows.push(stringRow);
    rawData.push(obj);
  }

  return { headers, rows, rawData };
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedCSV> {
  const name = file.name.toLowerCase();
  const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls') ||
    file.type.includes('spreadsheetml') || file.type.includes('ms-excel');

  if (isExcel) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    // Pick the first non-empty sheet
    let matrix: unknown[][] = [];
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: '',
        blankrows: false,
        raw: false,
      });
      if (data.length) {
        matrix = data;
        break;
      }
    }
    return matrixToParsedCSV(matrix);
  }

  // CSV / TXT
  const content = await file.text();
  const delimiter = detectDelimiter(content);
  const parsed = parseCSV(content, { delimiter });
  // Also run header-detection on CSV in case the user's CSV has metadata rows
  if (parsed.headers.length && parsed.rawData.length) {
    const matrix: unknown[][] = [parsed.headers, ...parsed.rows];
    const reparsed = matrixToParsedCSV(matrix);
    // If detector found a better row than row 0, use it
    if (reparsed.headers.join('|') !== parsed.headers.join('|')) {
      return reparsed;
    }
  }
  return parsed;
}

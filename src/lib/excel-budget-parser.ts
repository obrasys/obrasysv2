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
 * Detect the actual header row in a sheet by looking for known column names
 * common in Portuguese construction specs (cadernos de encargos / mapas de quantidades).
 * Returns null when no reliable header row is found so we can preserve all rows.
 */
function detectHeaderRow(sheet: XLSX.WorkSheet): number | null {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const knownHeaders = [
    'designação', 'descrição', 'descricao', 'designacao',
    'item', 'artigo', 'un', 'unidade', 'quant', 'quantidade',
    'preço', 'preco', 'valor', 'spu', 'esp',
  ];

  // Scan first 20 rows to find the header
  const maxScan = Math.min(range.e.r, 20);
  for (let r = range.s.r; r <= maxScan; r++) {
    let matchCount = 0;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (cell && cell.v) {
        const val = String(cell.v).toLowerCase().trim();
        if (knownHeaders.some(h => val.includes(h))) {
          matchCount++;
        }
      }
    }
    // If we find 2+ known headers in a row, that's likely the header row
    if (matchCount >= 2) {
      return r;
    }
  }
  return null;
}

/**
 * Parse an Excel or CSV file and return raw rows without assuming structure.
 * Enhanced to detect header rows and handle complex construction spec formats.
 */
export async function parseExcelFile(file: File): Promise<ParsedExcelData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error('Ficheiro vazio ou sem folhas de cálculo.');
  }

  // Detect the actual header row
  const headerRowIndex = detectHeaderRow(sheet);
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const hasDetectedHeader = headerRowIndex !== null;
  const detectedHeaderRow = headerRowIndex ?? range.s.r;
  const firstDataRow = hasDetectedHeader ? detectedHeaderRow + 1 : range.s.r;

  // Extract headers from the detected row, or synthesize generic headers when the
  // worksheet is pure tabular data without an explicit header row.
  const headers: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    if (hasDetectedHeader) {
      const cell = sheet[XLSX.utils.encode_cell({ r: detectedHeaderRow, c })];
      if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== '') {
        headers.push(String(cell.v).trim());
      } else {
        headers.push(`Col_${c + 1}`);
      }
    } else {
      headers.push(`Col_${c + 1}`);
    }
  }

  // Extract all rows after the header, up to 5000
  const rows: RawExcelRow[] = [];
  const maxRows = Math.min(range.e.r, firstDataRow + 4999);

  for (let r = firstDataRow; r <= maxRows; r++) {
    const row: RawExcelRow = {};
    let hasData = false;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const headerIdx = c - range.s.c;
      const header = headerIdx < headers.length ? headers[headerIdx] : `Col_${c + 1}`;
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];

      if (cell && cell.v !== undefined && cell.v !== null) {
        if (typeof cell.v === 'number') {
          row[header] = cell.v;
        } else {
          const strVal = String(cell.v).trim();
          if (strVal !== '') {
            row[header] = strVal;
            hasData = true;
          } else {
            row[header] = null;
          }
        }
        if (typeof cell.v === 'number') hasData = true;
      } else {
        row[header] = null;
      }
    }

    // Only add rows that have at least some data
    if (hasData) {
      rows.push(row);
    }
  }

  if (!rows.length) {
    throw new Error('A folha de cálculo não contém dados.');
  }

  return {
    sheetName,
    headers,
    rows,
  };
}

/**
 * Convert parsed Excel data to a structured text format optimized for AI analysis.
 * Preserves column alignment and filters out completely empty rows.
 */
export function excelDataToStructuredText(data: ParsedExcelData): string {
  const lines: string[] = [];
  lines.push(`=== Folha: ${data.sheetName} ===`);
  lines.push(`Colunas: ${data.headers.join(' | ')}`);
  lines.push('─'.repeat(80));

  for (let i = 0; i < data.rows.length; i++) {
    const row = data.rows[i];
    const values = data.headers.map(h => {
      const v = row[h];
      if (v === null || v === undefined) return '';
      return String(v);
    });

    // Skip rows where all values are empty or just "0.00 €"
    const meaningful = values.filter(v => 
      v.trim() !== '' && v.trim() !== '0.00 €' && v.trim() !== '0.00'
    );
    if (meaningful.length === 0) continue;

    lines.push(`[${i + 1}] ${values.join(' | ')}`);
  }

  return lines.join('\n');
}
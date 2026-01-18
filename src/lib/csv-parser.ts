// CSV Parser utility

export interface ParsedCSV {
  headers: string[];
  rows: string[][];
  rawData: Record<string, string>[];
}

export interface CSVParseOptions {
  delimiter?: string;
  skipEmptyLines?: boolean;
}

export function parseCSV(content: string, options: CSVParseOptions = {}): ParsedCSV {
  const { delimiter = ',', skipEmptyLines = true } = options;
  
  const lines = content.split(/\r?\n/);
  
  if (lines.length === 0) {
    return { headers: [], rows: [], rawData: [] };
  }

  // Parse header
  const headers = parseCSVLine(lines[0], delimiter);
  
  // Parse data rows
  const rows: string[][] = [];
  const rawData: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (skipEmptyLines && line === '') {
      continue;
    }

    const values = parseCSVLine(line, delimiter);
    rows.push(values);

    // Create object with headers as keys
    const rowObj: Record<string, string> = {};
    headers.forEach((header, index) => {
      rowObj[header] = values[index] || '';
    });
    rawData.push(rowObj);
  }

  return { headers, rows, rawData };
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current.trim());
  return result;
}

export function detectDelimiter(content: string): string {
  const firstLine = content.split(/\r?\n/)[0] || '';
  
  const delimiters = [',', ';', '\t', '|'];
  let maxCount = 0;
  let detected = ',';

  for (const d of delimiters) {
    const count = (firstLine.match(new RegExp(d === '|' ? '\\|' : d, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      detected = d;
    }
  }

  return detected;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  validRows: number;
  invalidRows: number;
}

export function validateClientData(
  data: Record<string, string>[],
  mapping: Record<string, string>
): ValidationResult {
  const errors: ValidationError[] = [];
  let validRows = 0;
  let invalidRows = 0;

  data.forEach((row, index) => {
    let rowValid = true;
    const rowNumber = index + 2; // +2 because of header and 0-index

    // Check required field: nome
    const nomeColumn = Object.keys(mapping).find(k => mapping[k] === 'nome');
    if (nomeColumn) {
      const nome = row[nomeColumn]?.trim();
      if (!nome) {
        errors.push({
          row: rowNumber,
          field: 'nome',
          message: 'Nome é obrigatório',
          value: nome || '',
        });
        rowValid = false;
      }
    } else {
      errors.push({
        row: rowNumber,
        field: 'nome',
        message: 'Campo nome não mapeado',
        value: '',
      });
      rowValid = false;
    }

    // Validate email format if provided
    const emailColumn = Object.keys(mapping).find(k => mapping[k] === 'email');
    if (emailColumn) {
      const email = row[emailColumn]?.trim();
      if (email && !isValidEmail(email)) {
        errors.push({
          row: rowNumber,
          field: 'email',
          message: 'Email inválido',
          value: email,
        });
        rowValid = false;
      }
    }

    // Validate NIF format if provided (Portuguese NIF: 9 digits)
    const nifColumn = Object.keys(mapping).find(k => mapping[k] === 'nif');
    if (nifColumn) {
      const nif = row[nifColumn]?.trim();
      if (nif && !isValidNIF(nif)) {
        errors.push({
          row: rowNumber,
          field: 'nif',
          message: 'NIF deve ter 9 dígitos',
          value: nif,
        });
        // NIF validation is a warning, not a blocker
      }
    }

    if (rowValid) {
      validRows++;
    } else {
      invalidRows++;
    }
  });

  return {
    isValid: invalidRows === 0,
    errors,
    validRows,
    invalidRows,
  };
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidNIF(nif: string): boolean {
  const nifClean = nif.replace(/\D/g, '');
  return nifClean.length === 9;
}

export function mapRowToClient(
  row: Record<string, string>,
  mapping: Record<string, string>
): Record<string, string | undefined> {
  const client: Record<string, string | undefined> = {};

  Object.entries(mapping).forEach(([csvColumn, clientField]) => {
    if (clientField && clientField !== 'ignore') {
      const value = row[csvColumn]?.trim();
      if (value) {
        client[clientField] = value;
      }
    }
  });

  return client;
}

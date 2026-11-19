export interface CsvRecord {
  /** 1-based line in the source text where this record starts */
  line: number;
  fields: string[];
}

/**
 * Parses CSV text into records, keeping track of the line each record starts
 * on. Supports quoted fields, escaped quotes (""), commas and line breaks
 * inside quotes, and both LF and CRLF line endings. A UTF-8 byte order mark
 * at the start is ignored, and a final line break does not produce an extra
 * empty record.
 */
export function parseCsvRecords(text: string): CsvRecord[] {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const records: CsvRecord[] = [];

  let fields: string[] = [];
  let field = "";
  let inQuotes = false;
  let line = 1;
  let recordLine = 1;
  let recordStart = 0;
  let i = 0;

  const endField = () => {
    fields.push(field);
    field = "";
  };
  const endRecord = () => {
    endField();
    records.push({ line: recordLine, fields });
    fields = [];
  };

  while (i < input.length) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      if (ch === "\n") line += 1;
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
    } else if (ch === ",") {
      endField();
      i += 1;
    } else if (ch === "\r" || ch === "\n") {
      endRecord();
      i += ch === "\r" && input[i + 1] === "\n" ? 2 : 1;
      line += 1;
      recordLine = line;
      recordStart = i;
    } else {
      field += ch;
      i += 1;
    }
  }

  if (i > recordStart) {
    endRecord();
  }

  return records;
}

export function parseCsv(text: string): string[][] {
  return parseCsvRecords(text).map((record) => record.fields);
}

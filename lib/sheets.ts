export interface UserData {
  date: string; // YYYY-MM-DD or Day Name
  earlyMeeting: boolean;
  gasLevel: number; // 0-100
  budgetMode: boolean; // boolean
  urgency: number; // 1-10
  origin: string;
  destination: string;
}

export async function fetchSheetData(sheetUrl: string): Promise<UserData[] | null> {
  if (!sheetUrl) return null;

  try {
    const response = await fetch(sheetUrl, { cache: 'no-store' });
    if (!response.ok) {
      console.error("Failed to fetch sheet", response.statusText);
      return null;
    }

    const text = await response.text();
    return parseCSV(text);
  } catch (error) {
    console.error("Error parsing sheet data:", error);
    return null;
  }
}

function parseCSV(csvText: string): UserData[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');

  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

  // Parse all data rows
  const dataRows: UserData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parseLine = (line: string) => {
      const result = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      return result;
    };

    const values = parseLine(lines[i]);
    if (values.length === 0) continue;

    const rawData: any = {};
    headers.forEach((header, index) => {
      rawData[header] = values[index] || "";
    });

    const getVal = (keys: string[]) => {
      for (const key of keys) {
        if (rawData[key] !== undefined) return rawData[key];
      }
      return undefined;
    };

    dataRows.push({
      date: getVal(['date', 'day']) || `Row ${i}`,
      earlyMeeting: parseBoolean(getVal(['early meeting', 'early_meeting', 'meeting', 'early'])),
      gasLevel: parseNumber(getVal(['gas level', 'gas_level', 'gas']), 0, 100, 100),
      budgetMode: parseBoolean(getVal(['budget mode', 'budget_mode', 'budget'])),
      urgency: parseNumber(getVal(['urgency', 'urgent', 'time to leave']), 1, 10, 1),
      origin: getVal(['origin', 'start', 'from']) || "",
      destination: getVal(['destination', 'end', 'to']) || "",
    });
  }

  return dataRows;
}

function parseNumber(value: string | undefined, min: number, max: number, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.toLowerCase();
  return v === 'true' || v === 'yes' || v === '1';
}

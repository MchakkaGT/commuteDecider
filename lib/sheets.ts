export interface UserData {
  laziness: number; // 1-10
  gasLevel: number; // 0-100
  budgetMode: boolean; // boolean
  urgency: number; // 1-10
  origin: string;
  destination: string;
}

export async function fetchSheetData(sheetUrl: string): Promise<UserData | null> {
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

function parseCSV(csvText: string): UserData {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');

  // Default values
  const defaultData: UserData = {
    laziness: 0,
    gasLevel: 100,
    budgetMode: false,
    urgency: 0,
    origin: "",
    destination: ""
  };

  if (lines.length < 2) return defaultData;

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  // Handle commas inside quoted strings for addresses
  // Basic regex to split by comma ONLY if not in quotes
  const parseLine = (line: string) => {
    const match = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
    return match ? match.map(v => v.trim().replace(/^"|"$/g, '').replace(/""/g, '"')) : [];
  };

  const values = parseLine(lines[1]);

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

  return {
    laziness: parseNumber(getVal(['laziness', 'lazy']), 1, 10, 5),
    gasLevel: parseNumber(getVal(['gas level', 'gas_level', 'gas']), 0, 100, 100),
    budgetMode: parseBoolean(getVal(['budget mode', 'budget_mode', 'budget'])),
    urgency: parseNumber(getVal(['urgency', 'urgent', 'time to leave']), 1, 10, 1),
    origin: getVal(['origin', 'start', 'from']) || "",
    destination: getVal(['destination', 'end', 'to']) || "",
  };
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

export interface UserData {
  laziness: number; // 1-10
  gasLevel: number; // 0-100
  budgetMode: boolean; // boolean
  urgency: number; // 1-10
}

export async function fetchSheetData(sheetUrl: string): Promise<UserData | null> {
  if (!sheetUrl) return null;

  try {
    // Ensure we are fetching the CSV version if the user just pasted the main link?
    // Actually, for "Publish to web", the link is usually specific. 
    // We will assume the user provides the correct CSV link or we might try to construct it?
    // For now, assume correct link provided by user (User Responsibility stated in plan).
    
    const response = await fetch(sheetUrl, { cache: 'no-store' }); // Don't cache for real-time feel
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
    urgency: 0
  };

  if (lines.length < 2) return defaultData;

  // Simple parser handling comma separation
  // NOTE: This assumes a simple structure without commas IN the values.
  // Ideally, use a library like 'papaparse' but for a simple "Publish to Web" sheet, this usually suffices.
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const values = lines[1].split(',').map(v => v.trim().replace(/"/g, ''));

  const rawData: any = {};
  
  headers.forEach((header, index) => {
    rawData[header] = values[index];
  });

  // Map flexible header names to our schema
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

export interface Coordinates {
    lat: number;
    lon: number;
    displayName: string;
}

// Simple in-memory cache to avoid hitting Nominatim too hard
const cache: Record<string, Coordinates> = {};

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
    if (!address) return null;

    // Check cache
    const key = address.toLowerCase().trim();
    if (cache[key]) return cache[key];

    try {
        const params = new URLSearchParams({
            q: address,
            format: 'json',
            limit: '1'
        });

        // Nominatim requires a User-Agent
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
            headers: {
                'User-Agent': 'SmartCommuteDecider/1.0'
            }
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (data && data.length > 0) {
            const result = data[0];
            const coords: Coordinates = {
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
                displayName: result.display_name.split(',')[0] // Attempt to get just the place name
            };

            cache[key] = coords;
            return coords;
        }
        return null;

    } catch (error) {
        console.error("Geocoding error:", error);
        return null;
    }
}

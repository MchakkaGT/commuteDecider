export interface WeatherData {
    temperature: number; // Celsius
    isRaining: boolean;
    isSnowing: boolean;
    windSpeed: number; // km/h
    precipitation: number; // mm
    cityName: string;
}

// Default to San Francisco for demo purposes if no coords provided
// 37.7749° N, 122.4194° W
const DEFAULT_LAT = 37.7749;
const DEFAULT_LON = -122.4194;

export async function fetchWeatherData(lat: number = DEFAULT_LAT, lon: number = DEFAULT_LON): Promise<WeatherData | null> {
    try {
        const params = new URLSearchParams({
            latitude: lat.toString(),
            longitude: lon.toString(),
            current: 'temperature_2m,precipitation,rain,showers,snowfall,wind_speed_10m',
            timezone: 'auto'
        });

        // Parallel fetch for weather and location name
        const [weatherRes, cityRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, { next: { revalidate: 300 } }),
            fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`)
        ]);

        if (!weatherRes.ok) {
            console.error('Weather API error:', weatherRes.statusText);
            return null;
        }

        const json = await weatherRes.json();
        const current = json.current;

        let cityName = "Unknown Location";
        if (cityRes.ok) {
            const cityJson = await cityRes.json();
            cityName = cityJson.city || cityJson.locality || cityJson.principalSubdivision || "Unknown Location";
        }

        const isRaining = (current.rain > 0 || current.showers > 0);
        const isSnowing = (current.snowfall > 0);

        return {
            temperature: current.temperature_2m,
            isRaining,
            isSnowing,
            windSpeed: current.wind_speed_10m,
            precipitation: current.precipitation,
            cityName
        };
    } catch (error) {
        console.error('Error fetching weather:', error);
        return null;
    }
}

export interface WeatherData {
    temperature: number; // Celsius
    isRaining: boolean;
    isSnowing: boolean;
    windSpeed: number; // km/h
    precipitation: number; // mm
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

        const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

        const response = await fetch(url, { next: { revalidate: 300 } }); // Cache for 5 mins

        if (!response.ok) {
            console.error('Weather API error:', response.statusText);
            return null;
        }

        const json = await response.json();
        const current = json.current;

        const isRaining = (current.rain > 0 || current.showers > 0);
        const isSnowing = (current.snowfall > 0);

        return {
            temperature: current.temperature_2m,
            isRaining,
            isSnowing,
            windSpeed: current.wind_speed_10m,
            precipitation: current.precipitation
        };
    } catch (error) {
        console.error('Error fetching weather:', error);
        return null;
    }
}

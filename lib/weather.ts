export interface WeatherData {
    temperature: number; // Celsius
    isRaining: boolean;
    isSnowing: boolean;
    windSpeed: number; // km/h
    precipitation: number; // mm
    cityName: string;
    date: string; // YYYY-MM-DD
}

// Map of date string to weather data
export type WeatherForecastMap = Record<string, WeatherData>;

export async function fetchWeatherForecast(lat?: number, lon?: number): Promise<WeatherForecastMap | null> {
    if (lat === undefined || lon === undefined) return null;
    try {
        const params = new URLSearchParams({
            latitude: lat.toString(),
            longitude: lon.toString(),
            daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,showers_sum,snowfall_sum,wind_speed_10m_max',
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
        const daily = json.daily;

        let cityName = "Unknown Location";
        if (cityRes.ok) {
            const cityJson = await cityRes.json();
            cityName = cityJson.city || cityJson.locality || cityJson.principalSubdivision || "Unknown Location";
        }

        const forecastMap: WeatherForecastMap = {};

        // Loop through daily data
        for (let i = 0; i < daily.time.length; i++) {
            const date = daily.time[i];
            const maxTemp = daily.temperature_2m_max[i];
            const minTemp = daily.temperature_2m_min[i];
            // Average temp for the day roughly
            const avgTemp = (maxTemp + minTemp) / 2;

            const precipSum = daily.precipitation_sum[i];
            const rainSum = daily.rain_sum[i];
            const showerSum = daily.showers_sum[i];
            const snowSum = daily.snowfall_sum[i];
            const windMax = daily.wind_speed_10m_max[i];

            const isRaining = (rainSum > 0 || showerSum > 0);
            const isSnowing = (snowSum > 0);

            forecastMap[date] = {
                temperature: avgTemp,
                isRaining,
                isSnowing,
                windSpeed: windMax,
                precipitation: precipSum,
                cityName,
                date
            };
        }

        return forecastMap;
    } catch (error) {
        console.error('Error fetching weather:', error);
        return null;
    }
}

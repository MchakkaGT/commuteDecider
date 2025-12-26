```typescript
import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetData, UserData } from '@/lib/sheets';
import { fetchWeatherForecast, WeatherData } from '@/lib/weather';
import { makeDecision, Recommendation } from '@/lib/decisionEngine';
import { geocodeAddress } from '@/lib/geocoding';
import { getCommuteTimes, CommuteTimes } from '@/lib/routing';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const sheetUrl = searchParams.get('sheetUrl');

    if (!sheetUrl) {
        return NextResponse.json({ error: 'Missing sheetUrl parameter' }, { status: 400 });
    }

    // 1. Fetch Sheet Data (All Rows)
    const userDataList = await fetchSheetData(sheetUrl);

    if (!userDataList || userDataList.length === 0) {
        return NextResponse.json({ error: 'Failed to fetch user data from Sheet or Sheet is empty' }, { status: 500 });
    }

    // 2. Fetch Geocoding & Weather (Using Coordinates of first row's origin or browser params)
    let lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined;
    let lon = searchParams.get('lon') ? parseFloat(searchParams.get('lon')!) : undefined;

    // We assume Origin/Dest is mostly constant, or we just look at the first row to determine "Home" location for weather
    const firstRow = userDataList[0];
    let originCoords = null;
    let destCoords = null;

    if (firstRow.origin && firstRow.destination) {
        const [o, d] = await Promise.all([
            geocodeAddress(firstRow.origin),
            geocodeAddress(firstRow.destination)
        ]);
        originCoords = o;
        destCoords = d;
        
        if (originCoords) {
             lat = originCoords.lat;
             lon = originCoords.lon;
        }
    }

    const weatherForecast = await fetchWeatherForecast(lat, lon);

    if (!weatherForecast) {
        return NextResponse.json({ error: 'Failed to fetch weather forecast' }, { status: 500 });
    }

    // 3. Fetch Routing (Usually static per user, but could change if we really want, for now assuming 1 route for simplicity of API or just fetch once)
    let commuteTimes: CommuteTimes | undefined;
    if (originCoords && destCoords) {
        commuteTimes = await getCommuteTimes(originCoords, destCoords);
    }
    
    // 4. Process Each Day
    const results = userDataList.map(userData => {
        // Try to match date
        // User date format might vary. Let's try to fuzzy match or just assume YYYY-MM-DD
        // If date is "Monday", we need to map to next Monday? 
        // For simplicity, let's assume the user puts YYYY-MM-DD or we just use the forecast order if they match?
        // Let's look for exact match in forecast map, otherwise fallback to index 0?
        
        let weather: WeatherData | undefined = weatherForecast[userData.date];
        
        // If not found by exact string, try to see if it's a "Monday" etc. 
        if (!weather) {
            // Fallback: Just take today's weather? Or the first available?
             const keys = Object.keys(weatherForecast).sort();
             weather = weatherForecast[keys[0]]; // Default
             
             // Simple day name matching?
             // If userData.date is "Monday", find the date in keys that is a Monday
             const dayMatch = keys.find(k => {
                 const d = new Date(k);
                 const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
                 return dayName.toLowerCase() === userData.date.toLowerCase();
             });
             if (dayMatch) weather = weatherForecast[dayMatch];
        }
        
        if (!weather) return null; // Should not happen if forecast worked

        return {
            userData,
            weather,
            recommendation: makeDecision(userData, weather, commuteTimes)
        };
    }).filter(r => r !== null);

    return NextResponse.json({
        results,
        commuteTimes,
        routes: {
             origin: originCoords?.displayName || firstRow.origin,
             destination: destCoords?.displayName || firstRow.destination
        },
        cityName: Object.values(weatherForecast)[0]?.cityName
    });
}
```

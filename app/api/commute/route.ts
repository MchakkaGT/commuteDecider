
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

    // 4. Process Each Day (Sequential for Gas Simulation)
    let currentGasLevel = 100; // Start fresh each request/week
    const CAR_MPG = 25;
    const TANK_GALLONS = 12;
    const MAX_RANGE_MILES = CAR_MPG * TANK_GALLONS; // ~300 miles

    // Use the first row's budget mode for everyone
    const globalBudgetMode = userDataList.length > 0 ? userDataList[0].budgetMode : false;

    const results = [];

    for (const userData of userDataList) {
        // Apply Global Budget Mode
        userData.budgetMode = globalBudgetMode;

        // Apply Simulated Gas Level
        userData.gasLevel = Math.max(0, Math.round(currentGasLevel));

        // Match Weather
        let weather: WeatherData | undefined = weatherForecast[userData.date];

        if (!weather) {
            const keys = Object.keys(weatherForecast).sort();

            // 1. Try matching day name (Monday, Tuesday...)
            const dayMatch = keys.find(k => {
                const d = new Date(k + "T00:00:00");
                const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
                return dayName.toLowerCase() === userData.date.toLowerCase();
            });

            // 2. Try matching MM/DD or MM-DD (ignoring year)
            const monthDayMatch = keys.find(k => {
                const userParts = userData.date.split(/[^0-9]/).filter(p => p);
                if (userParts.length >= 2) {
                    const m = parseInt(userParts[0]);
                    const d = parseInt(userParts[1]);
                    const kParts = k.split('-');
                    const kM = parseInt(kParts[1]);
                    const kD = parseInt(kParts[2]);
                    return m === kM && d === kD;
                }
                return false;
            });

            if (dayMatch) weather = weatherForecast[dayMatch];
            else if (monthDayMatch) weather = weatherForecast[monthDayMatch];
            else weather = weatherForecast[keys[0]]; // Fallback
        }

        if (weather) {
            const recommendation = makeDecision(userData, weather, commuteTimes);

            // Gas Deduction Logic
            // If Car is chosen, deduct gas based on distance
            if (recommendation.bestMethod === 'Car' && commuteTimes?.car) {
                const miles = commuteTimes.car.distance * 0.000621371;
                const totalMiles = miles * 2; // Round trip
                const percentUsed = (totalMiles / MAX_RANGE_MILES) * 100;
                currentGasLevel -= percentUsed;
            }

            results.push({
                userData: { ...userData }, // Snapshot
                weather,
                recommendation
            });
        }
    }

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


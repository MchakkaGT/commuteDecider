
import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetData } from '@/lib/sheets';
import { fetchWeatherData } from '@/lib/weather';
import { makeDecision } from '@/lib/decisionEngine';
import { geocodeAddress } from '@/lib/geocoding';
import { getCommuteTimes, CommuteTimes } from '@/lib/routing';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const sheetUrl = searchParams.get('sheetUrl');

    if (!sheetUrl) {
        return NextResponse.json({ error: 'Missing sheetUrl parameter' }, { status: 400 });
    }

    // 1. Fetch Sheet Data First (We need Origin/Dest)
    const userData = await fetchSheetData(sheetUrl);

    if (!userData) {
        return NextResponse.json({ error: 'Failed to fetch user data from Sheet' }, { status: 500 });
    }

    // 2. Fetch Geocoding & Weather in Parallel
    // If we have browser lat/lon params, use those for weather initially
    let lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined;
    let lon = searchParams.get('lon') ? parseFloat(searchParams.get('lon')!) : undefined;

    let originCoords = null;
    let destCoords = null;

    if (userData.origin && userData.destination) {
        const [o, d] = await Promise.all([
            geocodeAddress(userData.origin),
            geocodeAddress(userData.destination)
        ]);
        originCoords = o;
        destCoords = d;

        // Prefer Origin address for weather if available
        if (originCoords) {
            lat = originCoords.lat;
            lon = originCoords.lon;
        }
    }

    const weather = await fetchWeatherData(lat, lon);

    // 3. Fetch Routing (if we have coords)
    let commuteTimes: CommuteTimes | undefined;
    if (originCoords && destCoords) {
        commuteTimes = await getCommuteTimes(originCoords, destCoords);
    }

    if (!weather) {
        return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 });
    }

    const recommendation = makeDecision(userData, weather, commuteTimes);

    return NextResponse.json({
        recommendation,
        userData,
        weather,
        commuteTimes,
        routes: {
            origin: originCoords?.displayName || userData.origin,
            destination: destCoords?.displayName || userData.destination
        }
    });
}

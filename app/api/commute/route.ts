
import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetData } from '@/lib/sheets';
import { fetchWeatherData } from '@/lib/weather';
import { makeDecision } from '@/lib/decisionEngine';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const sheetUrl = searchParams.get('sheetUrl');

    if (!sheetUrl) {
        return NextResponse.json({ error: 'Missing sheetUrl parameter' }, { status: 400 });
    }

    // Fetch data in parallel
    const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined;
    const lon = searchParams.get('lon') ? parseFloat(searchParams.get('lon')!) : undefined;

    const [userData, weather] = await Promise.all([
        fetchSheetData(sheetUrl),
        fetchWeatherData(lat, lon)
    ]);

    if (!userData) {
        return NextResponse.json({ error: 'Failed to fetch user data from Sheet' }, { status: 500 });
    }
    if (!weather) {
        return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 });
    }

    const recommendation = makeDecision(userData, weather);

    return NextResponse.json({
        recommendation,
        userData,
        weather
    });
}

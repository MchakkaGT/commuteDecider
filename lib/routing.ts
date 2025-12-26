import { Coordinates } from './geocoding';

export type TransportProfile = 'car' | 'bike' | 'foot';

export interface RouteData {
    duration: number; // seconds
    distance: number; // meters
}

export type CommuteTimes = Record<TransportProfile, RouteData | null>;

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1';

export async function getCommuteTimes(start: Coordinates, end: Coordinates): Promise<CommuteTimes> {
    const [car, bike, foot] = await Promise.all([
        fetchRoute(start, end, 'driving'),
        fetchRoute(start, end, 'cycling'),
        fetchRoute(start, end, 'walking')
    ]);

    return {
        car,
        bike,
        foot
    };
}

async function fetchRoute(start: Coordinates, end: Coordinates, profile: 'driving' | 'cycling' | 'walking'): Promise<RouteData | null> {
    try {
        // OSRM format: /profile/lon,lat;lon,lat
        const url = `${OSRM_BASE_URL}/${profile}/${start.lon},${start.lat};${end.lon},${end.lat}?overview=false`;

        // Note: Public OSRM server is for demo only and has rate limits.
        const response = await fetch(url);
        if (!response.ok) return null;

        const json = await response.json();
        if (json.code !== 'Ok' || !json.routes || json.routes.length === 0) return null;

        const route = json.routes[0];
        return {
            duration: route.duration,
            distance: route.distance
        };
    } catch (error) {
        console.error(`Error fetching ${profile} route:`, error);
        return null;
    }
}

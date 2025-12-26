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

    // Public OSRM server often returns identical results for different profiles
    // or is slow. We will implement a logical fallback based on distance.
    const results = { car, bike, foot };

    // If bike/foot are identical to car (suspicious), or null, estimate them
    if (car && (!bike || bike.duration === car.duration)) {
        // Assume 12 mph (19.3 km/h) for biking = ~5.3 m/s
        results.bike = {
            distance: car.distance,
            duration: Math.round(car.distance / 5.3)
        };
    }
    if (car && (!foot || foot.duration === car.duration)) {
        // Assume 3.1 mph (5 km/h) for walking = ~1.4 m/s
        results.foot = {
            distance: car.distance,
            duration: Math.round(car.distance / 1.4)
        };
    }

    return results;
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

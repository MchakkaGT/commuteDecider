import { UserData } from './sheets';
import { WeatherData } from './weather';
import { CommuteTimes } from './routing';

export type CommuteMethod = 'Walk' | 'Bike' | 'Car';

export interface Recommendation {
    bestMethod: CommuteMethod;
    scores: Record<CommuteMethod, number>;
    reasoning: string[];
}

export function makeDecision(userData: UserData, weather: WeatherData, times?: CommuteTimes): Recommendation {
    const scores: Record<CommuteMethod, number> = {
        Walk: 100,
        Bike: 100,
        Car: 100 // Baseline
    };
    const reasoning: string[] = [];

    // --- Time-Based Adjustments (If available) ---
    if (times) {
        // Convert seconds to minutes
        const carMins = times.car ? Math.round(times.car.duration / 60) : Infinity;
        const bikeMins = times.bike ? Math.round(times.bike.duration / 60) : Infinity;
        const footMins = times.foot ? Math.round(times.foot.duration / 60) : Infinity;

        // 1. Efficiency Check
        if (bikeMins < carMins && bikeMins < 60) {
            scores.Bike += 30;
            reasoning.push(`Biking(${bikeMins}m) is faster than driving(${carMins}m) due to traffic.`);
        }

        // 2. Walking Duration Penalty
        if (footMins > 45) {
            scores.Walk -= 50;
            // Only penalize heavily if urgency is not low
            if (userData.urgency > 3) {
                reasoning.push(`Walking takes too long(${footMins}m).`);
            } else {
                reasoning.push(`Long walk(${footMins}m), but you aren't in a rush.`);
            }
        }

        // 3. Significant Savings
        if (carMins < bikeMins / 2 && carMins < footMins / 4) {
            scores.Car += 20;
            reasoning.push(`Car is significantly faster (${carMins}m).`);
        }
    }

    // 1. Hard Constraints (No-Go)

    // Heavy Rain/Snow
    if (weather.precipitation > 2.0 || weather.isSnowing) {
        scores.Bike = 0;
        scores.Walk = 0;
        reasoning.push("Heavy precipitation or snow rules out walking and biking.");
    } else if (weather.isRaining) {
        scores.Bike -= 50;
        scores.Walk -= 30; // Walking with umbrella is easier than biking in rain
        reasoning.push("Rain makes walking and biking less desirable.");
    }

    // Ice (Approximated by temp < 1C and precipitation)
    if (weather.temperature < 1 && (weather.isRaining || weather.precipitation > 0)) {
        scores.Bike = 0;
        reasoning.push("Icy conditions make biking unsafe.");
    }

    // Car Gas
    if (userData.gasLevel < 5) {
        scores.Car = 0;
        reasoning.push("Gas level is critical (<5%). Car is not an option.");
    } else if (userData.gasLevel < 15) {
        scores.Car -= 30;
        reasoning.push("Low gas level penalizes car usage.");
    }

    // 2. Soft Factors (The "Should"s)

    // Temperature
    if (weather.temperature < 0 || weather.temperature > 35) {
        scores.Walk -= 20;
        scores.Bike -= 20;
        reasoning.push(`Extreme temperature (${Math.round((weather.temperature * 9 / 5) + 32)}°F) discourages outdoor commute.`);
    } else if (weather.temperature >= 15 && weather.temperature <= 25) {
        scores.Walk += 10;
        scores.Bike += 15; // Ideal biking weather
        reasoning.push("Great temperature for walking or biking.");
    }

    // Wind
    if (weather.windSpeed > 25) {
        scores.Bike -= 40;
        scores.Walk -= 10;
        reasoning.push("High winds make biking difficult.");
    }

    // Early Morning Meeting (Replaces Laziness)
    // If Yes -> Force Car (Boost significantly), penalize others
    if (userData.earlyMeeting) {
        scores.Car += 200; // Strong override
        scores.Bike -= 100;
        scores.Walk -= 100;
        reasoning.push("Early morning meeting requires a car.");
    }

    // Urgency (1-10)
    // Urgent (< 15 mins equivalent to urgency > 8 maybe?)
    // Let's assume Urgency 10 is VERY urgent.
    if (userData.urgency >= 8) {
        scores.Car += 40; // Assuming car is fastest usually
        scores.Bike += 20; // Bike can beat traffic
        scores.Walk -= 50; // Walking is slow
        reasoning.push("High urgency requires faster transport.");
    }

    // Budget Mode
    if (userData.budgetMode) {
        scores.Car -= 40; // Gas/Parking costs
        scores.Walk += 20;
        scores.Bike += 20;
        reasoning.push("Budget mode favors free transport (Walk/Bike).");
    }

    // Find Winner
    let bestMethod: CommuteMethod = 'Car';
    let maxScore = -Infinity;

    (Object.keys(scores) as CommuteMethod[]).forEach(method => {
        if (scores[method] > maxScore) {
            maxScore = scores[method];
            bestMethod = method;
        }
    });

    // If all are 0 (e.g. disaster), defaults to Car but maybe add note? 
    // For now simple max logic.

    return {
        bestMethod,
        scores,
        reasoning
    };
}

"use client";

import { useState, useEffect } from "react";
import { Cloud, MapPin, Gauge, Droplets, Thermometer, Wind, Car, Bike, Footprints, AlertCircle, Calendar } from "lucide-react";
import useSWR from 'swr';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Home() {
  const [sheetUrl, setSheetUrl] = useState("");
  const [savedUrl, setSavedUrl] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [geoError, setGeoError] = useState("");

  useEffect(() => {
    setIsClient(true);
    const stored = localStorage.getItem("commute_sheet_url");
    if (stored) { setSheetUrl(stored); setSavedUrl(stored); }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => { console.error("Geolocation error:", err); setGeoError("Location access denied. Using defaults."); }
      );
    }
  }, []);

  const { data, error, isLoading, mutate } = useSWR(
    savedUrl ? `/api/commute?sheetUrl=${encodeURIComponent(savedUrl)}${location ? `&lat=${location.lat}&lon=${location.lon}` : ''}` : null,
    fetcher, { refreshInterval: 10000 } // Poll every 10s
  );

  const handleSave = () => {
    localStorage.setItem("commute_sheet_url", sheetUrl);
    setSavedUrl(sheetUrl);
    mutate();
  };

  if (!isClient) return null;

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-12 font-sans selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-zinc-900">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              Smart Commute
            </h1>
            <p className="text-zinc-500 mt-2 text-lg">Weekly Planner & Decision Engine</p>
          </div>

          <div className="flex w-full md:w-auto gap-2">
            <input
              type="text"
              placeholder="Paste Google Sheet CSV URL..."
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 w-full md:w-96 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
            />
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors text-sm whitespace-nowrap"
            >
              Save Sheet
            </button>
          </div>
        </header>

        {error && (
          <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-xl text-red-200">
            Failed to load data. Please check your Sheet URL and format.
          </div>
        )}

        {isLoading && !data && (
          <div className="text-center py-20 text-zinc-500 animate-pulse">
            Analyzing your week...
          </div>
        )}

        {data && (
          <>
            {/* Global Info: Location & Route */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-zinc-400">
                  <MapPin className="w-5 h-5" /> Location Context
                </h3>
                <div className="text-2xl font-bold text-white">
                  {data.cityName || "Unknown City"}
                </div>
                <div className="text-sm text-zinc-500">
                  {location ? "Using Device Location" : "Using Sheet Origin"}
                </div>
              </div>

              {data.routes?.origin && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2 text-zinc-400">
                    <Gauge className="w-5 h-5" /> Commute Route
                  </h3>
                  <div className="flex flex-col gap-2 opacity-80">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-zinc-300 truncate">{data.routes.origin}</span>
                    </div>
                    <div className="ml-[3px] w-[2px] h-4 bg-zinc-800" />
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-zinc-300 truncate">{data.routes.destination}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Commute Times Banner */}
            {data.commuteTimes && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                    <Car className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm text-zinc-500">Driving Time</div>
                    <div className="text-xl font-bold">{Math.round(data.commuteTimes.car.duration / 60)} min</div>
                  </div>
                </div>
                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center gap-4">
                  <div className="p-3 bg-green-500/10 rounded-lg text-green-400">
                    <Bike className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm text-zinc-500">Biking Time</div>
                    <div className="text-xl font-bold">{Math.round(data.commuteTimes.bike.duration / 60)} min</div>
                  </div>
                </div>
                <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
                    <Footprints className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm text-zinc-500">Walking Time</div>
                    <div className="text-xl font-bold">{Math.round(data.commuteTimes.foot.duration / 60)} min</div>
                  </div>
                </div>
              </div>
            )}

            {/* Weekly Grid */}
            <div>
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-indigo-400" /> Your Week
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {data.results?.map((day: any, i: number) => {
                  const rec = day.recommendation;
                  const weather = day.weather;
                  const userData = day.userData;

                  const isCar = rec.bestMethod === 'Car';
                  const isBike = rec.bestMethod === 'Bike';
                  const isWalk = rec.bestMethod === 'Walk';

                  return (
                    <div key={i} className={cn(
                      "relative p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.02]",
                      isCar && "bg-zinc-900 border-zinc-800",
                      isBike && "bg-green-950/20 border-green-900/50",
                      isWalk && "bg-emerald-950/20 border-emerald-900/50"
                    )}>
                      {/* Header */}
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <div className="text-indigo-400 font-mono text-sm uppercase tracking-wider mb-1">{userData.date}</div>
                          <h3 className="text-2xl font-bold flex items-center gap-2">
                            {isCar && "🚗 Car"}
                            {isBike && "🚲 Bike"}
                            {isWalk && "👣 Walk"}
                          </h3>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{Math.round((weather.temperature * 9 / 5) + 32)}°F</div>
                          <div className="text-xs text-zinc-500">{weather.isRaining ? "Rain" : weather.isSnowing ? "Snow" : "Clear"}</div>
                        </div>
                      </div>

                      {/* Reasoning */}
                      <div className="mb-6 space-y-2">
                        {rec.reasoning.slice(0, 3).map((r: string, idx: number) => (
                          <div key={idx} className="text-sm p-3 bg-black/40 rounded-lg text-zinc-300 border border-white/5">
                            {r}
                          </div>
                        ))}
                      </div>

                      {/* User Factors */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500 border-t border-white/5 pt-4">
                        <div className={cn("p-2 rounded-md", userData.earlyMeeting ? "bg-red-900/20 text-red-200" : "bg-black/20")}>
                          Meeting: {userData.earlyMeeting ? "YES" : "No"}
                        </div>
                        <div className="p-2 bg-black/20 rounded-md">
                          Gas: {userData.gasLevel}%
                        </div>
                        <div className="p-2 bg-black/20 rounded-md">
                          Urgency: {userData.urgency}/10
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

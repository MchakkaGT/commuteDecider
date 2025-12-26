"use client";

import { useState, useEffect } from "react";
import { Cloud, MapPin, Gauge, Droplets, Thermometer, Wind, Car, Bike, Footprints, AlertCircle, Calendar, ArrowRight, CheckCircle2 } from "lucide-react";
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
            {/* Start & End Locations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Start Location Box */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-3 min-h-[140px]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Start Journey
                    </h3>
                    <MapPin className="w-5 h-5 text-zinc-700" />
                  </div>
                  <div className="text-xl font-bold text-white leading-tight">
                    {data.routes?.origin || "Loading Address..."}
                  </div>
                  <div className="mt-auto text-xs text-zinc-500 font-mono italic">
                    Primary Home Base Address
                  </div>
                </div>
              </div>

              {/* End Location Box */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-rose-500 to-orange-600 rounded-3xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-3 min-h-[140px]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-rose-400 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                      Destination
                    </h3>
                    <ArrowRight className="w-5 h-5 text-zinc-700" />
                  </div>
                  <div className="text-xl font-bold text-white leading-tight">
                    {data.routes?.destination || "Loading Destination..."}
                  </div>
                  <div className="mt-auto text-xs text-zinc-500 font-mono italic">
                    {data.cityName ? `Near ${data.cityName}` : "Primary Destination Location"}
                  </div>
                </div>
              </div>
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
            {/* Weekly List (Premium Cards) */}
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3 text-white">
                <Calendar className="w-8 h-8 text-indigo-400" />
                Weekly Plan
              </h2>

              <div className="space-y-8">
                {data.results?.map((day: any, i: number) => {
                  const rec = day.recommendation;
                  const weather = day.weather;
                  const userData = day.userData;

                  const isCar = rec.bestMethod === 'Car';
                  const isBike = rec.bestMethod === 'Bike';
                  const isWalk = rec.bestMethod === 'Walk';

                  return (
                    <div key={i} className={cn(
                      "relative overflow-hidden rounded-3xl border-2 transition-all hover:shadow-2xl",
                      isCar && "bg-zinc-900 border-zinc-700 shadow-zinc-900/50",
                      isBike && "bg-[#0a1f1c] border-emerald-800 shadow-emerald-900/30",
                      isWalk && "bg-[#1a1500] border-amber-900/50 shadow-amber-900/20"
                    )}>
                      <div className="flex flex-col md:flex-row">
                        {/* Left: Big Icon & Result */}
                        <div className={cn(
                          "p-8 flex-shrink-0 flex flex-col items-center justify-center w-full md:w-48 text-center",
                          isCar && "bg-zinc-800",
                          isBike && "bg-emerald-900/30",
                          isWalk && "bg-amber-900/20"
                        )}>
                          {isCar && <Car className="w-16 h-16 text-white mb-4" />}
                          {isBike && <Bike className="w-16 h-16 text-emerald-400 mb-4" />}
                          {isWalk && <Footprints className="w-16 h-16 text-amber-400 mb-4" />}

                          <div className="text-2xl font-black text-white tracking-widest uppercase">
                            {rec.bestMethod}
                          </div>
                          <div className="mt-2 text-xs font-mono opacity-60">RECOMMENDED</div>
                        </div>

                        {/* Right: Details */}
                        <div className="p-8 flex-grow">
                          {/* Header: Date & Weather */}
                          <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
                            <div>
                              <div className="text-indigo-400 font-bold text-lg mb-1">{userData.date}</div>
                              {/* Route Display */}
                              <div className="flex items-center gap-2 text-sm text-zinc-400">
                                <MapPin className="w-4 h-4 text-zinc-500" />
                                <span className="font-medium text-zinc-300">{userData.origin}</span>
                                <ArrowRight className="w-3 h-3 text-zinc-600" />
                                <span className="font-medium text-zinc-300">{userData.destination}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-3xl font-bold text-white">{Math.round((weather.temperature * 9 / 5) + 32)}°F</div>
                              <div className="text-sm text-zinc-400 font-medium">
                                {weather.isRaining ? "🌧️ Rain" : weather.isSnowing ? "❄️ Snow" : "☀️ Clear"}
                              </div>
                            </div>
                          </div>

                          {/* Reasoning */}
                          <div className="space-y-3 mb-6">
                            {rec.reasoning.map((r: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-3 text-zinc-300">
                                <CheckCircle2 className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                                <span>{r}</span>
                              </div>
                            ))}
                          </div>

                          {/* Stats/Badges */}
                          <div className="flex flex-wrap gap-2 mt-auto">
                            {userData.earlyMeeting && (
                              <Badge className="bg-red-500/10 text-red-400 border-red-500/20 px-3 py-1">
                                ⚠️ Early Meeting
                              </Badge>
                            )}
                            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-3 py-1">
                              Urgency: {userData.urgency}/10
                            </Badge>
                            {(isCar || userData.gasLevel < 100) && (
                              <Badge className={cn("px-3 py-1", userData.gasLevel < 25 ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400")}>
                                ⛽ Gas: {userData.gasLevel.toFixed(0)}%
                              </Badge>
                            )}
                          </div>
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

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={cn("text-xs font-medium rounded-full border", className)}>
      {children}
    </span>
  );
}

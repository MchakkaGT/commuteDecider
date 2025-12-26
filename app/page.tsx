"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import {
  Car,
  Footprints,
  Bike,
  CloudRain,
  Snowflake,
  Sun,
  Wind,
  Cloud,
  AlertTriangle,
  Droplets,
  Thermometer,
  Gauge,
  ArrowRight,
  Settings2,
  RefreshCcw
} from "lucide-react";
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

  useEffect(() => {
    setIsClient(true);
    const stored = localStorage.getItem("commute_sheet_url");
    if (stored) {
      setSheetUrl(stored);
      setSavedUrl(stored);
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => console.error("Geolocation error:", err)
      );
    }
  }, []);

  const handleSave = () => {
    if (!sheetUrl) return;
    localStorage.setItem("commute_sheet_url", sheetUrl);
    setSavedUrl(sheetUrl);
  };

  const { data, error, isLoading, mutate } = useSWR(
    savedUrl
      ? `/api/commute?sheetUrl=${encodeURIComponent(savedUrl)}${location ? `&lat=${location.lat}&lon=${location.lon}` : ''}`
      : null,
    fetcher,
    { refreshInterval: 5000 }
  );

  const recommendation = data?.recommendation;
  const weather = data?.weather;
  const userData = data?.userData;

  const renderCommuteIcon = (method: string) => {
    switch (method) {
      case "Car":
        return <Car className="w-16 h-16 text-blue-400" />;
      case "Bike":
        return <Bike className="w-16 h-16 text-green-400" />;
      case "Walk":
        return <Footprints className="w-16 h-16 text-emerald-400" />;
      default:
        return <AlertTriangle className="w-16 h-16 text-yellow-500" />;
    }
  };

  if (!isClient) return null; // Avoid hydration mismatch

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-12 font-sans selection:bg-emerald-500/30 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              <Footprints className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Smart Commute</h1>
              <p className="text-zinc-400 text-sm">Real-time AI decision maker</p>
            </div>
          </div>

          <div className="flex items-center gap-2 max-w-md w-full">
            <input
              type="text"
              placeholder="Paste Google Sheet CSV URL..."
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-zinc-300 placeholder:text-zinc-600"
            />
            <button
              onClick={handleSave}
              className="bg-white text-black hover:bg-zinc-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </div>

        {/* Main Content */}
        {!savedUrl ? (
          <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-zinc-800 border-dashed">
            <Settings2 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-zinc-300">Setup Required</h2>
            <p className="text-zinc-500 mt-2 max-w-md mx-auto">
              Please paste your published Google Sheet CSV URL above to start receiving recommendations.
            </p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-200">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-semibold">Error fetching data</p>
              <p className="text-sm opacity-80">{error.toString() || "Using fallback or invalid URL."}</p>
            </div>
          </div>
        ) : isLoading && !data ? (
          <div className="text-center py-20">
            <RefreshCcw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
            <p className="border-t-transparent text-zinc-500 mt-4">Analyzing options...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* The Decision Card */}
            <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800 rounded-3xl p-8 md:p-12 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-32 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-all duration-700" />

              <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
                <div>
                  <h2 className="text-zinc-400 font-medium mb-1 uppercase tracking-wider text-sm">Recommended Mode</h2>
                  <div className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-4">
                    {recommendation?.bestMethod}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recommendation?.reasoning.map((reason: string, i: number) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-zinc-300 text-xs md:text-sm">
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="p-8 bg-zinc-950/50 rounded-2xl border border-zinc-800 shadow-2xl">
                  {renderCommuteIcon(recommendation?.bestMethod || "")}
                </div>
              </div>
            </div>

            {/* Weather Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-zinc-400" />
                  Conditions
                </h3>
                <span className="text-xs font-mono text-zinc-500 uppercase">{location ? "Current Location" : "San Francisco (Default)"}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-2 text-zinc-400 mb-1 text-sm">
                    <Thermometer className="w-4 h-4" /> Temp
                  </div>
                  <div className="text-2xl font-bold text-white">{weather?.temperature}°C</div>
                </div>
                <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                  <div className="flex items-center gap-2 text-zinc-400 mb-1 text-sm">
                    <Wind className="w-4 h-4" /> Wind
                  </div>
                  <div className="text-2xl font-bold text-white">{weather?.windSpeed} <span className="text-sm font-normal text-zinc-500">km/h</span></div>
                </div>
                <div className="col-span-2 p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-400 text-sm">
                    <Droplets className="w-4 h-4" /> Rain Status
                  </div>
                  <div className="text-lg font-semibold text-white">
                    {weather?.isRaining ? "Raining" : weather?.isSnowing ? "Snowing" : "Clear"}
                  </div>
                </div>
              </div>
            </div>

            {/* User Data Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-zinc-400" />
                  My Status
                </h3>
                <button onClick={() => mutate()} className="text-xs text-emerald-500 hover:underline cursor-pointer">
                  Force Refresh
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <span className="text-zinc-400 text-sm">Laziness Level</span>
                  <div className="w-24 bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${(userData?.laziness || 0) * 10}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <span className="text-zinc-400 text-sm">Urgency</span>
                  <div className="w-24 bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div className="bg-orange-500 h-full transition-all duration-500" style={{ width: `${(userData?.urgency || 0) * 10}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <span className="text-zinc-400 text-sm">Gas Level</span>
                  <span className={cn("font-mono font-bold", (userData?.gasLevel || 0) < 10 ? "text-red-500" : "text-emerald-500")}>
                    {userData?.gasLevel}%
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <span className="text-zinc-400 text-sm">Budget Mode</span>
                  <span className={cn("text-xs px-2 py-1 rounded border", userData?.budgetMode ? "bg-green-500/10 border-green-500/50 text-green-400" : "bg-zinc-800 border-zinc-700 text-zinc-500")}>
                    {userData?.budgetMode ? "ACTIVE" : "OFF"}
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

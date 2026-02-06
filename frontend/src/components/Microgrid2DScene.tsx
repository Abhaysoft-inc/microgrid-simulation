"use client";

/**
 * Microgrid 2D Scene Component - Lightweight Version
 * ==================================================
 * SVG-based 2D visualization for low-end devices.
 * 
 * Features:
 * - Minimal CPU/GPU usage
 * - Animated energy flow lines
 * - Day/night background transition
 * - Battery level indicator
 */

import React, { useEffect, useState } from "react";
import { Sun, Moon, Battery, Home, Zap } from "lucide-react";

interface Microgrid2DSceneProps {
    currentData: {
        hour: number;
        solar_generation: number;
        load_demand: number;
        battery_soc: number;
        grid_usage: number;
        battery_charge: number;
        battery_discharge: number;
        is_peak_hour: boolean;
    };
}

export default function Microgrid2DScene({ currentData }: Microgrid2DSceneProps) {
    const [animationOffset, setAnimationOffset] = useState(0);

    // Animate energy flow
    useEffect(() => {
        const interval = setInterval(() => {
            setAnimationOffset(prev => (prev + 2) % 20);
        }, 50);
        return () => clearInterval(interval);
    }, []);

    const { hour, solar_generation, load_demand, battery_soc, grid_usage, battery_charge, battery_discharge } = currentData;

    // Day/night calculations
    const isDaytime = hour >= 6 && hour < 19;
    const isCharging = battery_charge > 0.1;
    const isDischarging = battery_discharge > 0.1;
    const gridActive = grid_usage > 0.1;
    const solarActive = solar_generation > 0.1;

    // Background gradient based on time
    const getBackgroundGradient = () => {
        if (hour >= 6 && hour < 8) return "from-orange-200 via-yellow-100 to-blue-200"; // Sunrise
        if (hour >= 8 && hour < 17) return "from-blue-300 via-blue-200 to-blue-100"; // Day
        if (hour >= 17 && hour < 19) return "from-orange-300 via-pink-200 to-purple-300"; // Sunset
        return "from-slate-800 via-slate-900 to-indigo-950"; // Night
    };

    // Battery color based on level
    const getBatteryColor = () => {
        if (battery_soc >= 70) return "#22c55e"; // Green
        if (battery_soc >= 30) return "#f59e0b"; // Amber
        return "#ef4444"; // Red
    };

    return (
        <div className={`w-full h-[350px] rounded-lg overflow-hidden bg-gradient-to-b ${getBackgroundGradient()} relative transition-all duration-1000`}>
            {/* Stars (night only) */}
            {!isDaytime && (
                <div className="absolute inset-0 overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 40}%`,
                                animationDelay: `${Math.random() * 2}s`,
                                opacity: Math.random() * 0.5 + 0.3,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Sun/Moon */}
            <div className="absolute top-4 left-8">
                {isDaytime ? (
                    <div className="relative">
                        <div className="w-16 h-16 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50 flex items-center justify-center animate-pulse">
                            <Sun className="w-10 h-10 text-yellow-600" />
                        </div>
                        {solarActive && (
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                                {solar_generation.toFixed(1)} kW
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-14 h-14 bg-slate-200 rounded-full shadow-lg shadow-slate-300/30 flex items-center justify-center">
                        <Moon className="w-8 h-8 text-slate-400" />
                    </div>
                )}
            </div>

            {/* Ground */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-green-800 to-green-600" />

            {/* SVG for connections and components */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 350" preserveAspectRatio="xMidYMid meet">
                {/* Energy flow paths */}
                <defs>
                    {/* Solar to Battery flow */}
                    <linearGradient id="solarFlow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                    {/* Battery to House flow */}
                    <linearGradient id="batteryFlow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                    {/* Grid to House flow */}
                    <linearGradient id="gridFlow" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                </defs>

                {/* Solar Panel */}
                <g transform="translate(60, 120)">
                    <rect x="0" y="0" width="60" height="40" fill="#1e3a5f" stroke="#0f172a" strokeWidth="2" rx="2" />
                    <line x1="0" y1="13" x2="60" y2="13" stroke="#3b82f6" strokeWidth="1" />
                    <line x1="0" y1="27" x2="60" y2="27" stroke="#3b82f6" strokeWidth="1" />
                    <line x1="20" y1="0" x2="20" y2="40" stroke="#3b82f6" strokeWidth="1" />
                    <line x1="40" y1="0" x2="40" y2="40" stroke="#3b82f6" strokeWidth="1" />
                    {/* Panel stand */}
                    <rect x="25" y="40" width="10" height="20" fill="#374151" />
                </g>
                <text x="90" y="190" textAnchor="middle" className="fill-slate-700 text-xs font-semibold">SOLAR</text>

                {/* Battery */}
                <g transform="translate(165, 130)">
                    <rect x="0" y="0" width="50" height="70" fill="#1f2937" stroke="#374151" strokeWidth="2" rx="4" />
                    <rect x="15" y="-8" width="20" height="8" fill="#374151" rx="2" />
                    {/* Battery level */}
                    <rect
                        x="5"
                        y={65 - (battery_soc / 100) * 55}
                        width="40"
                        height={(battery_soc / 100) * 55}
                        fill={getBatteryColor()}
                        rx="2"
                        className="transition-all duration-500"
                    />
                    {/* Battery percentage */}
                    <text x="25" y="40" textAnchor="middle" className="fill-white text-xs font-bold">{battery_soc.toFixed(0)}%</text>
                </g>
                <text x="190" y="215" textAnchor="middle" className="fill-slate-700 text-xs font-semibold">BATTERY</text>

                {/* House */}
                <g transform="translate(270, 110)">
                    {/* Roof */}
                    <polygon points="40,0 0,35 80,35" fill="#8b4513" stroke="#5c3317" strokeWidth="2" />
                    {/* Body */}
                    <rect x="10" y="35" width="60" height="50" fill="#d4a574" stroke="#8b4513" strokeWidth="2" />
                    {/* Door */}
                    <rect x="32" y="55" width="16" height="30" fill="#5c3317" />
                    {/* Window */}
                    <rect x="50" y="45" width="14" height="14" fill="#87ceeb" stroke="#374151" strokeWidth="1" />
                    {/* Chimney */}
                    <rect x="55" y="10" width="10" height="20" fill="#6b7280" />
                </g>
                <text x="310" y="205" textAnchor="middle" className="fill-slate-700 text-xs font-semibold">HOME</text>
                <text x="310" y="218" textAnchor="middle" className="fill-slate-500 text-[10px]">{load_demand.toFixed(1)} kW</text>

                {/* Grid/Power Tower */}
                <g transform="translate(165, 240)">
                    {/* Tower structure */}
                    <polygon points="25,0 15,50 35,50" fill="#4b5563" stroke="#374151" strokeWidth="1" />
                    <line x1="5" y1="15" x2="45" y2="15" stroke="#374151" strokeWidth="3" />
                    <line x1="10" y1="30" x2="40" y2="30" stroke="#374151" strokeWidth="2" />
                    {/* Power lines */}
                    <line x1="0" y1="15" x2="5" y2="15" stroke="#1f2937" strokeWidth="2" />
                    <line x1="45" y1="15" x2="50" y2="15" stroke="#1f2937" strokeWidth="2" />
                </g>
                <text x="190" y="305" textAnchor="middle" className="fill-slate-700 text-xs font-semibold">GRID</text>

                {/* Energy Flow Lines */}
                {/* Solar to Battery */}
                {solarActive && isCharging && (
                    <g>
                        <path
                            d="M 120 140 Q 140 140 165 150"
                            fill="none"
                            stroke="url(#solarFlow)"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray="8 4"
                            strokeDashoffset={-animationOffset}
                            className="transition-opacity duration-300"
                            opacity={0.9}
                        />
                        <circle cx={120 + (animationOffset / 20) * 45} cy={140 + (animationOffset / 20) * 10} r="4" fill="#fbbf24">
                            <animate attributeName="opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite" />
                        </circle>
                    </g>
                )}

                {/* Battery to House */}
                {isDischarging && (
                    <g>
                        <path
                            d="M 215 165 Q 240 165 270 150"
                            fill="none"
                            stroke="url(#batteryFlow)"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray="8 4"
                            strokeDashoffset={-animationOffset}
                            opacity={0.9}
                        />
                        <circle cx={215 + (animationOffset / 20) * 55} cy={165 - (animationOffset / 20) * 15} r="4" fill="#22c55e">
                            <animate attributeName="opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite" />
                        </circle>
                    </g>
                )}

                {/* Grid to House */}
                {gridActive && (
                    <g>
                        <path
                            d="M 215 255 Q 260 230 280 195"
                            fill="none"
                            stroke="url(#gridFlow)"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray="8 4"
                            strokeDashoffset={-animationOffset}
                            opacity={0.9}
                        />
                        <circle cx={215 + (animationOffset / 20) * 65} cy={255 - (animationOffset / 20) * 60} r="4" fill="#ef4444">
                            <animate attributeName="opacity" values="1;0.5;1" dur="0.5s" repeatCount="indefinite" />
                        </circle>
                    </g>
                )}

                {/* Solar direct to House (when not charging battery) */}
                {solarActive && !isCharging && (
                    <g>
                        <path
                            d="M 120 140 Q 200 100 270 130"
                            fill="none"
                            stroke="#fbbf24"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray="8 4"
                            strokeDashoffset={-animationOffset}
                            opacity={0.9}
                        />
                    </g>
                )}
            </svg>

            {/* Status indicators */}
            <div className="absolute bottom-24 left-4 right-4 flex justify-between">
                {/* Solar Status */}
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${solarActive ? "bg-yellow-100 text-yellow-700" : "bg-slate-200 text-slate-500"
                    }`}>
                    <Sun className="w-3 h-3" />
                    <span>{solarActive ? `${solar_generation.toFixed(1)} kW` : "Inactive"}</span>
                </div>

                {/* Battery Status */}
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${isCharging ? "bg-green-100 text-green-700" :
                        isDischarging ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"
                    }`}>
                    <Battery className="w-3 h-3" />
                    <span>{isCharging ? "Charging" : isDischarging ? "Discharging" : "Idle"}</span>
                </div>

                {/* Grid Status */}
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${gridActive ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-500"
                    }`}>
                    <Zap className="w-3 h-3" />
                    <span>{gridActive ? `${grid_usage.toFixed(1)} kW` : "Off"}</span>
                </div>
            </div>

            {/* Time indicator */}
            <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow">
                <div className="text-xs text-slate-500">Time</div>
                <div className="text-lg font-bold text-slate-800">
                    {hour.toString().padStart(2, "0")}:00
                </div>
            </div>

            {/* Peak hour warning */}
            {currentData.is_peak_hour && (
                <div className="absolute top-4 right-24 bg-red-100 text-red-700 px-2 py-1 rounded-lg text-xs font-medium animate-pulse">
                    ⚡ Peak Hour
                </div>
            )}
        </div>
    );
}

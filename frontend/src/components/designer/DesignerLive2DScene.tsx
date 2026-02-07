"use client";

/**
 * DesignerLive2DScene
 * ====================
 * SVG-based 2D visualization that renders the user's designed grid
 * layout with live simulation data. Lightweight alternative to 3D.
 */

import React, { useEffect, useState, useMemo } from "react";
import { Sun, Moon, Battery, Home, Building, Zap } from "lucide-react";
import type { PlacedNode, Wire } from "@/lib/microgridElements";

interface LiveData {
    hour: number;
    solar_generation: number;
    load_demand: number;
    battery_soc: number;
    grid_usage: number;
    battery_charge: number;
    battery_discharge: number;
    is_peak_hour: boolean;
}

interface DesignerLive2DSceneProps {
    nodes: PlacedNode[];
    wires: Wire[];
    currentData: LiveData;
}

// Map node types to icons + colors
const nodeVisuals: Record<string, { Icon: React.ComponentType<{ className?: string }>; bg: string; border: string; label: string }> = {
    solar_panel: { Icon: Sun, bg: "bg-amber-100", border: "border-amber-400", label: "Solar" },
    grid_connection: { Icon: Zap, bg: "bg-violet-100", border: "border-violet-400", label: "Grid" },
    battery: { Icon: Battery, bg: "bg-emerald-100", border: "border-emerald-400", label: "Battery" },
    residential_load: { Icon: Home, bg: "bg-red-100", border: "border-red-400", label: "Home" },
    commercial_load: { Icon: Building, bg: "bg-orange-100", border: "border-orange-400", label: "Building" },
};

export default function DesignerLive2DScene({ nodes, wires, currentData }: DesignerLive2DSceneProps) {
    const [animOff, setAnimOff] = useState(0);

    useEffect(() => {
        const iv = setInterval(() => setAnimOff(p => (p + 2) % 20), 50);
        return () => clearInterval(iv);
    }, []);

    const { hour, solar_generation, load_demand, battery_soc, grid_usage, battery_charge, battery_discharge } = currentData;
    const isDaytime = hour >= 6 && hour < 19;
    const solarActive = solar_generation > 0.1;
    const isCharging = battery_charge > 0.1;
    const isDischarging = battery_discharge > 0.1;
    const gridActive = grid_usage > 0.1;

    // Compute bounding box → viewBox
    const { vbX, vbY, vbW, vbH, scale } = useMemo(() => {
        if (nodes.length === 0) return { vbX: 0, vbY: 0, vbW: 400, vbH: 350, scale: 1 };
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(n => {
            minX = Math.min(minX, n.x);
            minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + n.width);
            maxY = Math.max(maxY, n.y + n.height);
        });
        const pad = 80;
        return {
            vbX: minX - pad,
            vbY: minY - pad,
            vbW: Math.max(maxX - minX + pad * 2, 300),
            vbH: Math.max(maxY - minY + pad * 2, 250),
            scale: 1,
        };
    }, [nodes]);

    const portAbs = (nodeId: string, portId: string) => {
        const n = nodes.find(nd => nd.id === nodeId);
        const p = n?.ports.find(pt => pt.id === portId);
        if (!n || !p) return { x: 0, y: 0 };
        return { x: n.x + p.x, y: n.y + p.y };
    };

    // Wire color by source type
    const wireColor = (w: Wire) => {
        const from = nodes.find(n => n.id === w.fromNode);
        if (from?.type === "solar_panel") return solarActive ? "#f59e0b" : "#666";
        if (from?.type === "grid_connection") return gridActive ? "#8b5cf6" : "#666";
        if (from?.type === "battery") return isDischarging ? "#22c55e" : "#666";
        return "#666";
    };

    const wireActive = (w: Wire) => {
        const from = nodes.find(n => n.id === w.fromNode);
        if (from?.type === "solar_panel") return solarActive;
        if (from?.type === "grid_connection") return gridActive;
        if (from?.type === "battery") return isDischarging;
        return false;
    };

    // Background gradient
    const bgGrad = hour >= 6 && hour < 8 ? "from-orange-200 via-yellow-100 to-blue-200"
        : hour >= 8 && hour < 17 ? "from-blue-300 via-blue-200 to-blue-100"
            : hour >= 17 && hour < 19 ? "from-orange-300 via-pink-200 to-purple-300"
                : "from-slate-800 via-slate-900 to-indigo-950";

    const batColor = battery_soc >= 70 ? "#22c55e" : battery_soc >= 30 ? "#f59e0b" : "#ef4444";

    return (
        <div className={`w-full h-[350px] rounded-lg overflow-hidden bg-gradient-to-b ${bgGrad} relative transition-all duration-1000`}>
            {/* Stars at night */}
            {!isDaytime && (
                <div className="absolute inset-0 overflow-hidden">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                            style={{ left: `${(i * 37 + 11) % 100}%`, top: `${(i * 23 + 7) % 40}%`, animationDelay: `${i * 0.1}s`, opacity: 0.4 + (i % 3) * 0.2 }}
                        />
                    ))}
                </div>
            )}

            {/* Sun/Moon */}
            <div className="absolute top-4 left-4">
                {isDaytime ? (
                    <div className="relative">
                        <div className="w-12 h-12 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50 flex items-center justify-center animate-pulse">
                            <Sun className="w-7 h-7 text-yellow-600" />
                        </div>
                    </div>
                ) : (
                    <div className="w-10 h-10 bg-slate-200 rounded-full shadow-lg flex items-center justify-center">
                        <Moon className="w-6 h-6 text-slate-400" />
                    </div>
                )}
            </div>

            {/* SVG view of the designer layout */}
            <svg className="absolute inset-0 w-full h-full" viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} preserveAspectRatio="xMidYMid meet">
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/* Wires */}
                {wires.map(w => {
                    const from = portAbs(w.fromNode, w.fromPort);
                    const to = portAbs(w.toNode, w.toPort);
                    const col = wireColor(w);
                    const act = wireActive(w);
                    const dx = Math.abs(to.x - from.x) * 0.5;
                    const d = `M${from.x},${from.y} C${from.x + dx},${from.y} ${to.x - dx},${to.y} ${to.x},${to.y}`;
                    return (
                        <g key={w.id}>
                            <path d={d} fill="none" stroke={col} strokeWidth={act ? 3 : 1.5} strokeLinecap="round"
                                strokeDasharray={act ? "8 4" : "none"}
                                strokeDashoffset={act ? -animOff : 0}
                                opacity={act ? 0.9 : 0.3}
                                filter={act ? "url(#glow)" : undefined}
                            />
                        </g>
                    );
                })}

                {/* Nodes */}
                {nodes.map(n => {
                    const visual = nodeVisuals[n.type];
                    const cx = n.x + n.width / 2;
                    const cy = n.y + n.height / 2;
                    return (
                        <g key={n.id}>
                            {/* background rect */}
                            <rect x={n.x} y={n.y} width={n.width} height={n.height} rx={8} fill="white" fillOpacity={0.85} stroke={n.color} strokeWidth={2} />
                            {/* icon area */}
                            <circle cx={cx} cy={cy - 8} r={16} fill={n.color} fillOpacity={0.15} />
                            {/* label */}
                            <text x={cx} y={cy + 20} textAnchor="middle" fontSize={10} fontWeight="bold" fill={isDaytime ? "#334155" : "#e2e8f0"}>
                                {visual?.label || n.label}
                            </text>

                            {/* Battery SOC bar */}
                            {n.type === "battery" && (
                                <>
                                    <rect x={n.x + 4} y={n.y + n.height - 12} width={n.width - 8} height={6} rx={3} fill="#e2e8f0" />
                                    <rect x={n.x + 4} y={n.y + n.height - 12} width={(n.width - 8) * (battery_soc / 100)} height={6} rx={3} fill={batColor} />
                                    <text x={cx} y={cy - 16} textAnchor="middle" fontSize={9} fontWeight="bold" fill={batColor}>
                                        {battery_soc.toFixed(0)}%
                                    </text>
                                </>
                            )}

                            {/* Solar power label */}
                            {n.type === "solar_panel" && solarActive && (
                                <text x={cx} y={n.y - 6} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#f59e0b">
                                    {solar_generation.toFixed(1)} kW
                                </text>
                            )}

                            {/* Grid power label */}
                            {n.type === "grid_connection" && gridActive && (
                                <text x={cx} y={n.y - 6} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#8b5cf6">
                                    {grid_usage.toFixed(1)} kW
                                </text>
                            )}

                            {/* Load demand label */}
                            {(n.type === "residential_load" || n.type === "commercial_load") && (
                                <text x={cx} y={n.y - 6} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#ef4444">
                                    {load_demand.toFixed(1)} kW
                                </text>
                            )}

                            {/* Ports */}
                            {n.ports.map(p => (
                                <circle key={p.id} cx={n.x + p.x} cy={n.y + p.y} r={4} fill={n.color} stroke="white" strokeWidth={1.5} />
                            ))}
                        </g>
                    );
                })}
            </svg>

            {/* Bottom status bar */}
            <div className="absolute bottom-3 left-3 right-3 flex justify-between flex-wrap gap-1">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${solarActive ? "bg-yellow-100 text-yellow-700" : "bg-slate-200/60 text-slate-500"}`}>
                    <Sun className="w-3 h-3" /> {solar_generation.toFixed(1)} kW
                </div>
                {nodes.some(n => n.type === "grid_connection") && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${gridActive ? "bg-violet-100 text-violet-700" : "bg-slate-200/60 text-slate-500"}`}>
                        <Zap className="w-3 h-3" /> Grid {grid_usage.toFixed(1)} kW
                    </div>
                )}
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${isCharging ? "bg-green-100 text-green-700" : isDischarging ? "bg-amber-100 text-amber-700" : "bg-slate-200/60 text-slate-500"}`}>
                    <Battery className="w-3 h-3" /> {battery_soc.toFixed(0)}%
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${gridActive ? "bg-red-100 text-red-700" : "bg-slate-200/60 text-slate-500"}`}>
                    <Zap className="w-3 h-3" /> Grid {grid_usage.toFixed(1)} kW
                </div>
            </div>

            {/* Time */}
            <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow">
                <div className="text-xs text-slate-500">Time</div>
                <div className="text-lg font-bold text-slate-800">{String(hour).padStart(2, "0")}:00</div>
            </div>

            {currentData.is_peak_hour && (
                <div className="absolute top-4 right-24 bg-red-100 text-red-700 px-2 py-1 rounded-lg text-xs font-medium animate-pulse">
                    ⚡ Peak Hour
                </div>
            )}
        </div>
    );
}

"use client";

import type { PlacedNode } from "@/lib/microgridElements";

interface PropertiesPanelProps {
    node: PlacedNode;
    onUpdate: (nodeId: string, newProps: Record<string, unknown>) => void;
    onDelete: () => void;
    onBack: () => void;
}

export default function PropertiesPanel({ node, onUpdate, onDelete, onBack }: PropertiesPanelProps) {
    return (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {/* Back button */}
            <button
                onClick={onBack}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
                Back to components
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
                <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: `${node.color}22`, border: `1px solid ${node.color}44` }}
                >
                    <span className="text-lg" style={{ color: node.color }}>⚡</span>
                </div>
                <div>
                    <h3 className="text-sm font-semibold" style={{ color: node.color }}>
                        {node.label}
                    </h3>
                    <p className="text-[10px] text-gray-500 font-mono">{node.id}</p>
                </div>
            </div>

            {/* Node label edit */}
            <div>
                <label className="block text-[10px] uppercase text-gray-500 mb-1 tracking-wider">Label</label>
                <input
                    type="text"
                    value={node.label}
                    onChange={(e) => onUpdate(node.id, { __label: e.target.value })}
                    className="w-full bg-[#252938] text-sm rounded-md px-3 py-1.5 text-gray-300 outline-none focus:ring-1 focus:ring-blue-500"
                />
            </div>

            {/* Position */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-[10px] uppercase text-gray-500 mb-1 tracking-wider">X</label>
                    <input
                        type="number"
                        value={Math.round(node.x)}
                        readOnly
                        className="w-full bg-[#252938] text-sm rounded-md px-3 py-1.5 text-gray-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-[10px] uppercase text-gray-500 mb-1 tracking-wider">Y</label>
                    <input
                        type="number"
                        value={Math.round(node.y)}
                        readOnly
                        className="w-full bg-[#252938] text-sm rounded-md px-3 py-1.5 text-gray-500 outline-none"
                    />
                </div>
            </div>

            {/* Dynamic properties */}
            <div>
                <h4 className="text-[10px] uppercase text-gray-500 mb-2 tracking-wider">Parameters</h4>
                <div className="space-y-2">
                    {Object.entries(node.props).map(([key, value]) => (
                        <div key={key}>
                            <label className="block text-[10px] text-gray-500 mb-0.5 capitalize">
                                {key.replace(/_/g, " ")}
                            </label>
                            <input
                                type={typeof value === "number" ? "number" : "text"}
                                value={value}
                                onChange={(e) =>
                                    onUpdate(node.id, {
                                        [key]: typeof value === "number" ? parseFloat(e.target.value) || 0 : e.target.value,
                                    })
                                }
                                className="w-full bg-[#252938] text-sm rounded-md px-3 py-1.5 text-gray-300 outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Ports info */}
            <div>
                <h4 className="text-[10px] uppercase text-gray-500 mb-2 tracking-wider">Ports</h4>
                <div className="space-y-1">
                    {node.ports.map((p) => (
                        <div
                            key={p.id}
                            className="flex items-center gap-2 text-xs bg-[#252938] rounded-md px-3 py-1.5"
                        >
                            <div
                                className={`w-2 h-2 rounded-full ${p.type === "input" ? "bg-blue-400" : "bg-emerald-400"}`}
                            />
                            <span className="text-gray-400 font-mono">{p.id}</span>
                            <span className="text-gray-600 text-[10px]">({p.type})</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Delete */}
            <button
                onClick={onDelete}
                className="w-full mt-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition border border-red-500/20"
            >
                Delete Component
            </button>
        </div>
    );
}

"use client";

import ElementIcon from "./ElementIcon";
import type { PlacedNode } from "@/lib/microgridElements";

interface CanvasNodeProps {
    node: PlacedNode;
    isSelected: boolean;
    onMouseDown: (e: React.MouseEvent, nodeId: string) => void;
    onPortMouseDown: (e: React.MouseEvent, nodeId: string, portId: string) => void;
}

export default function CanvasNode({ node, isSelected, onMouseDown, onPortMouseDown }: CanvasNodeProps) {
    return (
        <div
            className="absolute group"
            style={{
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
                zIndex: isSelected ? 20 : 10,
            }}
            onMouseDown={(e) => onMouseDown(e, node.id)}
        >
            {/* Body */}
            <div
                className={`
          w-full h-full rounded-xl flex flex-col items-center justify-center
          transition-shadow duration-150
          ${isSelected ? "ring-2 ring-blue-400 shadow-lg shadow-blue-500/20" : "hover:ring-1 hover:ring-gray-600"}
        `}
                style={{
                    background: `linear-gradient(135deg, ${node.color}22, ${node.color}11)`,
                    border: `1.5px solid ${node.color}55`,
                }}
            >
                <ElementIcon icon={node.icon} size={Math.min(node.width, node.height) * 0.55} color={node.color} />
                <span
                    className="text-[9px] font-medium mt-0.5 px-1 text-center leading-tight truncate w-full"
                    style={{ color: node.color }}
                >
                    {node.label}
                </span>
            </div>

            {/* Ports */}
            {node.ports.map((port) => {
                const isInput = port.type === "input";

                return (
                    <div key={port.id} className="absolute" style={{ left: port.x - 7, top: port.y - 7, zIndex: 30 }}>
                        {/* Port dot */}
                        <div
                            className={`
                                w-3.5 h-3.5 rounded-full border-2 cursor-pointer transition-all duration-150
                                ${isInput ? "border-blue-400 bg-blue-400/20" : "border-emerald-400 bg-emerald-400/20"}
                                hover:scale-125
                            `}
                            onMouseDown={(e) => onPortMouseDown(e, node.id, port.id)}
                        >
                            <div
                                className={`absolute inset-[3px] rounded-full ${isInput ? "bg-blue-400" : "bg-emerald-400"}`}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

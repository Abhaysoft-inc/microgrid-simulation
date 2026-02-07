"use client";

import { useState, useRef, useCallback, useEffect, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import microgridElements, { categories } from "@/lib/microgridElements";
import type { PlacedNode, Wire } from "@/lib/microgridElements";
import ElementIcon from "./ElementIcon";
import CanvasNode from "./CanvasNode";
import PropertiesPanel from "./PropertiesPanel";

const DesignerScene3D = lazy(() => import("./DesignerScene3D"));

// ─── helpers ──────────────────────────────────────────────
let _id = 1;
const uid = () => `node_${_id++}`;

export default function MicrogridDesigner() {
    const router = useRouter();

    // ── state ──
    const [nodes, setNodes] = useState<PlacedNode[]>([]);
    const [wires, setWires] = useState<Wire[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [movingNode, setMovingNode] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
    const [connecting, setConnecting] = useState<{ fromNode: string; fromPort: string; fromPortType: "input" | "output"; x: number; y: number } | null>(null);
    const [mouse, setMouse] = useState({ x: 0, y: 0 });
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
    const [sidebarSearch, setSidebarSearch] = useState("");
    const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});
    const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
    const canvasRef = useRef<HTMLDivElement>(null);

    // ─── screen → canvas coords ───────────────────────────
    const toCanvas = useCallback(
        (clientX: number, clientY: number) => {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return { x: 0, y: 0 };
            return {
                x: (clientX - rect.left - pan.x) / zoom,
                y: (clientY - rect.top - pan.y) / zoom,
            };
        },
        [pan, zoom]
    );

    // ─── Sidebar drag ─────────────────────────────────────
    const onSidebarDragStart = (e: React.DragEvent, elType: string) => {
        e.dataTransfer.setData("elType", elType);
        e.dataTransfer.effectAllowed = "copy";
    };

    // ─── Canvas drop ──────────────────────────────────────
    const onCanvasDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const elType = e.dataTransfer.getData("elType");
        if (!elType) return;
        const tpl = microgridElements.find((el) => el.type === elType);
        if (!tpl) return;
        const pos = toCanvas(e.clientX, e.clientY);
        const id = uid();
        setNodes((prev) => [
            ...prev,
            {
                id,
                type: tpl.type,
                label: tpl.label,
                category: tpl.category,
                x: pos.x - tpl.width / 2,
                y: pos.y - tpl.height / 2,
                width: tpl.width,
                height: tpl.height,
                color: tpl.color,
                icon: tpl.icon,
                ports: tpl.ports.map((p) => ({ ...p })),
                props: { ...tpl.props },
            },
        ]);
        setSelected(id);
    };

    // ─── Node movement ────────────────────────────────────
    const onNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return;
        const pos = toCanvas(e.clientX, e.clientY);
        setMovingNode({ id: nodeId, offsetX: pos.x - node.x, offsetY: pos.y - node.y });
        setSelected(nodeId);
    };

    // ─── Port click (start / finish wire) ─────────────────
    const onPortMouseDown = (e: React.MouseEvent, nodeId: string, portId: string) => {
        e.stopPropagation();
        const node = nodes.find((n) => n.id === nodeId);
        const port = node?.ports.find((p) => p.id === portId);
        if (!node || !port) return;
        const absX = node.x + port.x;
        const absY = node.y + port.y;

        if (!connecting) {
            // Start a new connection from this port
            setConnecting({ fromNode: nodeId, fromPort: portId, fromPortType: port.type, x: absX, y: absY });
        } else {
            // Don't connect to the same node
            if (connecting.fromNode === nodeId) {
                setConnecting(null);
                return;
            }

            const wireId = `w_${Date.now()}`;
            setWires((prev) => [
                ...prev,
                { id: wireId, fromNode: connecting.fromNode, fromPort: connecting.fromPort, toNode: nodeId, toPort: portId },
            ]);
            setConnecting(null);
        }
    };

    // ─── Global mouse handlers ────────────────────────────
    const onCanvasMouseMove = (e: React.MouseEvent) => {
        const pos = toCanvas(e.clientX, e.clientY);
        setMouse(pos);
        if (movingNode) {
            setNodes((prev) =>
                prev.map((n) => n.id === movingNode.id ? { ...n, x: pos.x - movingNode.offsetX, y: pos.y - movingNode.offsetY } : n)
            );
        }
        if (isPanning && panStart) {
            setPan({ x: pan.x + (e.clientX - panStart.x), y: pan.y + (e.clientY - panStart.y) });
            setPanStart({ x: e.clientX, y: e.clientY });
        }
    };

    const onCanvasMouseUp = () => { setMovingNode(null); setIsPanning(false); setPanStart(null); };

    const onCanvasMouseDown = (e: React.MouseEvent) => {
        if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
            setIsPanning(true);
            setPanStart({ x: e.clientX, y: e.clientY });
            return;
        }
        if (e.target === canvasRef.current || (e.target as HTMLElement).closest(".canvas-bg")) {
            setSelected(null);
            if (connecting) setConnecting(null);
        }
    };

    // ─── Zoom with wheel ─────────────────────────────────
    useEffect(() => {
        const el = canvasRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            setZoom((z) => Math.min(3, Math.max(0.2, z + delta)));
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, []);

    // ─── Delete node / wire ───────────────────────────────
    const deleteSelected = () => {
        if (!selected) return;
        setWires((prev) => prev.filter((w) => w.fromNode !== selected && w.toNode !== selected));
        setNodes((prev) => prev.filter((n) => n.id !== selected));
        setSelected(null);
    };

    const deleteWire = (wireId: string) => {
        setWires((prev) => prev.filter((w) => w.id !== wireId));
    };

    // ─── Keyboard shortcuts ───────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Delete" || e.key === "Backspace") {
                if ((document.activeElement as HTMLElement)?.tagName === "INPUT") return;
                deleteSelected();
            }
            if (e.key === "Escape") { setConnecting(null); setSelected(null); }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected, nodes]);

    // ─── Update node props ────────────────────────────────
    const updateNodeProps = (nodeId: string, newProps: Record<string, unknown>) => {
        setNodes((prev) =>
            prev.map((n) => {
                if (n.id !== nodeId) return n;
                if ("__label" in newProps) return { ...n, label: newProps.__label as string };
                return { ...n, props: { ...n.props, ...newProps } as Record<string, number | string> };
            })
        );
    };

    // ─── Port absolute position helper ────────────────────
    const portPos = (nodeId: string, portId: string) => {
        const node = nodes.find((n) => n.id === nodeId);
        const port = node?.ports.find((p) => p.id === portId);
        if (!node || !port) return { x: 0, y: 0 };
        return { x: node.x + port.x, y: node.y + port.y };
    };

    const wirePath = (x1: number, y1: number, x2: number, y2: number) => {
        const dx = Math.abs(x2 - x1) * 0.5;
        return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
    };

    // ─── Sidebar filtered elements ────────────────────────
    const filtered = microgridElements.filter((el) =>
        el.label.toLowerCase().includes(sidebarSearch.toLowerCase())
    );
    const selectedNode = nodes.find((n) => n.id === selected) ?? null;

    // ══════════════════════════════════════════════════════
    // SIMULATE: Extract grid parameters and navigate
    // ══════════════════════════════════════════════════════
    const handleSimulate = () => {
        // Sum up solar capacity from all solar panels
        const solarNodes = nodes.filter(n => n.type === "solar_panel");
        const totalSolar = solarNodes.reduce((sum, n) => sum + (Number(n.props.power_kw) || 5), 0);

        // Sum up battery capacity + average SOC
        const batteryNodes = nodes.filter(n => n.type === "battery");
        const totalBatteryKwh = batteryNodes.reduce((sum, n) => sum + (Number(n.props.capacity_kwh) || 10), 0);
        const avgSoc = batteryNodes.length > 0
            ? batteryNodes.reduce((sum, n) => sum + (Number(n.props.soc) || 50), 0) / batteryNodes.length / 100
            : 0.5;

        // Sum up all load demands
        const loadNodes = nodes.filter(n => ["residential_load", "commercial_load"].includes(n.type));
        const totalLoad = loadNodes.reduce((sum, n) => {
            return sum + (Number(n.props.demand_kw) || Number(n.props.power_kw) || 7);
        }, 0);

        // Build query params for the simulation page
        const params = new URLSearchParams({
            solar_capacity_kw: String(Math.min(Math.max(totalSolar || 5, 1), 20)),
            battery_capacity_kwh: String(Math.min(Math.max(totalBatteryKwh || 10, 1), 100)),
            initial_soc: String(Math.min(Math.max(avgSoc || 0.5, 0.2), 1.0)),
            peak_load_demand: String(Math.min(Math.max(totalLoad || 7, 1), 20)),
            from_designer: "true",
        });

        // Store full layout for the simulation page to show
        try {
            localStorage.setItem("microgrid_design", JSON.stringify({ nodes, wires }));
        } catch { /* ignore */ }

        router.push(`/vlabs-simulation?${params.toString()}`);
    };

    // ─── Validation summary ───────────────────────────────
    const hasSolar = nodes.some(n => n.type === "solar_panel");
    const hasGrid = nodes.some(n => n.type === "grid_connection");
    const hasBattery = nodes.some(n => n.type === "battery");
    const hasLoad = nodes.some(n => ["residential_load", "commercial_load"].includes(n.type));
    const canSimulate = hasSolar && hasBattery && hasLoad;

    return (
        <div className="flex h-screen w-screen bg-[#0f1117] text-white overflow-hidden select-none">
            {/* ══════════════ LEFT TOOLBAR ══════════════ */}
            <div className="flex flex-col items-center w-12 bg-[#1a1d27] border-r border-gray-800 py-3 gap-2">
                {/* Home */}
                <button title="Back to Simulation" onClick={() => router.push("/vlabs-simulation")} className="p-2 rounded hover:bg-gray-700 transition text-gray-400 hover:text-white">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                </button>
                <div className="my-1 h-px bg-gray-700 w-6" />
                <button title="Reset view" onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }} className="p-2 rounded hover:bg-gray-700 transition text-gray-400 hover:text-white">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 9-9" /><path d="M3 3v6h6" /></svg>
                </button>
                <button title="Zoom in" onClick={() => setZoom((z) => Math.min(3, z + 0.2))} className="p-2 rounded hover:bg-gray-700 transition text-gray-400 hover:text-white">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                </button>
                <button title="Zoom out" onClick={() => setZoom((z) => Math.max(0.2, z - 0.2))} className="p-2 rounded hover:bg-gray-700 transition text-gray-400 hover:text-white">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                </button>
                <div className="my-1 h-px bg-gray-700 w-6" />
                <button title="2D View" onClick={() => setViewMode("2d")} className={`p-2 rounded transition ${viewMode === "2d" ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-700 hover:text-white"}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="12" y1="3" x2="12" y2="21" /></svg>
                </button>
                <button title="3D View" onClick={() => setViewMode("3d")} className={`p-2 rounded transition ${viewMode === "3d" ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-700 hover:text-white"}`}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
                </button>
                <div className="my-1 h-px bg-gray-700 w-6" />

                <div className="flex-1" />
                <span className="text-[10px] text-gray-500">{viewMode === "2d" ? `${Math.round(zoom * 100)}%` : "3D"}</span>
            </div>

            {/* ══════════════ CANVAS ══════════════ */}
            {viewMode === "3d" ? (
                <div className="flex-1 relative overflow-hidden">
                    <Suspense fallback={
                        <div className="flex-1 flex items-center justify-center bg-[#0a0e1a] h-full">
                            <div className="text-center">
                                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-gray-400">Loading 3D environment...</p>
                            </div>
                        </div>
                    }>
                        <DesignerScene3D nodes={nodes} wires={wires} selected={selected} onSelect={setSelected} />
                    </Suspense>
                </div>
            ) : (
                <div
                    ref={canvasRef}
                    className="flex-1 relative overflow-hidden cursor-crosshair"
                    onDrop={onCanvasDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onMouseMove={onCanvasMouseMove}
                    onMouseUp={onCanvasMouseUp}
                    onMouseDown={onCanvasMouseDown}
                    style={{ background: "#0f1117" }}
                >
                    <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0", position: "absolute", top: 0, left: 0, width: "10000px", height: "10000px" }}>
                        {/* Grid pattern */}
                        <svg className="canvas-bg" width="10000" height="10000" style={{ position: "absolute", top: 0, left: 0 }}>
                            <defs>
                                <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e2130" strokeWidth="0.5" />
                                </pattern>
                                <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                                    <rect width="100" height="100" fill="url(#smallGrid)" />
                                    <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#252938" strokeWidth="1" />
                                </pattern>
                            </defs>
                            <rect width="10000" height="10000" fill="url(#grid)" />
                        </svg>

                        {/* Wires */}
                        <svg width="10000" height="10000" style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
                            {wires.map((w) => {
                                const from = portPos(w.fromNode, w.fromPort);
                                const to = portPos(w.toNode, w.toPort);
                                return (
                                    <g key={w.id} style={{ pointerEvents: "auto", cursor: "pointer" }} onClick={() => deleteWire(w.id)}>
                                        <path d={wirePath(from.x, from.y, to.x, to.y)} fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" />
                                        <path d={wirePath(from.x, from.y, to.x, to.y)} fill="none" stroke="transparent" strokeWidth="12" />
                                    </g>
                                );
                            })}
                            {connecting && (
                                <path d={wirePath(connecting.x, connecting.y, mouse.x, mouse.y)} fill="none" stroke="#4ade80" strokeWidth="2" strokeDasharray="6,4" strokeLinecap="round" style={{ pointerEvents: "none" }} />
                            )}
                        </svg>

                        {/* Nodes */}
                        {nodes.map((node) => (
                            <CanvasNode key={node.id} node={node} isSelected={selected === node.id} onMouseDown={onNodeMouseDown} onPortMouseDown={onPortMouseDown} />
                        ))}
                    </div>

                    {/* Empty state */}
                    {nodes.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center text-gray-600">
                                <svg className="mx-auto mb-4" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity={0.4}>
                                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                                    <line x1="12" y1="22.08" x2="12" y2="12" />
                                </svg>
                                <p className="text-lg font-medium">Drag components from the sidebar</p>
                                <p className="text-sm mt-1">Click on ports to create connections</p>
                            </div>
                        </div>
                    )}

                    {/* Connection hint overlay — shown when drawing a wire */}
                    {connecting && (
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                            <div className="bg-gray-900/90 backdrop-blur border border-gray-700 rounded-lg px-4 py-2 shadow-xl flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${connecting.fromPortType === "output" ? "bg-emerald-400" : "bg-blue-400"}`} />
                                <span className="text-xs text-gray-300">
                                    Connecting from <span className={`font-semibold ${connecting.fromPortType === "output" ? "text-emerald-400" : "text-blue-400"}`}>{connecting.fromPortType.toUpperCase()}</span>
                                    {" → click on "}
                                    <span className={`font-semibold ${connecting.fromPortType === "output" ? "text-blue-400" : "text-emerald-400"}`}>
                                        {connecting.fromPortType === "output" ? "INPUT" : "OUTPUT"}
                                    </span>
                                    {" port"}
                                </span>
                                <span className="text-[10px] text-gray-500 ml-2">(ESC to cancel)</span>
                            </div>
                        </div>
                    )}
                </div>
            )}



            {/* ══════════════ RIGHT SIDEBAR ══════════════ */}
            <div className="w-72 bg-[#1a1d27] border-l border-gray-800 flex flex-col">
                {/* Tab header */}
                <div className="px-4 py-3 border-b border-gray-800">
                    <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                        {selectedNode ? "Properties" : "Components"}
                    </h2>
                </div>

                {selectedNode ? (
                    <PropertiesPanel node={selectedNode} onUpdate={updateNodeProps} onDelete={deleteSelected} onBack={() => setSelected(null)} />
                ) : (
                    <>
                        {/* Search */}
                        <div className="px-3 py-2">
                            <input
                                type="text"
                                placeholder="Search components..."
                                value={sidebarSearch}
                                onChange={(e) => setSidebarSearch(e.target.value)}
                                className="w-full bg-[#252938] text-sm rounded-md px-3 py-1.5 text-gray-300 placeholder-gray-600 outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        {/* Component list */}
                        <div className="flex-1 overflow-y-auto px-2 pb-4">
                            {categories.map((cat) => {
                                const items = filtered.filter((e) => e.category === cat);
                                if (items.length === 0) return null;
                                const collapsed = collapsedCats[cat];
                                return (
                                    <div key={cat} className="mb-1">
                                        <button
                                            className="flex items-center gap-1 w-full px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 transition"
                                            onClick={() => setCollapsedCats((c) => ({ ...c, [cat]: !c[cat] }))}
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${collapsed ? "" : "rotate-90"}`}>
                                                <polyline points="9 18 15 12 9 6" />
                                            </svg>
                                            {cat}
                                        </button>
                                        {!collapsed && (
                                            <div className="grid grid-cols-2 gap-1.5 px-1 pb-1">
                                                {items.map((el) => (
                                                    <div
                                                        key={el.type}
                                                        draggable
                                                        onDragStart={(e) => onSidebarDragStart(e, el.type)}
                                                        className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[#252938] hover:bg-[#2e3348] cursor-grab active:cursor-grabbing transition border border-transparent hover:border-gray-700"
                                                    >
                                                        <ElementIcon icon={el.icon} size={36} color={el.color} />
                                                        <span className="text-[10px] text-gray-400 text-center leading-tight">{el.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}

                {/* ─── Simulate Button ─── */}
                <div className="border-t border-gray-800 p-3 space-y-2">
                    {/* Grid status */}
                    <div className="space-y-1 text-[10px]">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${hasSolar ? "bg-amber-400" : "bg-gray-600"}`} />
                            <span className={hasSolar ? "text-amber-400" : "text-gray-600"}>Solar ({nodes.filter(n => n.type === "solar_panel").length})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${hasGrid ? "bg-violet-400" : "bg-gray-600"}`} />
                            <span className={hasGrid ? "text-violet-400" : "text-gray-600"}>Grid ({nodes.filter(n => n.type === "grid_connection").length})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${hasBattery ? "bg-emerald-400" : "bg-gray-600"}`} />
                            <span className={hasBattery ? "text-emerald-400" : "text-gray-600"}>Battery ({nodes.filter(n => n.type === "battery").length})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${hasLoad ? "bg-red-400" : "bg-gray-600"}`} />
                            <span className={hasLoad ? "text-red-400" : "text-gray-600"}>Load ({nodes.filter(n => ["residential_load", "commercial_load"].includes(n.type)).length})</span>
                        </div>
                    </div>

                    <button
                        onClick={handleSimulate}
                        disabled={!canSimulate}
                        className={`w-full py-2.5 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2
              ${canSimulate
                                ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-600/20"
                                : "bg-gray-800 text-gray-600 cursor-not-allowed"
                            }`}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        Simulate This Grid
                    </button>
                    {!canSimulate && (
                        <p className="text-[10px] text-gray-600 text-center">Add at least 1 Solar + 1 Battery + 1 Load</p>
                    )}
                </div>
            </div>
        </div>
    );
}

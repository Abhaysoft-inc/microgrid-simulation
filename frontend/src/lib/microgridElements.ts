// ─── Microgrid Element Definitions ──────────────────────────────
// All available microgrid component types for the drag-and-drop designer.

export interface Port {
    id: string;
    type: "input" | "output";
    x: number;
    y: number;
    side: "left" | "right";
}

export interface MicrogridElement {
    type: string;
    label: string;
    category: string;
    color: string;
    width: number;
    height: number;
    ports: Port[];
    icon: string;
    props: Record<string, number | string>;
}

export interface PlacedNode extends MicrogridElement {
    id: string;
    x: number;
    y: number;
}

export interface Wire {
    id: string;
    fromNode: string;
    fromPort: string;
    toNode: string;
    toPort: string;
}

const microgridElements: MicrogridElement[] = [
    // ── Sources ──
    {
        type: "solar_panel",
        label: "Solar Panel",
        category: "Sources",
        color: "#f59e0b",
        width: 100,
        height: 70,
        ports: [{ id: "out", type: "output", x: 100, y: 35, side: "right" }],
        icon: "solar",
        props: { power_kw: 5, efficiency: 0.2 },
    },
    {
        type: "grid_connection",
        label: "Utility Grid",
        category: "Sources",
        color: "#8b5cf6",
        width: 90,
        height: 70,
        ports: [
            { id: "out", type: "output", x: 90, y: 25, side: "right" },
            { id: "in", type: "input", x: 0, y: 25, side: "left" },
        ],
        icon: "grid",
        props: { max_import_kw: 100, max_export_kw: 50 },
    },

    // ── Storage ──
    {
        type: "battery",
        label: "Battery Bank",
        category: "Storage",
        color: "#10b981",
        width: 90,
        height: 70,
        ports: [
            { id: "in", type: "input", x: 0, y: 35, side: "left" },
            { id: "out", type: "output", x: 90, y: 35, side: "right" },
        ],
        icon: "battery",
        props: { capacity_kwh: 10, soc: 50 },
    },

    // ── Loads ──
    {
        type: "residential_load",
        label: "Residential Load",
        category: "Loads",
        color: "#ef4444",
        width: 90,
        height: 70,
        ports: [{ id: "in", type: "input", x: 0, y: 35, side: "left" }],
        icon: "house",
        props: { demand_kw: 7 },
    },
    {
        type: "commercial_load",
        label: "Commercial Load",
        category: "Loads",
        color: "#f97316",
        width: 90,
        height: 70,
        ports: [{ id: "in", type: "input", x: 0, y: 35, side: "left" }],
        icon: "building",
        props: { demand_kw: 15 },
    },
];

export const categories = [...new Set(microgridElements.map((e) => e.category))];

export default microgridElements;

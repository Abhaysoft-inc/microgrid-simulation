"use client";

import React from "react";
import dynamic from "next/dynamic";

// Dynamic import using factory to avoid 'plotly.js/dist/plotly' resolution error
const Plot = dynamic(async () => {
    const Plotly = await import("plotly.js-dist-min");
    const createPlotlyComponent = (await import("react-plotly.js/factory")).default;
    return createPlotlyComponent(Plotly.default || Plotly);
}, {
    ssr: false,
    loading: () => <div className="h-[400px] flex items-center justify-center bg-slate-50 text-slate-400">Loading Chart...</div>
});

interface HourlyData {
    hour: number;
    solar_generation: number;
    load_demand: number;
    battery_soc: number;
    grid_usage: number;
    battery_charge: number;
    battery_discharge: number;
    hourly_cost: number;
    is_peak_hour: boolean;
}

interface EnergyFlowD3Props {
    data: HourlyData[];
    currentHour: number;
    strategy: "baseline" | "smart";
}

export default function EnergyFlowD3({ data, currentHour, strategy }: EnergyFlowD3Props) {
    if (!data || data.length === 0) return <div>No Data</div>;

    const hours = data.map(h => `${h.hour}:00`);

    // Prepare data traces based on index.html style
    const plotData: any[] = [
        {
            x: hours,
            y: data.map(h => h.load_demand),
            name: 'Load Demand',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#e74c3c', width: 3 }
        },
        {
            x: hours,
            y: data.map(h => h.solar_generation),
            name: 'Solar Generation',
            type: 'scatter',
            mode: 'lines',
            fill: 'tozeroy',
            line: { color: '#f39c12', width: 2 }
        },
        // Grid Purchase (assuming grid_usage represents purchase when positive)
        {
            x: hours,
            y: data.map(h => Math.max(0, h.grid_usage)),
            name: 'Grid Purchase',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#e67e22', width: 2, dash: 'dot' }
        }
    ];

    // Add current hour indicator line
    const currentHourMax = Math.max(
        ...data.map(d => Math.max(d.load_demand, d.solar_generation, d.grid_usage))
    ) * 1.1;

    const shapes = [
        {
            type: 'line' as const,
            x0: `${currentHour}:00`,
            y0: 0,
            x1: `${currentHour}:00`,
            y1: currentHourMax,
            line: {
                color: 'rgba(0,0,0,0.3)',
                width: 2,
                dash: 'dash'
            }
        }
    ];

    return (
        <div className="w-full h-full">
            {/* @ts-expect-error Plotly types are complex, using any for simplicity */}
            <Plot
                data={plotData}
                layout={{
                    height: 300,
                    margin: { t: 20, r: 20, b: 40, l: 50 },
                    xaxis: {
                        title: 'Hour of Day',
                        showgrid: true,
                        gridcolor: '#e5e7eb',
                        dtick: 4
                    },
                    yaxis: {
                        title: 'kW',
                        showgrid: true,
                        gridcolor: '#e5e7eb'
                    },
                    legend: { orientation: 'h', y: -0.3 },
                    shapes: shapes,
                    hovermode: 'x unified',
                    showlegend: true,
                    autosize: true,
                    font: { family: 'inherit', size: 11 }
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: "100%", height: "100%" }}
            />
        </div>
    );
}

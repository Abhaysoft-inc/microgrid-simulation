"use client";

import dynamic from "next/dynamic";

const MicrogridDesigner = dynamic(() => import("@/components/designer/MicrogridDesigner"), {
    ssr: false,
    loading: () => (
        <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400 text-lg">Loading Microgrid Designer...</p>
            </div>
        </div>
    ),
});

export default function MicrogridDesignerPage() {
    return <MicrogridDesigner />;
}

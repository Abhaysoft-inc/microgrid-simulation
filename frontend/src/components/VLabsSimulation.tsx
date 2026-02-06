"use client";

/**
 * VLabs Simulation Component
 * ==========================
 * Main container implementing VLabs-style interactive microgrid simulation.
 * 
 * Features:
 * - Step-by-step procedure walkthrough
 * - Three.js 3D microgrid visualization
 * - D3.js real-time energy flow charts
 * - p5.js animated components
 */

import React, { useState, useCallback, useEffect } from "react";
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Sun, Battery, Home, Zap, Settings, BarChart3, BookOpen, FlaskConical, CheckSquare, FileText, CheckCircle2, XCircle, LayoutList, Lightbulb, HelpCircle, X, Award, Leaf, TrendingUp, Target, AlertTriangle, CloudRain, BatteryWarning, MessageSquare, MoreVertical, Maximize, Download, Monitor, Smartphone } from "lucide-react";
import Microgrid3DScene from "./Microgrid3DScene";
import Microgrid2DScene from "./Microgrid2DScene";
import EnergyFlowD3 from "./EnergyFlowD3";
import FeedbackTab from "./FeedbackTab";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://microgrid-simulation.onrender.com";

// Simulation steps for the procedure
const PROCEDURE_STEPS = [
    {
        id: 1,
        title: "Initialize Microgrid",
        description: "Set the battery capacity (kWh) and initial state of charge. The battery stores excess solar energy for later use.",
        action: "configure",
        icon: Battery,
    },
    {
        id: 2,
        title: "Set Energy Prices",
        description: "Configure peak (₹8/kWh, 2PM-10PM) and off-peak (₹5/kWh) electricity prices. Smart strategy uses these to minimize costs.",
        action: "pricing",
        icon: Settings,
    },
    {
        id: 3,
        title: "Run Baseline Strategy",
        description: "Simulate 24 hours with baseline approach: Solar powers load directly, grid fills any deficit, battery remains idle.",
        action: "baseline",
        icon: Zap,
    },
    {
        id: 4,
        title: "Run Smart Strategy",
        description: "Simulate with intelligent scheduling: Charge battery when solar exceeds load, discharge during peak hours to reduce grid usage.",
        action: "smart",
        icon: FlaskConical,
    },
    {
        id: 5,
        title: "Analyze Results",
        description: "Compare costs and grid usage between strategies. Smart strategy achieves peak shaving and cost reduction.",
        action: "analyze",
        icon: BarChart3,
    },
];

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

interface Summary {
    baseline_total_cost: number;
    smart_total_cost: number;
    cost_saved: number;
    cost_saved_percent: number;
    baseline_grid_usage: number;
    smart_grid_usage: number;
    grid_reduced: number;
    grid_reduced_percent: number;
    battery_capacity_kwh: number;
}

interface SimulationResult {
    baseline_data: HourlyData[];
    smart_data: HourlyData[];
    summary: Summary;
}

// AI Hint Engine Types
interface SimulationHistoryItem {
    eco_score: number;
    cost_saved_percent: number;
    grid_reduced_percent: number;
    battery_utilization: number;
    solar_utilization: number;
    battery_empty_during_peak: boolean;
    battery_full_during_solar: boolean;
    charging_during_peak: boolean;
}

interface AIHint {
    should_show_hint: boolean;
    hint_title: string;
    hint_message: string;
    suggestion_type: "battery" | "solar" | "pricing" | "general";
    confidence: number;
}

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export default function VLabsSimulation() {
    // Tab state
    const [activeTab, setActiveTab] = useState<"theory" | "procedure" | "simulation" | "analysis" | "quiz" | "references" | "feedback">("theory");

    // Procedure step state
    const [currentStep, setCurrentStep] = useState(0);
    const [completedSteps, setCompletedSteps] = useState<number[]>([]);

    // Simulation parameters
    const [batteryCapacity, setBatteryCapacity] = useState(10);
    const [initialSoC, setInitialSoC] = useState(50);
    const [solarCapacity, setSolarCapacity] = useState(5);
    const [weatherMode, setWeatherMode] = useState<"sunny" | "cloudy">("sunny");
    const [peakLoadDemand, setPeakLoadDemand] = useState(7); // Peak load demand in kW (default 7kW for Delhi residential)
    // 3-tier Time-of-Day (ToD) pricing
    const [offPeakPrice, setOffPeakPrice] = useState(4);
    const [standardPrice, setStandardPrice] = useState(6.5);
    const [peakPrice, setPeakPrice] = useState(8.5);

    // Simulation state
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<SimulationResult | null>(null);
    const [activeStrategy, setActiveStrategy] = useState<"baseline" | "smart">("smart");

    // Animation state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentHour, setCurrentHour] = useState(6);
    const [animationSpeed] = useState(1000);
    const [showReportCard, setShowReportCard] = useState(false);
    const [reportCardShown, setReportCardShown] = useState(false); // Track if report was already shown for this run

    // Collapsible panels state
    const [isEnergyFlowExpanded, setIsEnergyFlowExpanded] = useState(false);
    const [isEnergyFlowMaximized, setIsEnergyFlowMaximized] = useState(false);
    const [isBillExpanded, setIsBillExpanded] = useState(false);
    const [isBatteryExpanded, setIsBatteryExpanded] = useState(false);

    // AI Hint Engine State
    const [simulationHistory, setSimulationHistory] = useState<SimulationHistoryItem[]>([]);
    const [aiHint, setAiHint] = useState<AIHint | null>(null);
    const [showHintPanel, setShowHintPanel] = useState(false);
    const [isLoadingHint, setIsLoadingHint] = useState(false);
    const [isCostEfficiencyExpanded, setIsCostEfficiencyExpanded] = useState(false);

    // Chat state
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [showChatMode, setShowChatMode] = useState(false);

    // Visualization mode - 2D for low-end devices, 3D for better hardware
    const [visualizationMode, setVisualizationMode] = useState<"3d" | "2d">("3d");

    // Challenge/Scenario state
    const [showChallengeModal, setShowChallengeModal] = useState(false);
    const [selectedChallenge, setSelectedChallenge] = useState<number | null>(null);
    const [challengeDifficulty, setChallengeDifficulty] = useState<"easy" | "medium" | "hard">("medium");
    const [activeChallenge, setActiveChallenge] = useState<{ id: number; difficulty: string } | null>(null);

    // Challenge definitions
    const challenges = [
        {
            id: 1,
            title: "Load Shedding Emergency",
            icon: AlertTriangle,
            iconColor: "text-amber-500",
            description: "The grid utility has announced scheduled load shedding (power cuts) from 6 PM to 10 PM during peak hours. You must ensure your battery has enough charge to power essential loads during this blackout period.",
            objective: "Maintain power supply during 6 PM - 10 PM blackout",
            difficulty: {
                easy: { batteryCapacity: 15, initialSoC: 80, solarCapacity: 7 },
                medium: { batteryCapacity: 10, initialSoC: 50, solarCapacity: 5 },
                hard: { batteryCapacity: 7, initialSoC: 30, solarCapacity: 4 }
            },
            hints: {
                easy: "Large battery with high charge - straightforward",
                medium: "Balanced setup - plan your charging wisely",
                hard: "Limited capacity - requires optimal strategy"
            }
        },
        {
            id: 2,
            title: "Monsoon Cloudy Day",
            icon: CloudRain,
            iconColor: "text-blue-500",
            description: "Heavy monsoon clouds have reduced solar generation by 60%. You must manage your energy consumption carefully and rely more on stored battery power and grid during off-peak hours.",
            objective: "Minimize costs with severely reduced solar output",
            difficulty: {
                easy: { batteryCapacity: 15, initialSoC: 90, solarCapacity: 3 },
                medium: { batteryCapacity: 10, initialSoC: 60, solarCapacity: 2 },
                hard: { batteryCapacity: 8, initialSoC: 40, solarCapacity: 1 }
            },
            hints: {
                easy: "Fully charged battery to compensate",
                medium: "Balance grid usage with battery reserves",
                hard: "Minimal solar and battery - every kWh counts"
            }
        },
        {
            id: 3,
            title: "Peak Demand Surge",
            icon: Zap,
            iconColor: "text-red-500",
            description: "A heatwave has caused AC usage to spike! Peak electricity prices have doubled to ₹17/kWh. Your goal is to minimize electricity costs by smartly using your battery during these expensive hours.",
            objective: "Keep daily cost under ₹100 despite surge pricing",
            difficulty: {
                easy: { batteryCapacity: 20, initialSoC: 70, solarCapacity: 7, peakPrice: 12 },
                medium: { batteryCapacity: 12, initialSoC: 50, solarCapacity: 5, peakPrice: 15 },
                hard: { batteryCapacity: 8, initialSoC: 30, solarCapacity: 4, peakPrice: 17 }
            },
            hints: {
                easy: "Large battery buffer for peak hours",
                medium: "Strategic charging before peak period",
                hard: "Extreme prices - maximize solar storage"
            }
        },
        {
            id: 4,
            title: "Battery Degradation",
            icon: BatteryWarning,
            iconColor: "text-orange-500",
            description: "Your battery has degraded to only 60% of its original capacity due to age. You must work with limited storage while still trying to achieve cost savings through smart scheduling.",
            objective: "Achieve 10% cost savings with degraded battery",
            difficulty: {
                easy: { batteryCapacity: 8, initialSoC: 80, solarCapacity: 6 },
                medium: { batteryCapacity: 6, initialSoC: 50, solarCapacity: 5 },
                hard: { batteryCapacity: 4, initialSoC: 30, solarCapacity: 4 }
            },
            hints: {
                easy: "Small but well-charged battery",
                medium: "Limited capacity - time your usage",
                hard: "Severely degraded - every cycle matters"
            }
        }
    ];

    // Animation loop
    useEffect(() => {
        if (!isPlaying || !result) return;

        const interval = setInterval(() => {
            setCurrentHour((prev) => {
                if (prev === 23) {
                    setIsPlaying(false);
                    // Only show report card if it hasn't been shown yet for this run
                    if (!reportCardShown) {
                        setShowReportCard(true);
                        setReportCardShown(true);
                    }
                    return 23;
                }
                return prev + 1;
            });
        }, animationSpeed);

        return () => clearInterval(interval);
    }, [isPlaying, result, animationSpeed, reportCardShown]);

    // Tour state
    const [runTour, setRunTour] = useState(false);
    const [tourSteps] = useState<Step[]>([
        {
            target: '#tour-configuration',
            content: 'Start here! Set your simulation parameters: Solar Capacity, Battery Size, and Weather Mode.',
            placement: 'left',
            disableBeacon: true,
        },
        {
            target: '#tour-run-button',
            content: 'Click "Run Simulation" to generate the energy data based on your configuration.',
            placement: 'left',
        },
        {
            target: '#tour-live-view',
            content: 'Watch the 3D Digital Twin visualize your microgrid operation in real-time. Use the time slider to explore different hours.',
            placement: 'left',
        },
        {
            target: '#tour-procedure-step',
            content: 'View the 24-Hour Energy Flow chart showing solar generation, grid usage, and battery activity over time.',
            placement: 'right',
        },
        {
            target: '#tour-strategy-toggle',
            content: 'Switch between Baseline and Smart strategies to compare energy cost efficiency.',
            placement: 'right',
        },
        {
            target: '#tour-stats-charts',
            content: 'Monitor the live battery status and adjust configuration settings from this panel.',
            placement: 'left',
        },
    ]);

    // Start tour automatically on first visit to simulation tab
    useEffect(() => {
        if (activeTab === "simulation") {
            const hasSeenTour = localStorage.getItem('vlabs-tour-seen');
            if (!hasSeenTour) {
                setRunTour(true);
            }
        }
    }, [activeTab]);

    const handleJoyrideCallback = (data: CallBackProps) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
        if (finishedStatuses.includes(status)) {
            setRunTour(false);
            localStorage.setItem('vlabs-tour-seen', 'true');
            // Scroll to top when tutorial ends
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Generate sample data when API is unavailable
    const generateSampleData = useCallback(() => {
        const generateHourlyData = (isBaseline: boolean): HourlyData[] => {
            const data: HourlyData[] = [];
            let soc = initialSoC;

            // Apply solar capacity factor (base profile assumes 5kW system)
            const capacityFactor = solarCapacity / 5.0;
            // Apply weather efficiency (sunny = 100%, cloudy = 50%)
            const weatherEfficiency = weatherMode === "sunny" ? 1.0 : 0.5;

            for (let hour = 0; hour < 24; hour++) {
                const baseSolar = hour >= 6 && hour <= 18
                    ? 7 * Math.exp(-0.5 * Math.pow((hour - 12) / 3, 2))
                    : 0;
                // Apply capacity and weather factors to solar generation
                const solar = baseSolar * capacityFactor * weatherEfficiency;
                // Base load profile (peak is 7kW at hour 19)
                const baseLoadProfile = [1.5, 1.5, 1.5, 1.5, 2.0, 2.5, 3.5, 4.0, 4.5, 3.5, 3.0, 2.5, 2.5, 2.5, 3.0, 3.5, 4.0, 5.0, 6.5, 7.0, 6.5, 5.5, 4.0, 2.5][hour];
                // Scale load based on user's peak demand (7kW is the base peak)
                const load = baseLoadProfile * (peakLoadDemand / 7.0);
                const isPeak = hour >= 14 && hour < 22;
                const price = isPeak ? peakPrice : offPeakPrice;

                let gridUsage = 0;
                let batteryCharge = 0;
                let batteryDischarge = 0;

                if (isBaseline) {
                    gridUsage = Math.max(0, load - solar);
                } else {
                    const deficit = load - solar;
                    if (deficit < 0 && soc < 100) {
                        batteryCharge = Math.min(-deficit * 0.95, (100 - soc) / 100 * batteryCapacity);
                        soc += batteryCharge / batteryCapacity * 100;
                    } else if (deficit > 0 && isPeak && soc > 20) {
                        batteryDischarge = Math.min(deficit, (soc - 20) / 100 * batteryCapacity * 0.95);
                        soc -= batteryDischarge / batteryCapacity * 100;
                        gridUsage = Math.max(0, deficit - batteryDischarge);
                    } else {
                        gridUsage = Math.max(0, deficit);
                    }
                }

                data.push({
                    hour,
                    solar_generation: Math.round(solar * 100) / 100,
                    load_demand: Math.round(load * 100) / 100,
                    battery_soc: Math.round(soc * 10) / 10,
                    grid_usage: Math.round(gridUsage * 100) / 100,
                    battery_charge: Math.round(batteryCharge * 100) / 100,
                    battery_discharge: Math.round(batteryDischarge * 100) / 100,
                    hourly_cost: Math.round(gridUsage * price * 100) / 100,
                    is_peak_hour: isPeak,
                });
            }

            return data;
        };

        const baseline = generateHourlyData(true);
        const smart = generateHourlyData(false);

        const baselineCost = baseline.reduce((sum, d) => sum + d.hourly_cost, 0);
        const smartCost = smart.reduce((sum, d) => sum + d.hourly_cost, 0);
        const baselineGrid = baseline.reduce((sum, d) => sum + d.grid_usage, 0);
        const smartGrid = smart.reduce((sum, d) => sum + d.grid_usage, 0);

        setResult({
            baseline_data: baseline,
            smart_data: smart,
            summary: {
                baseline_total_cost: Math.round(baselineCost * 100) / 100,
                smart_total_cost: Math.round(smartCost * 100) / 100,
                cost_saved: Math.round((baselineCost - smartCost) * 100) / 100,
                cost_saved_percent: Math.round((baselineCost - smartCost) / baselineCost * 1000) / 10,
                baseline_grid_usage: Math.round(baselineGrid * 100) / 100,
                smart_grid_usage: Math.round(smartGrid * 100) / 100,
                grid_reduced: Math.round((baselineGrid - smartGrid) * 100) / 100,
                grid_reduced_percent: Math.round((baselineGrid - smartGrid) / baselineGrid * 1000) / 10,
                battery_capacity_kwh: batteryCapacity,
            },
        });

        setCurrentHour(0);
        setIsPlaying(true);
    }, [batteryCapacity, solarCapacity, weatherMode, peakLoadDemand, initialSoC, peakPrice, offPeakPrice]);

    // Run simulation
    const runSimulation = useCallback(async () => {
        setIsLoading(true);
        setReportCardShown(false); // Reset so report card can show after this run completes

        try {
            const response = await fetch(`${API_URL}/simulate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    battery_capacity_kwh: batteryCapacity,
                    solar_capacity_kw: solarCapacity,
                    weather_mode: weatherMode,
                    peak_load_demand: peakLoadDemand,
                    off_peak_price: offPeakPrice,
                    standard_price: standardPrice,
                    peak_price: peakPrice,
                    initial_soc: initialSoC / 100,
                }),
            });

            if (!response.ok) throw new Error(`Server error: ${response.status}`);

            const data: SimulationResult = await response.json();
            setResult(data);
            setCurrentHour(6);
            setIsPlaying(true);
            setCompletedSteps([...completedSteps, currentStep]);
        }
        catch (err) {
            console.error("Simulation error:", err);
            // Generate sample data for demo
            generateSampleData();
        } finally {
            setIsLoading(false);
        }
    }, [batteryCapacity, solarCapacity, weatherMode, peakLoadDemand, peakPrice, standardPrice, offPeakPrice, initialSoC, currentStep, completedSteps, generateSampleData]);

    // Calculate eco-score and analyze simulation for hints
    const analyzeSimulationForHints = useCallback((simulationResult: SimulationResult) => {
        const data = simulationResult.smart_data;
        const summary = simulationResult.summary;

        // Calculate Eco-Score (0-100)
        // Factors: cost savings (40%), grid reduction (30%), solar utilization (30%)
        const costScore = Math.min(100, summary.cost_saved_percent * 2.5); // Max 40 points
        const gridScore = Math.min(100, summary.grid_reduced_percent * 3.3); // Max 30 points  
        const totalSolar = data.reduce((sum, h) => sum + h.solar_generation, 0);
        const usedSolar = data.reduce((sum, h) => sum + Math.min(h.solar_generation, h.load_demand + h.battery_charge), 0);
        const solarUtilization = totalSolar > 0 ? (usedSolar / totalSolar) * 100 : 0;
        const solarScore = solarUtilization * 0.3; // Max 30 points

        const ecoScore = Math.round(costScore * 0.4 + gridScore * 0.3 + solarScore);

        // Analyze battery behavior
        const peakHours = data.filter(h => h.is_peak_hour);
        const batteryEmptyDuringPeak = peakHours.some(h => h.battery_soc < 25 && h.battery_discharge === 0);

        const solarHours = data.filter(h => h.solar_generation > 1);
        const batteryFullDuringSolar = solarHours.some(h => h.battery_soc > 95 && h.battery_charge === 0);

        const chargingDuringPeak = peakHours.some(h => h.battery_charge > 0 && h.grid_usage > 0);

        // Battery utilization: how much of battery capacity was actually cycled
        const maxCharge = Math.max(...data.map(h => h.battery_charge));
        const maxDischarge = Math.max(...data.map(h => h.battery_discharge));
        const batteryUtilization = ((maxCharge + maxDischarge) / (summary.battery_capacity_kwh * 2)) * 100;

        const historyItem: SimulationHistoryItem = {
            eco_score: ecoScore,
            cost_saved_percent: summary.cost_saved_percent,
            grid_reduced_percent: summary.grid_reduced_percent,
            battery_utilization: Math.min(100, batteryUtilization),
            solar_utilization: solarUtilization,
            battery_empty_during_peak: batteryEmptyDuringPeak,
            battery_full_during_solar: batteryFullDuringSolar,
            charging_during_peak: chargingDuringPeak,
        };

        // Update history (keep last 5)
        setSimulationHistory(prev => {
            const newHistory = [...prev, historyItem].slice(-5);
            return newHistory;
        });

        return historyItem;
    }, []);

    // Check for AI hints after simulation - works immediately after first run
    const checkForHints = useCallback(async (newHistory: SimulationHistoryItem[]) => {
        if (newHistory.length < 1) return;

        setIsLoadingHint(true);

        try {
            const response = await fetch(`${API_URL}/hints`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    simulation_history: newHistory.slice(-5), // Send last 5 for context
                    current_config: {
                        battery_capacity: batteryCapacity,
                        solar_capacity: solarCapacity,
                        peak_load_demand: peakLoadDemand,
                        weather_mode: weatherMode,
                        initial_soc: initialSoC,
                    },
                }),
            });

            if (response.ok) {
                const hint: AIHint = await response.json();
                if (hint.should_show_hint) {
                    setAiHint(hint);
                    setShowHintPanel(true);
                }
            }
        } catch (err) {
            console.error("Error fetching AI hint:", err);
            // Generate fallback hint locally
            const latest = newHistory[newHistory.length - 1];
            if (latest.battery_empty_during_peak) {
                setAiHint({
                    should_show_hint: true,
                    hint_title: "💡 Battery Strategy Tip",
                    hint_message: "I noticed your battery is empty during peak hours. Try charging it at 3 AM when the price is lower!",
                    suggestion_type: "battery",
                    confidence: 0.8,
                });
                setShowHintPanel(true);
            }
        } finally {
            setIsLoadingHint(false);
        }
    }, [batteryCapacity, solarCapacity, peakLoadDemand, weatherMode, initialSoC]);

    // Chat with AI assistant
    const sendChatMessage = useCallback(async (message: string) => {
        if (!message.trim()) return;

        const userMessage: ChatMessage = { role: "user", content: message };
        setChatMessages(prev => [...prev, userMessage]);
        setChatInput("");
        setIsChatLoading(true);

        // Compute eco score from history
        const latestEcoScore = simulationHistory.length > 0
            ? simulationHistory[simulationHistory.length - 1].eco_score
            : null;

        try {
            const response = await fetch(`${API_URL}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...chatMessages, userMessage],
                    simulation_context: {
                        battery_capacity: batteryCapacity,
                        solar_capacity: solarCapacity,
                        peak_load_demand: peakLoadDemand,
                        weather_mode: weatherMode,
                        initial_soc: initialSoC,
                        eco_score: latestEcoScore,
                    },
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const assistantMessage: ChatMessage = { role: "assistant", content: data.response };
                setChatMessages(prev => [...prev, assistantMessage]);
            } else {
                setChatMessages(prev => [...prev, {
                    role: "assistant",
                    content: "Sorry, I couldn't process your question. Please try again."
                }]);
            }
        } catch (err) {
            console.error("Chat error:", err);
            setChatMessages(prev => [...prev, {
                role: "assistant",
                content: "Connection error. Please check if the server is running."
            }]);
        } finally {
            setIsChatLoading(false);
        }
    }, [chatMessages, batteryCapacity, solarCapacity, peakLoadDemand, weatherMode, initialSoC, simulationHistory]);

    // Effect to analyze simulation results and check for hints
    useEffect(() => {
        if (result && !reportCardShown) {
            const historyItem = analyzeSimulationForHints(result);
            // Check for hints after adding to history
            setSimulationHistory(prev => {
                const newHistory = [...prev.slice(-4), historyItem];
                checkForHints(newHistory);
                return newHistory;
            });
        }
    }, [result, reportCardShown, analyzeSimulationForHints, checkForHints]);

    // Silent update - just update data without restarting animation (for parameter changes)
    const updateSimulationData = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/simulate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    battery_capacity_kwh: batteryCapacity,
                    solar_capacity_kw: solarCapacity,
                    weather_mode: weatherMode,
                    peak_load_demand: peakLoadDemand,
                    off_peak_price: offPeakPrice,
                    standard_price: standardPrice,
                    peak_price: peakPrice,
                    initial_soc: initialSoC / 100,
                }),
            });

            if (!response.ok) throw new Error(`Server error: ${response.status}`);

            const data: SimulationResult = await response.json();
            setResult(data);
            // Don't reset hour or start playing - just update the data
        } catch (err) {
            console.error("Simulation update error:", err);
            // Generate sample data silently
            const generateHourlyData = (isBaseline: boolean): HourlyData[] => {
                const data: HourlyData[] = [];
                let soc = initialSoC;

                for (let hour = 0; hour < 24; hour++) {
                    const solar = hour >= 6 && hour <= 18
                        ? solarCapacity * Math.exp(-0.5 * Math.pow((hour - 12) / 3, 2))
                        : 0;
                    // Base load profile (peak is 7kW at hour 19)
                    const baseLoadProfile = [1.5, 1.5, 1.5, 1.5, 2.0, 2.5, 3.5, 4.0, 4.5, 3.5, 3.0, 2.5, 2.5, 2.5, 3.0, 3.5, 4.0, 5.0, 6.5, 7.0, 6.5, 5.5, 4.0, 2.5][hour];
                    // Scale load based on user's peak demand (7kW is the base peak)
                    const load = baseLoadProfile * (peakLoadDemand / 7.0);
                    const isPeak = hour >= 14 && hour < 22;
                    const price = isPeak ? peakPrice : offPeakPrice;

                    let gridUsage = 0;
                    let batteryCharge = 0;
                    let batteryDischarge = 0;

                    if (isBaseline) {
                        gridUsage = Math.max(0, load - solar);
                    } else {
                        const deficit = load - solar;
                        if (deficit < 0 && soc < 100) {
                            batteryCharge = Math.min(-deficit * 0.95, (100 - soc) / 100 * batteryCapacity);
                            soc += batteryCharge / batteryCapacity * 100;
                        } else if (deficit > 0 && isPeak && soc > 20) {
                            batteryDischarge = Math.min(deficit, (soc - 20) / 100 * batteryCapacity * 0.95);
                            soc -= batteryDischarge / batteryCapacity * 100;
                            gridUsage = Math.max(0, deficit - batteryDischarge);
                        } else {
                            gridUsage = Math.max(0, deficit);
                        }
                    }

                    data.push({
                        hour,
                        solar_generation: Math.round(solar * 100) / 100,
                        load_demand: Math.round(load * 100) / 100,
                        battery_soc: Math.round(soc * 10) / 10,
                        grid_usage: Math.round(gridUsage * 100) / 100,
                        battery_charge: Math.round(batteryCharge * 100) / 100,
                        battery_discharge: Math.round(batteryDischarge * 100) / 100,
                        hourly_cost: Math.round(gridUsage * price * 100) / 100,
                        is_peak_hour: isPeak,
                    });
                }

                return data;
            };

            const baseline = generateHourlyData(true);
            const smart = generateHourlyData(false);

            const baselineCost = baseline.reduce((sum, d) => sum + d.hourly_cost, 0);
            const smartCost = smart.reduce((sum, d) => sum + d.hourly_cost, 0);
            const baselineGrid = baseline.reduce((sum, d) => sum + d.grid_usage, 0);
            const smartGrid = smart.reduce((sum, d) => sum + d.grid_usage, 0);

            setResult({
                baseline_data: baseline,
                smart_data: smart,
                summary: {
                    baseline_total_cost: Math.round(baselineCost * 100) / 100,
                    smart_total_cost: Math.round(smartCost * 100) / 100,
                    cost_saved: Math.round((baselineCost - smartCost) * 100) / 100,
                    cost_saved_percent: Math.round((baselineCost - smartCost) / baselineCost * 1000) / 10,
                    baseline_grid_usage: Math.round(baselineGrid * 100) / 100,
                    smart_grid_usage: Math.round(smartGrid * 100) / 100,
                    grid_reduced: Math.round((baselineGrid - smartGrid) * 100) / 100,
                    grid_reduced_percent: Math.round((baselineGrid - smartGrid) / baselineGrid * 1000) / 10,
                    battery_capacity_kwh: batteryCapacity,
                },
            });
        }
    }, [batteryCapacity, solarCapacity, weatherMode, peakLoadDemand, peakPrice, standardPrice, offPeakPrice, initialSoC]);

    // Auto-run simulation when parameters change (debounced) - silent update only
    useEffect(() => {
        if (!result) return; // Only auto-update if simulation has been run at least once

        const timeoutId = setTimeout(() => {
            updateSimulationData(); // Use silent update instead of full runSimulation
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [batteryCapacity, solarCapacity, weatherMode, peakLoadDemand, offPeakPrice, standardPrice, peakPrice, initialSoC, updateSimulationData]);

    // Handle step navigation
    const nextStep = () => {
        if (currentStep < PROCEDURE_STEPS.length - 1) {
            if (!completedSteps.includes(currentStep)) {
                setCompletedSteps([...completedSteps, currentStep]);
            }
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    // Get current data for visualization
    const currentData = result
        ? (activeStrategy === "smart" ? result.smart_data : result.baseline_data)[currentHour]
        : {
            hour: currentHour,
            solar_generation: 0,
            load_demand: 4,
            battery_soc: initialSoC,
            grid_usage: 0,
            battery_charge: 0,
            battery_discharge: 0,
            hourly_cost: 0,
            is_peak_hour: false,
        };

    const activeData = result
        ? (activeStrategy === "smart" ? result.smart_data : result.baseline_data)
        : [];

    // Calculate report card metrics
    const getReportCardData = () => {
        if (!result || activeData.length === 0) return null;

        const totalCost = activeData.reduce((sum, h) => sum + h.hourly_cost, 0);
        const totalSolar = activeData.reduce((sum, h) => sum + h.solar_generation, 0);
        const totalGrid = activeData.reduce((sum, h) => sum + h.grid_usage, 0);
        const totalLoad = activeData.reduce((sum, h) => sum + h.load_demand, 0);

        // CO2 saved: ~0.82 kg CO2 per kWh of solar used instead of grid (India avg)
        const co2Saved = totalSolar * 0.82;

        // Self-sufficiency: (Solar Used / Total Load) * 100
        const selfSufficiency = Math.min(100, (totalSolar / totalLoad) * 100);

        // Eco-Score Grade based on self-sufficiency and cost savings
        const costSavingsPercent = result.summary.cost_saved_percent;
        const avgScore = (selfSufficiency + costSavingsPercent) / 2;

        let grade: string;
        let gradeColor: string;
        if (avgScore >= 40) { grade = 'A'; gradeColor = 'text-green-500'; }
        else if (avgScore >= 30) { grade = 'B'; gradeColor = 'text-blue-500'; }
        else if (avgScore >= 20) { grade = 'C'; gradeColor = 'text-yellow-500'; }
        else if (avgScore >= 10) { grade = 'D'; gradeColor = 'text-orange-500'; }
        else { grade = 'F'; gradeColor = 'text-red-500'; }

        // Tips based on performance
        const tips: string[] = [];
        if (selfSufficiency < 50) {
            tips.push("Try increasing your solar panel capacity to generate more clean energy during daylight hours.");
        }
        if (totalGrid > totalSolar) {
            tips.push("Consider a larger battery to store excess solar and reduce grid dependency during peak hours.");
        }
        if (costSavingsPercent < 15) {
            tips.push("Switch to the Smart strategy to optimize battery usage during peak pricing hours.");
        }

        return {
            totalCost,
            totalSolar,
            totalGrid,
            co2Saved,
            selfSufficiency,
            grade,
            gradeColor,
            tips: tips.length > 0 ? tips : ["Great job! Your system is well optimized."]
        };
    };

    const reportData = getReportCardData();

    // Start a challenge with selected difficulty
    const startChallenge = () => {
        if (selectedChallenge === null) return;
        const challenge = challenges.find(c => c.id === selectedChallenge);
        if (!challenge) return;

        const difficultySettings = challenge.difficulty[challengeDifficulty];
        setBatteryCapacity(difficultySettings.batteryCapacity);
        setInitialSoC(difficultySettings.initialSoC);
        setSolarCapacity(difficultySettings.solarCapacity);
        if ('peakPrice' in difficultySettings) {
            setPeakPrice(difficultySettings.peakPrice as number);
        }
        if (challenge.id === 2) {
            setWeatherMode("cloudy");
        } else {
            setWeatherMode("sunny");
        }

        setActiveChallenge({ id: selectedChallenge, difficulty: challengeDifficulty });
        setShowChallengeModal(false);
        setCurrentHour(6);
        setResult(null);

        // Auto-run simulation after setting up
        setTimeout(() => {
            runSimulation();
        }, 100);
    };

    const downloadReport = async () => {
        if (!result || !reportData) {
            alert("Please run a simulation first to generate a report.");
            return;
        }

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const margin = 15;
            let y = 20;

            // ── Title ──
            pdf.setFontSize(22);
            pdf.setTextColor(15, 23, 42);
            pdf.text('Microgrid Simulation Report', pageWidth / 2, y, { align: 'center' });
            y += 8;
            pdf.setFontSize(10);
            pdf.setTextColor(100, 116, 139);
            pdf.text('Virtual Labs 2026 • Digital Twin Experiment', pageWidth / 2, y, { align: 'center' });
            y += 4;
            pdf.setDrawColor(15, 23, 42);
            pdf.setLineWidth(0.5);
            pdf.line(margin, y, pageWidth - margin, y);
            y += 10;

            // ── Eco-Grade Badge ──
            const gradeColors: Record<string, [number, number, number]> = {
                A: [34, 197, 94], B: [59, 130, 246], C: [234, 179, 8], D: [249, 115, 22], F: [239, 68, 68]
            };
            const gc = gradeColors[reportData.grade] || [100, 100, 100];
            pdf.setDrawColor(gc[0], gc[1], gc[2]);
            pdf.setLineWidth(1.5);
            pdf.circle(pageWidth - margin - 12, y + 2, 10);
            pdf.setFontSize(20);
            pdf.setTextColor(gc[0], gc[1], gc[2]);
            pdf.text(reportData.grade, pageWidth - margin - 12, y + 5, { align: 'center' });
            pdf.setFontSize(7);
            pdf.setTextColor(100, 116, 139);
            pdf.text('ECO-GRADE', pageWidth - margin - 12, y + 14, { align: 'center' });

            // ── Summary Stats ──
            pdf.setFontSize(13);
            pdf.setTextColor(15, 23, 42);
            pdf.text('Performance Summary', margin, y);
            y += 8;

            const stats = [
                ['Total Cost', `Rs. ${reportData.totalCost.toFixed(2)}`],
                ['Solar Used', `${reportData.totalSolar.toFixed(1)} kWh`],
                ['Grid Used', `${reportData.totalGrid.toFixed(1)} kWh`],
                ['CO2 Saved', `${reportData.co2Saved.toFixed(1)} kg`],
                ['Self-Sufficiency', `${reportData.selfSufficiency.toFixed(1)}%`],
            ];

            const colWidth = (pageWidth - 2 * margin) / stats.length;
            stats.forEach(([label, value], i) => {
                const x = margin + i * colWidth;
                pdf.setFillColor(248, 250, 252);
                pdf.roundedRect(x + 1, y, colWidth - 2, 18, 2, 2, 'F');
                pdf.setFontSize(7);
                pdf.setTextColor(100, 116, 139);
                pdf.text(label.toUpperCase(), x + colWidth / 2, y + 6, { align: 'center' });
                pdf.setFontSize(11);
                pdf.setTextColor(15, 23, 42);
                pdf.text(value, x + colWidth / 2, y + 14, { align: 'center' });
            });
            y += 26;

            // ── Cost Comparison ──
            pdf.setFontSize(13);
            pdf.setTextColor(15, 23, 42);
            pdf.text('Strategy Comparison', margin, y);
            y += 6;

            autoTable(pdf, {
                startY: y,
                margin: { left: margin, right: margin },
                head: [['Metric', 'Baseline', 'Smart', 'Savings']],
                body: [
                    [
                        'Daily Cost',
                        `Rs. ${result.summary.baseline_total_cost.toFixed(2)}`,
                        `Rs. ${result.summary.smart_total_cost.toFixed(2)}`,
                        `Rs. ${result.summary.cost_saved.toFixed(2)} (${result.summary.cost_saved_percent.toFixed(1)}%)`
                    ],
                    [
                        'Grid Usage',
                        `${result.summary.baseline_grid_usage.toFixed(1)} kWh`,
                        `${result.summary.smart_grid_usage.toFixed(1)} kWh`,
                        `${result.summary.grid_reduced.toFixed(1)} kWh (${result.summary.grid_reduced_percent.toFixed(1)}%)`
                    ],
                ],
                headStyles: { fillColor: [30, 41, 59], fontSize: 9, textColor: [255, 255, 255] },
                bodyStyles: { fontSize: 9, textColor: [30, 41, 59] },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                theme: 'grid',
            });
            y = (pdf as any).lastAutoTable.finalY + 10;

            // ── Chart Image ── (capture Plotly chart from analysis tab)
            const plotlyEl = document.querySelector('#analysis-report-content .js-plotly-plot') as HTMLElement | null;
            if (plotlyEl) {
                try {
                    const Plotly = await import('plotly.js-dist-min');
                    const imgUrl = await (Plotly as any).toImage(plotlyEl, { format: 'png', width: 900, height: 400 });
                    const chartImgWidth = pageWidth - 2 * margin;
                    const chartImgHeight = chartImgWidth * (400 / 900);

                    // Check if chart fits on current page
                    if (y + chartImgHeight + 10 > pdf.internal.pageSize.getHeight() - 15) {
                        pdf.addPage();
                        y = 20;
                    }

                    pdf.setFontSize(13);
                    pdf.setTextColor(15, 23, 42);
                    pdf.text('24-Hour Energy Flow Analysis', margin, y);
                    y += 6;
                    pdf.addImage(imgUrl, 'PNG', margin, y, chartImgWidth, chartImgHeight);
                    y += chartImgHeight + 8;
                } catch (chartErr) {
                    console.warn('Could not capture chart for PDF:', chartErr);
                }
            }

            // ── Hourly Breakdown Table ──
            if (y + 30 > pdf.internal.pageSize.getHeight() - 15) {
                pdf.addPage();
                y = 20;
            }
            pdf.setFontSize(13);
            pdf.setTextColor(15, 23, 42);
            pdf.text('24-Hour Breakdown', margin, y);
            y += 6;

            const hourlyBody = result.smart_data.map((smart, i) => {
                const baseline = result.baseline_data[i];
                const savings = baseline.hourly_cost - smart.hourly_cost;
                return [
                    `${String(i).padStart(2, '0')}:00${smart.is_peak_hour ? ' (Peak)' : ''}`,
                    smart.solar_generation.toFixed(1),
                    smart.load_demand.toFixed(1),
                    `${smart.battery_soc.toFixed(0)}%`,
                    baseline.grid_usage.toFixed(1),
                    smart.grid_usage.toFixed(1),
                    savings > 0 ? `Rs. ${savings.toFixed(2)}` : '-',
                ];
            });

            autoTable(pdf, {
                startY: y,
                margin: { left: margin, right: margin },
                head: [['Hour', 'Solar', 'Load', 'Battery', 'Grid (Base)', 'Grid (Smart)', 'Savings']],
                body: hourlyBody,
                headStyles: { fillColor: [30, 41, 59], fontSize: 7, textColor: [255, 255, 255] },
                bodyStyles: { fontSize: 7, textColor: [30, 41, 59], cellPadding: 1.5 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                theme: 'grid',
            });

            // ── Footer ──
            const pageCount = pdf.getNumberOfPages();
            for (let p = 1; p <= pageCount; p++) {
                pdf.setPage(p);
                pdf.setFontSize(8);
                pdf.setTextColor(148, 163, 184);
                pdf.text(
                    `Generated by VLabs Microgrid Simulator  •  Page ${p} of ${pageCount}`,
                    pageWidth / 2,
                    pdf.internal.pageSize.getHeight() - 8,
                    { align: 'center' }
                );
            }

            pdf.save('Microgrid_Simulation_Report.pdf');
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF report. Please try again.');
        }
    };

    // Get hint icon based on suggestion type
    const getHintIcon = (type: string) => {
        switch (type) {
            case "battery": return "🔋";
            case "solar": return "☀️";
            case "pricing": return "💰";
            default: return "💡";
        }
    };

    // Get current eco-score from latest history
    const currentEcoScore = simulationHistory.length > 0
        ? simulationHistory[simulationHistory.length - 1].eco_score
        : null;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* AI Lab Assistant Panel - Minimal Theme with Chat */}
            {showHintPanel && (
                <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50 animate-in slide-in-from-right duration-300">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-lg w-80 max-h-[600px] flex flex-col overflow-hidden">
                        {/* Minimal Header */}
                        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                                    <Lightbulb className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900">Lab Assistant</h3>
                                    <p className="text-[10px] text-slate-500">Powered by AI</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowHintPanel(false);
                                    setShowChatMode(false);
                                }}
                                className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4 text-slate-500" />
                            </button>
                        </div>

                        {/* Content Area */}
                        {!showChatMode ? (
                            // Hint View
                            <div className="p-4 flex-1 overflow-y-auto">
                                {aiHint && (
                                    <>
                                        {/* Hint Card */}
                                        <div className="bg-slate-50 rounded-lg p-3 mb-3">
                                            <div className="flex items-start gap-2 mb-2">
                                                <span className="text-lg">{getHintIcon(aiHint.suggestion_type)}</span>
                                                <h4 className="text-sm font-medium text-slate-900 leading-tight">{aiHint.hint_title}</h4>
                                            </div>
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                {aiHint.hint_message}
                                            </p>
                                        </div>

                                        {/* Eco-Score */}
                                        {currentEcoScore !== null && (
                                            <div className="mb-3">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-xs text-slate-500">Eco-Score</span>
                                                    <span className={`text-xs font-semibold ${currentEcoScore >= 70 ? "text-emerald-600" :
                                                        currentEcoScore >= 50 ? "text-amber-600" : "text-red-600"
                                                        }`}>
                                                        {currentEcoScore}/100
                                                    </span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-500 ${currentEcoScore >= 70 ? "bg-emerald-500" :
                                                            currentEcoScore >= 50 ? "bg-amber-500" : "bg-red-500"
                                                            }`}
                                                        style={{ width: `${currentEcoScore}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Run History */}
                                        {simulationHistory.length > 1 && (
                                            <div className="flex items-center gap-1.5 mb-3">
                                                <span className="text-[10px] text-slate-400">History:</span>
                                                {simulationHistory.slice(-5).map((h, i) => (
                                                    <div
                                                        key={i}
                                                        className={`w-2 h-2 rounded-full ${h.eco_score >= 70 ? "bg-emerald-500" :
                                                            h.eco_score >= 50 ? "bg-amber-500" : "bg-red-500"
                                                            }`}
                                                        title={`Run ${i + 1}: ${h.eco_score.toFixed(0)}`}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Quick Questions */}
                                <div className="space-y-1.5">
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Quick questions</p>
                                    {[
                                        "How do I improve my eco-score?",
                                        "Explain peak vs off-peak pricing",
                                        "Best battery charging strategy?"
                                    ].map((q, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                setShowChatMode(true);
                                                sendChatMessage(q);
                                            }}
                                            className="w-full text-left text-xs px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            // Chat View
                            <div className="flex-1 flex flex-col min-h-0">
                                {/* Chat Messages */}
                                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                    {chatMessages.length === 0 && (
                                        <div className="text-center py-8">
                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                                <MessageSquare className="w-6 h-6 text-slate-400" />
                                            </div>
                                            <p className="text-xs text-slate-500">Ask me anything about microgrids!</p>
                                        </div>
                                    )}
                                    {chatMessages.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={`max-w-[85%] px-3 py-2 rounded-lg text-xs ${msg.role === "user"
                                                    ? "bg-slate-900 text-white"
                                                    : "bg-slate-100 text-slate-700"
                                                    }`}
                                            >
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))}
                                    {isChatLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-slate-100 px-3 py-2 rounded-lg">
                                                <div className="flex gap-1">
                                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Chat Input */}
                                <div className="p-3 border-t border-slate-100">
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            sendChatMessage(chatInput);
                                        }}
                                        className="flex gap-2"
                                    >
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={(e) => setChatInput(e.target.value)}
                                            placeholder="Ask a question..."
                                            className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400
                                            text-black
                                            "
                                            disabled={isChatLoading}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!chatInput.trim() || isChatLoading}
                                            className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Send
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Footer Actions */}
                        <div className="px-3 py-2 border-t border-slate-100 flex gap-2">
                            {showChatMode ? (
                                <>
                                    <button
                                        onClick={() => setShowChatMode(false)}
                                        className="flex-1 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                    >
                                        ← Back to tips
                                    </button>
                                    <button
                                        onClick={() => setChatMessages([])}
                                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                                    >
                                        Clear
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setShowChatMode(true)}
                                        className="flex-1 py-1.5 text-xs bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        <MessageSquare className="w-3 h-3" />
                                        Ask a question
                                    </button>
                                    <button
                                        onClick={() => setShowHintPanel(false)}
                                        className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
                                    >
                                        Dismiss
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Eco-Score Badge (always visible when simulation has run) */}
            {currentEcoScore !== null && activeTab === "simulation" && (
                <div className="fixed bottom-4 right-4 z-40">
                    <button
                        onClick={() => {
                            setShowHintPanel(true);
                            if (simulationHistory.length >= 1) {
                                checkForHints(simulationHistory);
                            }
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-md border transition-all hover:scale-105 ${currentEcoScore >= 70
                            ? "bg-white border-emerald-200 text-emerald-700"
                            : currentEcoScore >= 50
                                ? "bg-white border-amber-200 text-amber-700"
                                : "bg-white border-red-200 text-red-700"
                            }`}
                        title="Click for AI tips"
                    >
                        <div className="relative">
                            <Lightbulb className="w-4 h-4" />
                            {isLoadingHint && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                        <span className="font-medium text-xs">Eco: {currentEcoScore.toFixed(0)}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">AI Tips</span>
                    </button>
                </div>
            )}

            {/* Challenge Selection Modal */}
            {showChallengeModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-blue-600" />
                                <h2 className="font-bold text-slate-900">Select Challenge</h2>
                            </div>
                            <button
                                onClick={() => setShowChallengeModal(false)}
                                className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        {/* Challenge List or Challenge Detail */}
                        {selectedChallenge === null ? (
                            <div className="p-4 space-y-3">
                                {challenges.map((challenge) => (
                                    <button
                                        key={challenge.id}
                                        onClick={() => setSelectedChallenge(challenge.id)}
                                        className="w-full p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-lg bg-slate-100 group-hover:bg-white ${challenge.iconColor}`}>
                                                <challenge.icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-slate-900 group-hover:text-blue-700">{challenge.title}</h3>
                                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{challenge.description}</p>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4">
                                {(() => {
                                    const challenge = challenges.find(c => c.id === selectedChallenge)!;
                                    return (
                                        <div className="space-y-4">
                                            {/* Back button */}
                                            <button
                                                onClick={() => setSelectedChallenge(null)}
                                                className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1"
                                            >
                                                <ChevronLeft className="w-4 h-4" /> Back to challenges
                                            </button>

                                            {/* Challenge Header */}
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg bg-slate-100 ${challenge.iconColor}`}>
                                                    <challenge.icon className="w-6 h-6" />
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-900">{challenge.title}</h3>
                                            </div>

                                            {/* Description */}
                                            <p className="text-sm text-slate-600 leading-relaxed">
                                                {challenge.description}
                                            </p>

                                            {/* Objective */}
                                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Target className="w-4 h-4 text-blue-600" />
                                                    <span className="font-semibold text-slate-700">Objective</span>
                                                </div>
                                                <p className="text-sm text-slate-600 mt-1 ml-6">{challenge.objective}</p>
                                            </div>

                                            {/* Difficulty Selection */}
                                            <div>
                                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                                    Select Difficulty
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {(["easy", "medium", "hard"] as const).map((diff) => (
                                                        <button
                                                            key={diff}
                                                            onClick={() => setChallengeDifficulty(diff)}
                                                            className={`py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all border ${challengeDifficulty === diff
                                                                ? "bg-blue-600 text-white border-blue-600"
                                                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                                                }`}
                                                        >
                                                            {diff}
                                                        </button>
                                                    ))}
                                                </div>
                                                <p className="text-xs text-blue-600 mt-2">
                                                    {challenge.hints[challengeDifficulty]}
                                                </p>
                                            </div>

                                            {/* Start Button */}
                                            <button
                                                onClick={startChallenge}
                                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <Play className="w-4 h-4 fill-current" />
                                                Start Mission
                                            </button>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Report Card Modal */}
            {showReportCard && reportData && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between p-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Award className="w-4 h-4 text-blue-600" />
                                <h2 className="font-bold text-slate-900 text-sm">Simulation Complete - Report Card</h2>
                            </div>
                            <button
                                onClick={() => setShowReportCard(false)}
                                className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-4">
                            {/* Eco-Score Grade */}
                            <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                                <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Eco-Score Grade</div>
                                <div className={`text-5xl font-black ${reportData.gradeColor}`}>
                                    {reportData.grade}
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                                    <div className="flex items-center gap-1 text-amber-600 text-[10px] font-medium mb-0.5">
                                        <Zap className="w-3 h-3" /> TOTAL COST
                                    </div>
                                    <div className="text-lg font-bold text-slate-900">₹{reportData.totalCost.toFixed(2)}</div>
                                </div>
                                <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-100">
                                    <div className="flex items-center gap-1 text-yellow-600 text-[10px] font-medium mb-0.5">
                                        <Sun className="w-3 h-3" /> SOLAR USED
                                    </div>
                                    <div className="text-lg font-bold text-slate-900">{reportData.totalSolar.toFixed(1)} kWh</div>
                                </div>
                                <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                                    <div className="flex items-center gap-1 text-indigo-600 text-[10px] font-medium mb-0.5">
                                        <Home className="w-3 h-3" /> GRID USED
                                    </div>
                                    <div className="text-lg font-bold text-slate-900">{reportData.totalGrid.toFixed(1)} kWh</div>
                                </div>
                                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                                    <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-medium mb-0.5">
                                        <Leaf className="w-3 h-3" /> CO₂ SAVED
                                    </div>
                                    <div className="text-lg font-bold text-slate-900">{reportData.co2Saved.toFixed(1)} kg</div>
                                </div>
                            </div>

                            {/* Self-Sufficiency */}
                            <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-100 text-center">
                                <div className="flex items-center justify-center gap-1 text-cyan-600 text-[10px] font-medium mb-1">
                                    <TrendingUp className="w-3 h-3" /> SELF-SUFFICIENCY RATE
                                </div>
                                <div className="text-2xl font-bold text-cyan-700">{reportData.selfSufficiency.toFixed(1)}%</div>
                            </div>

                            {/* Tips */}
                            {/* <div className="bg-amber-50/50 rounded-lg p-3 border border-amber-100">
                                <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold mb-1">
                                    <Lightbulb className="w-3 h-3" /> Tips for Improvement
                                </div>
                                <ul className="space-y-0.5">
                                    {reportData.tips.map((tip, i) => (
                                        <li key={i} className="text-[11px] text-slate-600 flex items-start gap-1">
                                            <span className="text-amber-500 mt-0.5">•</span>
                                            {tip}
                                        </li>
                                    ))}
                                </ul>
                            </div> */}
                        </div>

                        {/* Footer */}
                        <div className="p-3 border-t border-slate-100">
                            <button
                                onClick={() => {
                                    setShowReportCard(false);
                                    setCurrentHour(6);
                                    setIsPlaying(true);
                                }}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
                            >
                                <RotateCcw className="w-4 h-4" />
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Joyride
                steps={tourSteps}
                run={runTour}
                continuous
                showProgress
                showSkipButton
                callback={handleJoyrideCallback}
                styles={{
                    options: {
                        primaryColor: '#2563eb', // blue-600
                        zIndex: 1000,
                    },
                    tooltipContainer: {
                        textAlign: "left"
                    }
                }}
            />
            {/* VLabs Header */}
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                                <Zap className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900">Microgrid Digital Twin</h1>
                                <p className="text-xs text-slate-500 font-medium">Virtual Labs Experiment </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Tab Navigation */}
            <nav className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
                    <div className="flex gap-1 overflow-x-auto">
                        {[
                            { id: "theory", label: "Theory", icon: BookOpen },
                            { id: "procedure", label: "Procedure", icon: Settings },
                            { id: "simulation", label: "Simulation", icon: FlaskConical },
                            { id: "analysis", label: "Analysis", icon: BarChart3 },
                            { id: "quiz", label: "Quiz", icon: CheckSquare },
                            { id: "references", label: "References", icon: FileText },
                            { id: "feedback", label: "Feedback", icon: MessageSquare },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as "theory" | "procedure" | "simulation" | "analysis" | "quiz" | "references" | "feedback")}
                                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === "simulation" && (
                        <div className="flex items-center pl-4 border-l border-slate-200 ml-4 py-1">
                            <VLabsToggleMenu
                                isEnergyFlowExpanded={isEnergyFlowExpanded}
                                setIsEnergyFlowExpanded={setIsEnergyFlowExpanded}
                                isBillExpanded={isBillExpanded}
                                setIsBillExpanded={setIsBillExpanded}
                                isBatteryExpanded={isBatteryExpanded}
                                setIsBatteryExpanded={setIsBatteryExpanded}
                            />
                        </div>
                    )}
                </div>
            </nav>


            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-6">
                {activeTab === "theory" && (
                    <TheoryContent />
                )}

                {activeTab === "procedure" && (
                    <ProcedureContent
                        currentStep={currentStep}
                        completedSteps={completedSteps}
                        onStepChange={setCurrentStep}
                        onGoToSimulation={() => setActiveTab("simulation")}
                    />
                )}

                {activeTab === "simulation" && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                        {/* Left Panel - Energy Flow Graph */}
                        <div className="lg:col-span-3 space-y-4">
                            {/* Energy Flow Graph - Collapsible */}
                            <div id="tour-procedure-step" className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                <div className="flex items-center justify-between bg-slate-50 border-b border-slate-200">
                                    <button
                                        onClick={() => setIsEnergyFlowExpanded(!isEnergyFlowExpanded)}
                                        className="flex-1 p-3 flex items-center justify-between hover:bg-slate-100 transition-colors text-left"
                                    >
                                        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                            <BarChart3 className="w-4 h-4 text-blue-600" />
                                            24-Hour Energy Flow
                                        </h3>
                                        <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform ${isEnergyFlowExpanded ? 'rotate-90' : ''}`} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEnergyFlowMaximized(true);
                                        }}
                                        className="p-3 hover:bg-blue-100 text-slate-500 hover:text-blue-600 transition-colors border-l border-slate-200"
                                        title="Maximize Chart"
                                    >
                                        <Maximize className="w-4 h-4" />
                                    </button>
                                </div>
                                {isEnergyFlowExpanded && (
                                    <div className="p-3 bg-white">
                                        <EnergyFlowD3
                                            data={activeData}
                                            currentHour={currentHour}
                                            strategy={activeStrategy}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Strategy Toggle */}
                            {result && (
                                <div id="tour-strategy-toggle" className="bg-white rounded-lg border border-slate-200 p-4">
                                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Active Strategy</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setActiveStrategy("baseline")}
                                            className={`py-2 px-3 rounded-md text-xs font-medium transition-all border ${activeStrategy === "baseline"
                                                ? "bg-slate-800 text-white border-slate-800"
                                                : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                                                }`}
                                        >
                                            Baseline
                                        </button>
                                        <button
                                            onClick={() => setActiveStrategy("smart")}
                                            className={`py-2 px-3 rounded-md text-xs font-medium transition-all border ${activeStrategy === "smart"
                                                ? "bg-blue-600 text-white border-blue-600"
                                                : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                                                }`}
                                        >
                                            Smart (Optimized)
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Electricity Bill Card - Collapsible */}
                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                <button
                                    onClick={() => setIsBillExpanded(!isBillExpanded)}
                                    className="w-full p-3 flex items-center justify-between bg-red-50 border-b border-red-100 hover:bg-red-100 transition-colors"
                                >
                                    <h3 className="text-xs font-semibold text-red-800 uppercase tracking-wider flex items-center gap-2">
                                        <Zap className="w-3 h-3" />
                                        Electricity Bill
                                    </h3>
                                    <ChevronRight className={`w-4 h-4 text-red-600 transition-transform ${isBillExpanded ? 'rotate-90' : ''}`} />
                                </button>
                                {isBillExpanded && (
                                    <div className="p-4 bg-red-50">
                                        <div className="text-center py-3">
                                            <div className="text-2xl font-bold text-red-600">
                                                ₹{activeData.slice(0, currentHour + 1).reduce((sum, h) => sum + h.hourly_cost, 0).toFixed(2)}
                                            </div>
                                            <div className="text-xs text-red-400 mt-1">Real-time Bill</div>
                                        </div>
                                        <div className="flex justify-between items-center pt-3 border-t border-red-100 text-xs">
                                            <div>
                                                <div className="text-red-400 font-medium">Current Tariff</div>
                                                <div className="text-red-700 font-bold">₹{(currentData.is_peak_hour ? peakPrice : offPeakPrice).toFixed(2)}/kWh</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-red-400 font-medium">Grid Power</div>
                                                <div className="text-red-700 font-bold">{currentData.grid_usage.toFixed(2)} kW</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Battery Status Card - Collapsible */}
                            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                <button
                                    onClick={() => setIsBatteryExpanded(!isBatteryExpanded)}
                                    className="w-full p-3 flex items-center justify-between bg-slate-50 border-b border-slate-200 hover:bg-slate-100 transition-colors"
                                >
                                    <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                        <Battery className="w-3 h-3" />
                                        Battery Status
                                    </h3>
                                    <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform ${isBatteryExpanded ? 'rotate-90' : ''}`} />
                                </button>
                                {isBatteryExpanded && (
                                    <div className="p-4">
                                        <div className="flex justify-center mb-4">
                                            {currentData.battery_charge > 0 ? (
                                                <span className="text-xs font-bold text-emerald-600 animate-pulse flex items-center gap-1">
                                                    ↓ Charging
                                                </span>
                                            ) : currentData.battery_discharge > 0 ? (
                                                <span className="text-xs font-bold text-amber-600 animate-pulse flex items-center gap-1">
                                                    ↑ Discharging
                                                </span>
                                            ) : (
                                                <span className="text-xs font-bold text-slate-400">Idle</span>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-center justify-center">
                                            {/* Visual Battery */}
                                            <div className="w-14 h-24 border-4 border-slate-300 rounded-lg relative mb-3 bg-slate-50">
                                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-1.5 bg-slate-300 rounded-t-sm"></div>
                                                <div className="absolute inset-1 rounded overflow-hidden">
                                                    <div
                                                        className={`w-full absolute bottom-0 left-0 right-0 transition-all duration-500 rounded-sm ${currentData.battery_soc > 20 ? "bg-emerald-400" : "bg-red-400"}`}
                                                        style={{ height: `${Math.min(100, Math.max(0, currentData.battery_soc))}%` }}
                                                    >
                                                        {currentData.battery_charge > 0 && (
                                                            <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/30 animate-pulse"></div>
                                                        )}
                                                    </div>
                                                </div>
                                                {currentData.battery_soc < 20 && (
                                                    <div className="absolute inset-0 flex items-center justify-center z-10">
                                                        <span className="text-lg font-bold text-red-600 animate-bounce">!</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="text-2xl font-bold text-slate-800 mb-1">
                                                {currentData.battery_soc.toFixed(1)}%
                                            </div>
                                            <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">State of Charge</div>

                                            <div className="w-full grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                                                <div className="text-center">
                                                    <div className="text-xs text-slate-400 mb-1">Capacity</div>
                                                    <div className="text-sm font-bold text-slate-700">{batteryCapacity} kWh</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-xs text-slate-400 mb-1">Power Flow</div>
                                                    <div className={`text-sm font-bold ${currentData.battery_charge > 0 ? "text-emerald-600" :
                                                        currentData.battery_discharge > 0 ? "text-amber-600" : "text-slate-700"
                                                        }`}>
                                                        {(currentData.battery_charge || currentData.battery_discharge).toFixed(2)} kW
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Cost Efficiency Card - Collapsible */}
                            {result && (
                                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                    <button
                                        onClick={() => setIsCostEfficiencyExpanded(!isCostEfficiencyExpanded)}
                                        className="w-full p-3 flex items-center justify-between bg-slate-50 border-b border-slate-200 hover:bg-slate-100 transition-colors"
                                    >
                                        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                                            <BarChart3 className="w-3 h-3" />
                                            Cost Efficiency
                                        </h3>
                                        <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform ${isCostEfficiencyExpanded ? 'rotate-90' : ''}`} />
                                    </button>
                                    {isCostEfficiencyExpanded && (
                                        <div className="p-4">
                                            <div className="space-y-3 text-sm">
                                                <div className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
                                                    <span className="text-slate-600 text-xs">Baseline Cost</span>
                                                    <span className="text-slate-900 font-mono font-medium">₹{result.summary.baseline_total_cost.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between items-center p-2 bg-blue-50/50 rounded border border-blue-100">
                                                    <span className="text-blue-800 text-xs">Smart Cost</span>
                                                    <span className="text-blue-700 font-mono font-bold">₹{result.summary.smart_total_cost.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between items-end pt-1">
                                                    <span className="text-slate-500 text-xs">Net Savings</span>
                                                    <div className="text-right">
                                                        <span className="text-emerald-600 font-bold text-lg">
                                                            {result.summary.cost_saved_percent.toFixed(1)}%
                                                        </span>
                                                        <span className="text-slate-400 text-xs ml-1">saved</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Center - 3D Visualization */}
                        <div className="lg:col-span-6 space-y-4">
                            <div id="tour-live-view" className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-blue-600" />
                                        Microgrid Live View
                                    </h3>
                                    <div className="flex items-center gap-1">
                                        {/* 2D/3D Toggle */}
                                        <div className="flex items-center bg-slate-200 rounded-lg p-0.5 mr-2">
                                            <button
                                                onClick={() => setVisualizationMode("2d")}
                                                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${visualizationMode === "2d"
                                                        ? "bg-white text-slate-900 shadow-sm"
                                                        : "text-slate-500 hover:text-slate-700"
                                                    }`}
                                                title="2D Mode - Better for low-end devices"
                                            >
                                                <Smartphone className="w-3 h-3" />
                                                2D
                                            </button>
                                            <button
                                                onClick={() => setVisualizationMode("3d")}
                                                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${visualizationMode === "3d"
                                                        ? "bg-white text-slate-900 shadow-sm"
                                                        : "text-slate-500 hover:text-slate-700"
                                                    }`}
                                                title="3D Mode - Enhanced visualization"
                                            >
                                                <Monitor className="w-3 h-3" />
                                                3D
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setIsPlaying(!isPlaying)}
                                            className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                                            title={isPlaying ? "Pause" : "Play"}
                                        >
                                            {isPlaying ? (
                                                <Pause className="w-4 h-4 fill-current" />
                                            ) : (
                                                <Play className="w-4 h-4 fill-current" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => { setCurrentHour(0); setIsPlaying(false); }}
                                            className="p-1.5 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                                            title="Reset"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="relative overflow-hidden bg-black">
                                    {visualizationMode === "3d" ? (
                                        <Microgrid3DScene currentData={currentData} />
                                    ) : (
                                        <Microgrid2DScene currentData={currentData} />
                                    )}
                                </div>

                                {/* Time Slider */}
                                <div className="p-3 border-t border-slate-200 bg-white">
                                    <div className="flex items-center gap-4">
                                        <span className="text-sm font-mono font-medium text-slate-700 w-12 text-center bg-slate-100 rounded py-0.5">
                                            {String(currentHour).padStart(2, "0")}:00
                                        </span>
                                        <input
                                            type="range"
                                            min="0"
                                            max="23"
                                            value={currentHour}
                                            onChange={(e) => setCurrentHour(Number(e.target.value))}
                                            className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        />
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${currentData.is_peak_hour
                                            ? "bg-red-50 text-red-600 border-red-100"
                                            : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                            }`}>
                                            {currentData.is_peak_hour ? "Peak Price" : "Off-Peak"}
                                        </span>
                                    </div>
                                </div>

                                {/* Dynamic Power Source Info */}
                                <div className="p-3 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Active Power Sources</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {/* Solar Source */}
                                        {currentData.solar_generation > 0 && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                                                <Sun className="w-3.5 h-3.5 text-amber-500" />
                                                <span className="text-xs font-medium text-amber-700">
                                                    Solar: {currentData.solar_generation.toFixed(1)} kW
                                                </span>
                                                {currentData.solar_generation >= currentData.load_demand && (
                                                    <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-semibold">PRIMARY</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Grid Source */}
                                        {currentData.grid_usage > 0 && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-full">
                                                <Zap className="w-3.5 h-3.5 text-indigo-500" />
                                                <span className="text-xs font-medium text-indigo-700">
                                                    Grid: {currentData.grid_usage.toFixed(1)} kW
                                                </span>
                                                {currentData.grid_usage > currentData.solar_generation && currentData.battery_discharge === 0 && (
                                                    <span className="text-[10px] bg-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded-full font-semibold">PRIMARY</span>
                                                )}
                                            </div>
                                        )}

                                        {/* Battery Discharging */}
                                        {currentData.battery_discharge > 0 && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
                                                <Battery className="w-3.5 h-3.5 text-emerald-500" />
                                                <span className="text-xs font-medium text-emerald-700">
                                                    Battery: {currentData.battery_discharge.toFixed(1)} kW
                                                </span>
                                                <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full font-semibold">DISCHARGING</span>
                                            </div>
                                        )}

                                        {/* Battery Charging */}
                                        {currentData.battery_charge > 0 && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
                                                <Battery className="w-3.5 h-3.5 text-blue-500" />
                                                <span className="text-xs font-medium text-blue-700">
                                                    Charging: {currentData.battery_charge.toFixed(1)} kW
                                                </span>
                                                <span className="text-[10px] bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full font-semibold">STORING</span>
                                            </div>
                                        )}

                                        {/* Night time - no solar */}
                                        {currentData.solar_generation === 0 && currentData.grid_usage === 0 && currentData.battery_discharge === 0 && (
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full">
                                                <span className="text-xs font-medium text-slate-500">No active power flow</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Power Flow Summary */}
                                    <div className="mt-3 pt-3 border-t border-slate-100">
                                        <p className="text-xs text-slate-600">
                                            {currentData.solar_generation > 0 && currentData.solar_generation >= currentData.load_demand ? (
                                                <span className="text-amber-600 font-medium">
                                                    ☀️ Solar is fully powering the load ({currentData.load_demand.toFixed(1)} kW).
                                                    {currentData.battery_charge > 0 && ` Excess ${currentData.battery_charge.toFixed(1)} kW is charging the battery.`}
                                                </span>
                                            ) : currentData.solar_generation > 0 && currentData.grid_usage > 0 ? (
                                                <span className="text-indigo-600 font-medium">
                                                    ⚡ Solar provides {currentData.solar_generation.toFixed(1)} kW, Grid supplements {currentData.grid_usage.toFixed(1)} kW to meet {currentData.load_demand.toFixed(1)} kW demand.
                                                </span>
                                            ) : currentData.battery_discharge > 0 ? (
                                                <span className="text-emerald-600 font-medium">
                                                    🔋 Battery discharging {currentData.battery_discharge.toFixed(1)} kW during peak hours to reduce grid dependency.
                                                </span>
                                            ) : currentData.grid_usage > 0 ? (
                                                <span className="text-slate-600 font-medium">
                                                    🌙 Night time: Grid is the primary power source ({currentData.grid_usage.toFixed(1)} kW).
                                                </span>
                                            ) : (
                                                <span className="text-slate-500">Waiting for simulation data...</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Current Stats Below Visualization */}
                            <div className="bg-white rounded-lg border border-slate-200 p-4">
                                <h3 className="text-sm font-semibold text-slate-900 mb-3">Current Statistics</h3>
                                <div className="grid grid-cols-4 gap-3">
                                    <StatCard
                                        icon={<Sun className="w-4 h-4" />}
                                        label="Solar"
                                        value={`${currentData.solar_generation.toFixed(1)} kW`}
                                        color="text-amber-500"
                                        bgColor=""
                                    />
                                    <StatCard
                                        icon={<Home className="w-4 h-4" />}
                                        label="Load"
                                        value={`${currentData.load_demand.toFixed(1)} kW`}
                                        color="text-slate-600"
                                        bgColor=""
                                    />
                                    <StatCard
                                        icon={<Battery className="w-4 h-4" />}
                                        label="Battery"
                                        value={`${currentData.battery_soc.toFixed(0)}%`}
                                        color={currentData.battery_soc > 20 ? "text-emerald-600" : "text-red-500"}
                                        bgColor=""
                                    />
                                    <StatCard
                                        icon={<Zap className="w-4 h-4" />}
                                        label="Grid"
                                        value={`${currentData.grid_usage.toFixed(1)} kW`}
                                        color="text-indigo-600"
                                        bgColor=""
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Right - Configuration & Results */}
                        <div id="tour-stats-charts" className="lg:col-span-3 space-y-4">
                            {/* Live Battery Status Strip */}
                            <div className="bg-white rounded-lg border border-slate-200 p-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-max">
                                    <div className={`w-2 h-2 rounded-full ${currentData.battery_charge > 0 ? "bg-emerald-500 animate-pulse" : currentData.battery_discharge > 0 ? "bg-amber-500 animate-pulse" : "bg-slate-300"}`} />
                                    <span className="text-xs font-semibold text-slate-700">Battery</span>
                                </div>
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${currentData.battery_soc > 20 ? "bg-emerald-500" : "bg-red-500"}`}
                                        style={{ width: `${Math.min(100, Math.max(0, currentData.battery_soc))}%` }}
                                    />
                                </div>
                                <span className="text-xs font-mono font-bold text-slate-700 min-w-[3ch] text-right">{currentData.battery_soc.toFixed(0)}%</span>
                            </div>

                            {/* Configuration Panel */}
                            <div id="tour-configuration" className="bg-white rounded-lg border border-slate-200 p-4">
                                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-blue-600" />
                                    System Configuration
                                </h3>

                                {/* Run Button */}
                                <button
                                    id="tour-run-button"
                                    onClick={runSimulation}
                                    disabled={isLoading}
                                    className="w-full mb-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-300 rounded-lg font-medium text-sm text-white transition-all flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>Running...</>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4 fill-current" />
                                            Run Simulation
                                        </>
                                    )}
                                </button>

                                <div className="space-y-4">
                                    {/* Solar Capacity */}
                                    <div>
                                        <label className="text-xs text-slate-600 flex justify-between font-medium">
                                            <span className="flex items-center gap-1">
                                                <Sun className="w-3 h-3 text-slate-500" />
                                                Solar Capacity
                                            </span>
                                            <span className="text-slate-900">{solarCapacity} kW</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="3"
                                            max="7"
                                            step="1"
                                            value={solarCapacity}
                                            onChange={(e) => setSolarCapacity(Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-2 accent-blue-600"
                                        />
                                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                            <span>3kW</span>
                                            <span>5kW</span>
                                            <span>7kW</span>
                                        </div>
                                    </div>

                                    {/* Max Load Demand */}
                                    <div>
                                        <label className="text-xs text-slate-600 flex justify-between font-medium">
                                            <span className="flex items-center gap-1">
                                                <Home className="w-3 h-3 text-slate-500" />
                                                Max Load Demand
                                            </span>
                                        </label>
                                        <div className="flex items-center gap-2 mt-2">
                                            <input
                                                type="number"
                                                min="1"
                                                max="20"
                                                step="0.5"
                                                value={peakLoadDemand}
                                                onChange={(e) => setPeakLoadDemand(Math.max(1, Math.min(20, Number(e.target.value))))}
                                                className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                                            />
                                            <span className="text-xs text-slate-600 font-medium">kW</span>
                                        </div>
                                        <p className="text-[10px] text-slate-600 mt-1">Maximum power draw at busiest time (evening). Load varies throughout the day.</p>
                                    </div>

                                    {/* Weather Toggle */}
                                    <div>
                                        <label className="text-xs text-slate-600 mb-2 block font-medium">Weather Mode</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => setWeatherMode("sunny")}
                                                className={`py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2 border ${weatherMode === "sunny"
                                                    ? "bg-slate-800 text-white border-slate-800"
                                                    : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                                                    }`}
                                            >
                                                <Sun className="w-3 h-3" />
                                                Sunny
                                            </button>
                                            <button
                                                onClick={() => setWeatherMode("cloudy")}
                                                className={`py-2 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2 border ${weatherMode === "cloudy"
                                                    ? "bg-slate-800 text-white border-slate-800"
                                                    : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                                                    }`}
                                            >
                                                <span className="text-xs">☁️</span> Cloudy
                                            </button>
                                        </div>
                                    </div>

                                    {/* Battery Capacity */}
                                    <div>
                                        <label className="text-xs text-slate-600 flex justify-between font-medium">
                                            <span className="flex items-center gap-1">
                                                <Battery className="w-3 h-3 text-slate-500" />
                                                Battery Capacity
                                            </span>
                                            <span className="text-slate-900">{batteryCapacity} kWh</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="5"
                                            max="20"
                                            value={batteryCapacity}
                                            onChange={(e) => setBatteryCapacity(Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-2 accent-blue-600"
                                        />
                                    </div>

                                    {/* Initial SoC */}
                                    <div>
                                        <label className="text-xs text-slate-600 flex justify-between font-medium">
                                            <span>Initial State of Charge</span>
                                            <span className="text-slate-900">{initialSoC}%</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="20"
                                            max="100"
                                            value={initialSoC}
                                            onChange={(e) => setInitialSoC(Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-2 accent-blue-600"
                                        />
                                    </div>

                                    {/* 3-Tier Pricing - Editable Input Fields */}
                                    <div className="bg-slate-50 rounded border border-slate-200 p-3">
                                        <label className="text-xs text-slate-500 mb-3 block flex items-center gap-1 font-medium">
                                            <Zap className="w-3 h-3" />
                                            Time-of-Day Tariff (₹/kWh)
                                        </label>
                                        <div className="space-y-3">
                                            {/* Off-Peak Price */}
                                            <div>
                                                <label className="text-xs text-slate-600 font-medium mb-1 block">
                                                    <span className="text-blue-600">Off-Peak (0-14h, 22-24h)</span>
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-600 text-xs">₹</span>
                                                    <input
                                                        type="number"
                                                        min="2"
                                                        max="8"
                                                        step="0.5"
                                                        value={offPeakPrice}
                                                        onChange={(e) => setOffPeakPrice(Number(e.target.value))}
                                                        className="flex-1 px-2 py-1.5 border border-blue-200 rounded text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                    <span className="text-slate-500 text-xs">/kWh</span>
                                                </div>
                                            </div>

                                            {/* Standard Price */}
                                            <div>
                                                <label className="text-xs text-slate-600 font-medium mb-1 block">
                                                    <span className="text-slate-600">Standard (6-14h)</span>
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-600 text-xs">₹</span>
                                                    <input
                                                        type="number"
                                                        min="4"
                                                        max="10"
                                                        step="0.5"
                                                        value={standardPrice}
                                                        onChange={(e) => setStandardPrice(Number(e.target.value))}
                                                        className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
                                                    />
                                                    <span className="text-slate-500 text-xs">/kWh</span>
                                                </div>
                                            </div>

                                            {/* Peak Price */}
                                            <div>
                                                <label className="text-xs text-slate-600 font-medium mb-1 block">
                                                    <span className="text-red-600">Peak (14-22h)</span>
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-600 text-xs">₹</span>
                                                    <input
                                                        type="number"
                                                        min="6"
                                                        max="15"
                                                        step="0.5"
                                                        value={peakPrice}
                                                        onChange={(e) => setPeakPrice(Number(e.target.value))}
                                                        className="flex-1 px-2 py-1.5 border border-red-200 rounded text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                                                    />
                                                    <span className="text-slate-500 text-xs">/kWh</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Challenge Mode Button */}
                                <button
                                    onClick={() => {
                                        setSelectedChallenge(null);
                                        setShowChallengeModal(true);
                                    }}
                                    className="w-full py-2 rounded-lg text-sm font-medium border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Target className="w-4 h-4" />
                                    Try a Challenge
                                </button>
                                {activeChallenge && (
                                    <div className="mt-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                                        <div className="flex items-center gap-1.5">
                                            <Target className="w-3 h-3" />
                                            <span className="font-medium">Active: </span>
                                            {challenges.find(c => c.id === activeChallenge.id)?.title}
                                            <span className="text-blue-500 capitalize ml-1">({activeChallenge.difficulty})</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "analysis" && result && (
                    <AnalysisContent result={result} onDownloadReport={downloadReport} />
                )}

                {activeTab === "analysis" && !result && (
                    <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                        <FlaskConical className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Simulation Data</h3>
                        <p className="text-gray-600 mb-4">Run a simulation first to see the analysis.</p>
                        <button
                            onClick={() => setActiveTab("simulation")}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors"
                        >
                            Go to Simulation
                        </button>
                    </div>
                )}

                {activeTab === "quiz" && (
                    <QuizContent />
                )}

                {activeTab === "references" && (
                    <ReferencesContent
                        isEnergyFlowMaximized={isEnergyFlowMaximized}
                        setIsEnergyFlowMaximized={setIsEnergyFlowMaximized}
                        result={result}
                        activeData={activeData}
                        currentHour={currentHour}
                        activeStrategy={activeStrategy}
                    />
                )}

                {activeTab === "feedback" && (
                    <FeedbackTab />
                )}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-8 py-4 relative">
                <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-600">
                    <p>Microgrid Digital Twin • Virtual Labs Hackathon 2026</p>
                    <p className="text-xs mt-1 text-gray-500">Powered by Next.js + Three.js + D3.js + p5.js</p>
                </div>
                {/* Energy Flow Maximize Modal */}
                {isEnergyFlowMaximized && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                        <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-blue-600" />
                                    24-Hour Energy Flow Analysis
                                </h3>
                                <button
                                    onClick={() => setIsEnergyFlowMaximized(false)}
                                    className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 flex-1 overflow-auto bg-white min-h-[400px]">
                                <EnergyFlowD3
                                    data={result ? result.smart_data : activeData}
                                    currentHour={currentHour}
                                    strategy={activeStrategy}
                                />
                            </div>
                        </div>
                    </div>
                )}

            </footer>
        </div>
    );
}

// Stat Card Component
function StatCard({ icon, label, value, color, bgColor }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
    bgColor: string; // Kept for interface compatibility but ignored in design
}) {
    return (
        <div className="bg-white rounded-lg p-3 border border-slate-200 relative overflow-hidden group hover:bg-slate-50 transition-colors">
            <div className={`absolute top-0 right-0 p-2 opacity-10 ${color}`}>
                {icon}
            </div>
            <div className="relative z-10">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-sm ${color}`}>{icon}</span>
                    <p className="text-lg font-bold text-slate-900">{value}</p>
                </div>
            </div>
        </div>
    );
}

// Theory Content Component
function TheoryContent() {
    return (
        <div className="bg-white rounded-lg border border-slate-200 p-8 max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3 pb-4 border-b border-slate-100">
                <BookOpen className="w-6 h-6 text-blue-600" />
                Theory: Microgrid Energy Management System & Scheduling
            </h2>

            <div className="space-y-12">
                {/* 1. Introduction & Definition */}
                <section>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
                        1. What is a Microgrid?
                    </h3>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="md:col-span-2">
                            <p className="text-slate-600 leading-relaxed text-sm mb-4">
                                A <strong>Microgrid</strong> is a localized group of electricity sources and loads that normally operates connected to the traditional wide-area synchronous grid (macrogrid), but has the ability to disconnect and function autonomously in "island mode".
                            </p>
                            <p className="text-slate-600 leading-relaxed text-sm">
                                Effective management of a microgrid requires an <strong>Energy Management System (EMS)</strong>—an intelligent control system that balances generation, storage, and load in real-time to minimize cost or maximize reliability.
                            </p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
                            <h4 className="font-semibold text-slate-900 mb-3">Key Components</h4>
                            <ul className="space-y-2">
                                <li className="flex gap-2">
                                    <Sun className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                    <span className="text-slate-600"><strong>Solar PV:</strong> Intermittent renewable generation source.</span>
                                </li>
                                <li className="flex gap-2">
                                    <Battery className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span className="text-slate-600"><strong>BESS:</strong> Battery Energy Storage System for energy time-shifting.</span>
                                </li>
                                <li className="flex gap-2">
                                    <Zap className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                    <span className="text-slate-600"><strong>The Grid:</strong> Infinite bus acting as backup and supplying power at variable rates.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* 2. Economic Motivation */}
                <section>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-emerald-600 rounded-full"></span>
                        2. Time-of-Use (ToU) Pricing & Arbitrage
                    </h3>
                    <div className="grid md:grid-cols-2 gap-8 items-center">
                        <div>
                            <p className="text-slate-600 leading-relaxed text-sm mb-4">
                                Utilities employ <strong>Time-of-Use (ToU)</strong> or Time-of-Day (ToD) tariffs to reflect the actual cost of generation. Electricity is significantly more expensive during "Peak Hours" (usually evenings) when demand is highest.
                            </p>
                            <div className="bg-white border-l-4 border-emerald-500 pl-4 py-2 my-4">
                                <h5 className="font-semibold text-slate-900 text-sm">Economic Concept: Energy Arbitrage</h5>
                                <p className="text-slate-600 text-xs mt-1">
                                    The strategy of purchasing/storing energy when prices are low (Off-peak/Solar) and using/selling it when prices are high (Peak).
                                    <br />
                                    <em>Formula: Profit = (Peak Price - OffPeak Price) × Energy Shifted</em>
                                </p>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                            <h4 className="font-semibold text-slate-900 text-sm mb-3 text-center">Time-of-Day Tariff Structure (Simulation Model)</h4>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-16 text-xs text-slate-500 text-right">00:00-06:00</div>
                                    <div className="flex-1 h-2 bg-blue-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 w-1/3"></div>
                                    </div>
                                    <div className="w-16 text-xs font-bold text-slate-700">₹4.0 <span className="text-[10px] font-normal text-slate-400">/kWh</span></div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-16 text-xs text-slate-500 text-right">06:00-18:00</div>
                                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-slate-400 w-2/3"></div>
                                    </div>
                                    <div className="w-16 text-xs font-bold text-slate-700">₹6.5 <span className="text-[10px] font-normal text-slate-400">/kWh</span></div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-16 text-xs text-slate-500 text-right">18:00-22:00</div>
                                    <div className="flex-1 h-2 bg-red-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-500 w-full"></div>
                                    </div>
                                    <div className="w-16 text-xs font-bold text-red-600">₹8.5 <span className="text-[10px] font-normal text-slate-400">/kWh</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. Control Strategies */}
                <section>
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <span className="w-1 h-6 bg-purple-600 rounded-full"></span>
                        3. Intelligent Control Strategies
                    </h3>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="border border-slate-200 rounded-xl p-5 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-slate-100 rounded-lg">
                                    <RotateCcw className="w-5 h-5 text-slate-600" />
                                </div>
                                <h4 className="font-bold text-slate-900">Baseline Strategy (Uncontrolled)</h4>
                            </div>
                            <p className="text-slate-600 text-sm mb-4 min-h-[60px]">
                                Represents a "dumb" grid interaction with no energy management logic.
                            </p>
                            <ul className="space-y-2 text-sm text-slate-600 bg-slate-50 p-4 rounded-lg">
                                <li className="flex items-start gap-2">
                                    <span className="text-red-500 mt-1">✕</span>
                                    <span>Solar energy powers the load immediately.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-500 mt-1">✕</span>
                                    <span><strong>Wasted Surplus:</strong> Excess solar energy is curbed/wasted if load is low.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-500 mt-1">✕</span>
                                    <span><strong>Idle Battery:</strong> Battery sits at initial charge and is never used.</span>
                                </li>
                            </ul>
                        </div>

                        <div className="border border-blue-200 bg-blue-50/10 rounded-xl p-5 hover:bg-blue-50/20 transition-colors relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                                <Zap className="w-24 h-24 text-blue-600" />
                            </div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <FlaskConical className="w-5 h-5 text-blue-600" />
                                </div>
                                <h4 className="font-bold text-blue-900">Smart Scheduling Strategy</h4>
                            </div>
                            <p className="text-slate-600 text-sm mb-4 min-h-[60px]">
                                Uses <strong>Heuristic Rule-Based Logic</strong> to minimize daily operational cost.
                            </p>
                            <ul className="space-y-2 text-sm text-slate-700 bg-white border border-blue-100 p-4 rounded-lg">
                                <li className="flex items-start gap-2">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                                    <span><strong>Priority 1 (Harvest):</strong> If Solar &gt; Load, charge battery with surplus (Store "Free" Energy).</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                                    <span><strong>Priority 2 (Peak Shave):</strong> If Peak Hour &amp; Battery available, discharge to meet load.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                                    <span><strong>Priority 3 (Grid):</strong> Only use grid for remaining deficit or off-peak needs.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* 4. Demand Side Management */}
                <section>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <span className="w-1 h-6 bg-amber-500 rounded-full"></span>
                        4. Key Objectives & Outcomes
                    </h3>
                    <div className="bg-amber-50 rounded-xl p-6 border border-amber-100">
                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="font-bold text-slate-900 mb-2">Peak Shaving</h4>
                                <p className="text-slate-700 text-sm mb-4">
                                    Flattening the load curve by reducing grid consumption during peak hours. This reduces strain on the national grid and lowers demand charges.
                                </p>
                                <div className="h-16 flex items-end gap-1 opacity-70">
                                    {[20, 30, 80, 100, 90, 40, 30].map((h, i) => (
                                        <div key={i} className="flex-1 bg-red-400 rounded-t" style={{ height: `${h}%` }}></div>
                                    ))}
                                    <span className="text-xs text-slate-500 self-center ml-2">Baseline</span>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 mb-2">Load Shifting</h4>
                                <p className="text-slate-700 text-sm mb-4">
                                    Effectively moving the consumption of energy to a time when it is cheaper or greener (e.g., consuming solar energy generated at noon during the night via battery).
                                </p>
                                <div className="h-16 flex items-end gap-1 opacity-70">
                                    {[40, 50, 60, 60, 60, 50, 40].map((h, i) => (
                                        <div key={i} className="flex-1 bg-emerald-500 rounded-t" style={{ height: `${h}%` }}></div>
                                    ))}
                                    <span className="text-xs text-slate-500 self-center ml-2">Smart</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

// Procedure Content Component
function ProcedureContent({ currentStep, completedSteps, onStepChange, onGoToSimulation }: {
    currentStep: number;
    completedSteps: number[];
    onStepChange: (step: number) => void;
    onGoToSimulation: () => void;
}) {
    // Map each step to a GIF
    const stepGifs: Record<number, string> = {
        0: '/battery-capacity.gif',  // Initialize Microgrid
        1: '/energy-prices.gif',     // Set Energy Prices
        2: '/baseline.gif',          // Run Baseline Strategy
        3: '/smart.gif',             // Run Smart Strategy
        4: '/smart.gif',             // Analyze Results (reuse smart gif)
    };

    const stepGifDescriptions: Record<number, string> = {
        0: 'Configure your battery capacity and initial state of charge',
        1: 'Set peak and off-peak electricity pricing',
        2: 'Watch how the baseline strategy operates without optimization',
        3: 'See how the smart strategy optimizes energy usage',
        4: 'Compare the results of both strategies',
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Steps List */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-600" />
                    Simulation Walkthrough
                </h2>

                <div className="space-y-3">
                    {PROCEDURE_STEPS.map((step, index) => {
                        const isActive = currentStep === index;
                        const isCompleted = completedSteps.includes(index);

                        return (
                            <button
                                key={step.id}
                                onClick={() => onStepChange(index)}
                                className={`w-full text-left p-4 rounded-lg border transition-all group ${isActive
                                    ? "bg-slate-50 border-blue-500"
                                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${isActive
                                        ? "bg-blue-600 text-white"
                                        : isCompleted
                                            ? "bg-slate-800 text-white"
                                            : "bg-slate-100 text-slate-400"
                                        }`}>
                                        <span className="text-sm font-bold">{step.id}</span>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={`text-sm font-semibold ${isActive ? "text-slate-900" : "text-slate-700"
                                            }`}>
                                            {step.title}
                                        </h4>
                                        <p className={`text-xs mt-1 ${isActive ? "text-slate-600" : "text-slate-500"}`}>
                                            {step.description}
                                        </p>
                                    </div>
                                    {isActive && <ChevronRight className="w-4 h-4 text-blue-500" />}
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Right: GIF Preview */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Play className="w-5 h-5 text-blue-600" />
                    Step {currentStep + 1} Preview
                </h2>
                <p className="text-sm text-slate-600 mb-4">{stepGifDescriptions[currentStep]}</p>
                <div className="relative bg-slate-100 rounded-lg overflow-hidden border border-slate-200 aspect-video flex items-center justify-center">
                    <img
                        src={stepGifs[currentStep]}
                        alt={`Step ${currentStep + 1} demonstration`}
                        className="w-full h-full object-contain"
                    />
                </div>
                <div className="mt-4 flex items-center justify-between">
                    <button
                        onClick={() => onStepChange(Math.max(0, currentStep - 1))}
                        disabled={currentStep === 0}
                        className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                    </button>
                    <span className="text-xs text-slate-500">Step {currentStep + 1} of {PROCEDURE_STEPS.length}</span>
                    <button
                        onClick={() => {
                            if (currentStep === PROCEDURE_STEPS.length - 1) {
                                onGoToSimulation();
                            } else {
                                onStepChange(currentStep + 1);
                            }
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                    >
                        {currentStep === PROCEDURE_STEPS.length - 1 ? 'Go to Simulation' : 'Next'}
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// Analysis Content Component
function AnalysisContent({ result, onDownloadReport }: { result: SimulationResult, onDownloadReport: () => void }) {
    return (
        <div className="space-y-6" id="analysis-report-content">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-medium text-gray-900">Analysis Results</h2>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-400">Baseline vs Smart Strategy</span>
                        <button
                            onClick={onDownloadReport}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Download Report
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid md:grid-cols-3 gap-4">
                    {/* Cost Comparison */}
                    <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                        <h3 className="text-sm font-medium text-gray-500 mb-4">Daily Cost</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Baseline</span>
                                <span className="text-lg font-semibold text-gray-900">
                                    ₹{result.summary.baseline_total_cost.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Smart</span>
                                <span className="text-lg font-semibold text-green-600">
                                    ₹{result.summary.smart_total_cost.toFixed(2)}
                                </span>
                            </div>
                            <div className="pt-3 border-t border-gray-200">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Savings</span>
                                    <div className="text-right">
                                        <span className="text-xl font-bold text-green-600">
                                            {result.summary.cost_saved_percent.toFixed(1)}%
                                        </span>
                                        <p className="text-xs text-gray-500">
                                            ₹{result.summary.cost_saved.toFixed(2)}/day
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Grid Usage */}
                    <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                        <h3 className="text-sm font-medium text-gray-500 mb-4">Grid Usage</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Baseline</span>
                                <span className="text-lg font-semibold text-gray-900">
                                    {result.summary.baseline_grid_usage.toFixed(1)} kWh
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Smart</span>
                                <span className="text-lg font-semibold text-green-600">
                                    {result.summary.smart_grid_usage.toFixed(1)} kWh
                                </span>
                            </div>
                            <div className="pt-3 border-t border-gray-200">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Reduction</span>
                                    <div className="text-right">
                                        <span className="text-xl font-bold text-gray-900">
                                            {result.summary.grid_reduced_percent.toFixed(1)}%
                                        </span>
                                        <p className="text-xs text-gray-500">
                                            {result.summary.grid_reduced.toFixed(1)} kWh saved
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Key Insights */}
                    <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                        <h3 className="text-sm font-medium text-gray-500 mb-4">Key Insights</h3>
                        <ul className="space-y-2">
                            <li className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-gray-700">
                                    Reduces peak grid purchases effectively
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-gray-700">
                                    Stores excess solar for evening use
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-gray-700">
                                    {result.summary.cost_saved_percent.toFixed(0)}% cost reduction achieved
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-gray-700">
                                    Lower carbon footprint
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Energy Flow Graph */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    24-Hour Energy Flow (Smart Strategy)
                </h3>
                <div className="h-[400px] bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                    <EnergyFlowD3
                        data={result.smart_data}
                        currentHour={24}
                        strategy="smart"
                    />
                </div>
            </div>

            {/* Hourly Breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-4">24-Hour Breakdown</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-3 text-gray-600 font-medium">Hour</th>
                                <th className="text-right py-3 px-3 text-gray-600 font-medium">Solar</th>
                                <th className="text-right py-3 px-3 text-gray-600 font-medium">Load</th>
                                <th className="text-right py-3 px-3 text-gray-600 font-medium">Battery</th>
                                <th className="text-right py-3 px-3 text-gray-600 font-medium">Grid (Base)</th>
                                <th className="text-right py-3 px-3 text-gray-600 font-medium">Grid (Smart)</th>
                                <th className="text-right py-3 px-3 text-gray-600 font-medium">Savings</th>
                            </tr>
                        </thead>
                        <tbody>
                            {result.smart_data.map((smart, i) => {
                                const baseline = result.baseline_data[i];
                                const savings = baseline.hourly_cost - smart.hourly_cost;
                                return (
                                    <tr
                                        key={i}
                                        className={`border-b border-gray-100 hover:bg-gray-50 ${smart.is_peak_hour ? "bg-orange-50/50" : ""
                                            }`}
                                    >
                                        <td className="py-2.5 px-3 font-mono text-gray-900">
                                            {String(i).padStart(2, "0")}:00
                                            {smart.is_peak_hour && (
                                                <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Peak</span>
                                            )}
                                        </td>
                                        <td className="text-right py-2.5 px-3 text-amber-600 font-medium">
                                            {smart.solar_generation.toFixed(1)}
                                        </td>
                                        <td className="text-right py-2.5 px-3 text-gray-700 font-medium">
                                            {smart.load_demand.toFixed(1)}
                                        </td>
                                        <td className="text-right py-2.5 px-3">
                                            <span className={`font-medium ${smart.battery_soc > 70 ? "text-green-600" :
                                                smart.battery_soc > 30 ? "text-amber-600" : "text-red-600"
                                                }`}>
                                                {smart.battery_soc.toFixed(0)}%
                                            </span>
                                        </td>
                                        <td className="text-right py-2.5 px-3 text-gray-500">
                                            {baseline.grid_usage.toFixed(1)}
                                        </td>
                                        <td className="text-right py-2.5 px-3 text-indigo-600 font-medium">
                                            {smart.grid_usage.toFixed(1)}
                                        </td>
                                        <td className={`text-right py-2.5 px-3 font-medium ${savings > 0 ? "text-green-600" : "text-gray-400"
                                            }`}>
                                            {savings > 0 ? `₹${savings.toFixed(2)}` : "—"}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function QuizContent() {
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [submitted, setSubmitted] = useState(false);
    const [showResults, setShowResults] = useState(false);

    const questions = [
        {
            id: 1,
            question: "In a Time-of-Use (ToU) tariff system, when is electricity most expensive?",
            options: [
                "During night time (10 PM - 6 AM)",
                "During peak demand hours (typically afternoon/evening)",
                "Early morning (6 AM - 9 AM)",
                "On weekends and holidays"
            ],
            correct: 1
        },
        {
            id: 2,
            question: "What is the primary benefit of Energy Arbitrage with a battery in a microgrid?",
            options: [
                "Increasing the voltage level constantly",
                "Buying energy at low prices and using/selling it when prices are high",
                "Cooling down the solar inverter",
                "Generating solar power during the night"
            ],
            correct: 1
        },
        {
            id: 3,
            question: "Which component is essential for a microgrid to operate in 'island mode'?",
            options: [
                "Smart Meter",
                "Grid connection",
                "Energy Storage or Local Generation source",
                "High-speed Internet connection"
            ],
            correct: 2
        },
        {
            id: 4,
            question: "What does SoC stand for in the context of battery management?",
            options: [
                "Source of Current",
                "State of Charge",
                "System of Control",
                "Solar on Cloud"
            ],
            correct: 1
        },
        {
            id: 5,
            question: "A 'smart' energy management system primarily aims to:",
            options: [
                "Maximize grid usage at all times",
                "Keep the battery 100% charged constantly",
                "Optimize cost and efficiency by balancing generation, load, and prices",
                "Disconnect user loads randomly to save power"
            ],
            correct: 2
        }
    ];

    const handleSubmit = () => {
        setSubmitted(true);
        setShowResults(true);
    };

    const resetQuiz = () => {
        setAnswers({});
        setSubmitted(false);
        setShowResults(false);
    };

    const score = Object.keys(answers).reduce((acc, key) => {
        const qId = parseInt(key);
        const q = questions.find(q => q.id === qId);
        if (q && answers[qId] === q.correct) {
            return acc + 1;
        }
        return acc;
    }, 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white rounded-xl p-8 border border-slate-200">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-indigo-50 rounded-lg">
                        <CheckSquare className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Knowledge Check</h2>
                        <p className="text-slate-600">Test your understanding of Microgrid concepts.</p>
                    </div>
                </div>

                <div className="space-y-8">
                    {questions.map((q, idx) => (
                        <div key={q.id} className="p-6 bg-slate-50 rounded-lg border border-slate-100">
                            <h3 className="text-lg font-semibold text-slate-900 mb-4">
                                {idx + 1}. {q.question}
                            </h3>
                            <div className="space-y-3">
                                {q.options.map((option, optIdx) => (
                                    <button
                                        key={optIdx}
                                        disabled={submitted}
                                        onClick={() => setAnswers({ ...answers, [q.id]: optIdx })}
                                        className={`w-full text-left p-4 rounded-md border transition-all flex items-center justify-between ${answers[q.id] === optIdx
                                            ? "bg-indigo-50 border-indigo-200 text-indigo-900"
                                            : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700"
                                            } ${showResults && q.correct === optIdx
                                                ? "!bg-green-50 !border-green-300 !text-green-800"
                                                : showResults && answers[q.id] === optIdx && answers[q.id] !== q.correct
                                                    ? "!bg-red-50 !border-red-200 !text-red-800"
                                                    : ""
                                            }`}
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs border ${answers[q.id] === optIdx ? "border-indigo-500 bg-indigo-100 text-indigo-700" : "border-slate-300 text-slate-500"
                                                } ${showResults && q.correct === optIdx ? "!bg-green-100 !border-green-500 !text-green-700" : ""}`}>
                                                {String.fromCharCode(65 + optIdx)}
                                            </span>
                                            {option}
                                        </span>
                                        {showResults && (
                                            q.correct === optIdx ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
                                                (answers[q.id] === optIdx ? <XCircle className="w-5 h-5 text-red-500" /> : null)
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
                    <div>
                        {showResults && (
                            <p className="text-lg font-medium">
                                Score: <span className={score >= 4 ? "text-green-600" : "text-indigo-600"}>{score} / {questions.length}</span>
                                <span className="text-sm text-slate-500 ml-2">
                                    {score === questions.length ? "Excellent!" : score >= 3 ? "Good job!" : "Keep learning!"}
                                </span>
                            </p>
                        )}
                    </div>
                    {!showResults ? (
                        <button
                            onClick={handleSubmit}
                            disabled={Object.keys(answers).length < questions.length}
                            className={`px-6 py-2.5 rounded-lg font-medium text-white transition-colors ${Object.keys(answers).length < questions.length
                                ? "bg-slate-300 cursor-not-allowed"
                                : "bg-indigo-600 hover:bg-indigo-700"
                                }`}
                        >
                            Submit Answers
                        </button>
                    ) : (
                        <button
                            onClick={resetQuiz}
                            className="px-6 py-2.5 rounded-lg font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                        >
                            Retake Quiz
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function ReferencesContent({
    isEnergyFlowMaximized,
    setIsEnergyFlowMaximized,
    result,
    activeData,
    currentHour,
    activeStrategy
}: {
    isEnergyFlowMaximized: boolean;
    setIsEnergyFlowMaximized: (v: boolean) => void;
    result: SimulationResult | null;
    activeData: HourlyData[];
    currentHour: number;
    activeStrategy: "baseline" | "smart";
}) {
    const references = [
        {
            category: "Standards",
            items: [
                {
                    title: "IEEE 2030.7-2017",
                    desc: "IEEE Standard for the Specification of Microgrid Controllers",
                    link: "https://standards.ieee.org/standard/2030_7-2017.html"
                },
                {
                    title: "IEC 61850-7-420:2009",
                    desc: "Communication networks and systems for power utility automation - Distributed energy resources logical nodes",
                    link: "https://webstore.iec.ch/publication/6018"
                }
            ]
        },
        {
            category: "Academic Papers",
            items: [
                {
                    title: "A review of smart energy management systems in microgrids",
                    desc: "C. Chen et al., Renewable and Sustainable Energy Reviews, vol. 60, pp. 1163–1178, 2017.",
                    link: "#"
                },
                {
                    title: "Energy management systems for microgrids: A review",
                    desc: "W. Shi et al., Wiley Interdisciplinary Reviews: Energy and Environment, 2015.",
                    link: "#"
                },
                {
                    title: "Microgrids: Architectures and Control",
                    desc: "N. Hatziargyriou et al., IEEE Power and Energy Magazine, 2007.",
                    link: "#"
                }
            ]
        },
        {
            category: "Books",
            items: [
                {
                    title: "Microgrids: Architectures and Control",
                    desc: "N. Hatziargyriou, Wiley-IEEE Press, 2014. ISBN: 978-1-118-72068-4",
                    link: "#"
                }
            ]
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white rounded-xl p-8 border border-slate-200">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-amber-50 rounded-lg">
                        <FileText className="w-8 h-8 text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">References & Further Reading</h2>
                        <p className="text-slate-600">Essential resources for Microgrid standards and research.</p>
                    </div>
                </div>

                <div className="grid gap-6">
                    {references.map((section, idx) => (
                        <div key={idx} className="border border-slate-100 rounded-lg overflow-hidden">
                            <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-100 flex items-center gap-2">
                                <LayoutList className="w-4 h-4 text-slate-500" />
                                <h3 className="font-semibold text-slate-800">{section.category}</h3>
                            </div>
                            <div className="p-6 space-y-4">
                                {section.items.map((item, i) => (
                                    <div key={i} className="group flex items-start justify-between">
                                        <div>
                                            <a
                                                href={item.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-base font-medium text-blue-700 hover:underline cursor-pointer inline-block"
                                            >
                                                {item.title}
                                            </a>
                                            <p className="text-sm text-slate-600 mt-1">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 p-4 bg-sky-50 rounded-lg border border-sky-100 text-sky-800 text-sm flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 flex-shrink-0 text-sky-600 mt-0.5" />
                    <p>
                        These references are widely cited in the electrical engineering community.
                        IEEE 2030.7 is particularly important for understanding the functional specifications of a generic Microgrid Controller.
                    </p>
                </div>
            </div>
        </div>
    );
}

function VLabsToggleMenu({
    isEnergyFlowExpanded,
    setIsEnergyFlowExpanded,
    isBillExpanded,
    setIsBillExpanded,
    isBatteryExpanded,
    setIsBatteryExpanded,
}: {
    isEnergyFlowExpanded: boolean;
    setIsEnergyFlowExpanded: (v: boolean) => void;
    isBillExpanded: boolean;
    setIsBillExpanded: (v: boolean) => void;
    isBatteryExpanded: boolean;
    setIsBatteryExpanded: (v: boolean) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);

    const allExpanded = isEnergyFlowExpanded && isBillExpanded && isBatteryExpanded;

    const handleToggleAll = () => {
        const newState = !allExpanded;
        setIsEnergyFlowExpanded(newState);
        setIsBillExpanded(newState);
        setIsBatteryExpanded(newState);
    };

    return (
        <div className="relative z-50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-all"
                title="Toggle panel visibility"
            >
                <MoreVertical className="w-5 h-5" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="p-2 space-y-1">
                        <button
                            onClick={handleToggleAll}
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-50 transition-colors flex items-center gap-3 text-slate-700"
                        >
                            <input
                                type="checkbox"
                                checked={allExpanded}
                                onChange={handleToggleAll}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium">
                                {allExpanded ? "Collapse All" : "Expand All"}
                            </span>
                        </button>

                        <div className="h-px bg-slate-100 my-1" />

                        <button
                            onClick={() => setIsEnergyFlowExpanded(!isEnergyFlowExpanded)}
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-50 transition-colors flex items-center gap-3 text-slate-600"
                        >
                            <input
                                type="checkbox"
                                checked={isEnergyFlowExpanded}
                                onChange={() => setIsEnergyFlowExpanded(!isEnergyFlowExpanded)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">Energy Flow</span>
                        </button>

                        <button
                            onClick={() => setIsBillExpanded(!isBillExpanded)}
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-50 transition-colors flex items-center gap-3 text-slate-600"
                        >
                            <input
                                type="checkbox"
                                checked={isBillExpanded}
                                onChange={() => setIsBillExpanded(!isBillExpanded)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">Electricity Bill</span>
                        </button>

                        <button
                            onClick={() => setIsBatteryExpanded(!isBatteryExpanded)}
                            className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-50 transition-colors flex items-center gap-3 text-slate-600"
                        >
                            <input
                                type="checkbox"
                                checked={isBatteryExpanded}
                                onChange={() => setIsBatteryExpanded(!isBatteryExpanded)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm">Battery Status</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

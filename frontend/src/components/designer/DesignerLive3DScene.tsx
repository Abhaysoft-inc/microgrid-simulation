"use client";

/**
 * DesignerLive3DScene
 * ====================
 * React-Three-Fiber 3D scene that renders the user's designed grid
 * layout with live simulation data overlaid (day/night cycle,
 * animated energy flow wires, battery SOC, power labels).
 */

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Text } from "@react-three/drei";
import * as THREE from "three";
import DesignerModel3D from "./DesignerModel3D";
import type { PlacedNode, Wire } from "@/lib/microgridElements";

const SCALE = 0.02; // designer-px → world-units

// ─── Types ──────────────────────────────────────────────
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

interface DesignerLive3DSceneProps {
    nodes: PlacedNode[];
    wires: Wire[];
    currentData: LiveData;
}

// ─── Sky dome that changes with hour ────────────────────
function DynamicSky({ hour }: { hour: number }) {
    const ref = useRef<THREE.Mesh>(null);

    useFrame(() => {
        if (!ref.current) return;
        const mat = ref.current.material as THREE.MeshBasicMaterial;
        const isNight = hour < 5 || hour >= 20;
        const isDawn = hour >= 5 && hour < 7;
        const isDusk = hour >= 17 && hour < 20;

        const c = new THREE.Color();
        if (isNight) c.setHex(0x050510);
        else if (isDawn) c.lerpColors(new THREE.Color(0x1a1a3a), new THREE.Color(0xffaa66), (hour - 5) / 2);
        else if (isDusk) c.lerpColors(new THREE.Color(0xffaa66), new THREE.Color(0x1a1a3a), (hour - 17) / 3);
        else c.lerpColors(new THREE.Color(0x6bb3e0), new THREE.Color(0x87ceeb), 1 - Math.abs(hour - 12) / 6);
        mat.color.lerp(c, 0.1);
    });

    return (
        <mesh ref={ref}>
            <sphereGeometry args={[80, 16, 16]} />
            <meshBasicMaterial color="#87ceeb" side={THREE.BackSide} />
        </mesh>
    );
}

// ─── Sunlight that tracks the hour ──────────────────────
function DynamicLighting({ hour }: { hour: number }) {
    const sunRef = useRef<THREE.DirectionalLight>(null);
    const ambRef = useRef<THREE.AmbientLight>(null);

    useFrame(() => {
        if (!sunRef.current || !ambRef.current) return;
        const progress = Math.max(0, Math.min(1, (hour - 5) / 14));
        const angle = progress * Math.PI;
        const h = Math.sin(angle) * 16;
        const x = Math.cos(angle) * 22;
        sunRef.current.position.set(x, Math.max(h, 1), -5);

        const isNight = hour < 5 || hour >= 20;
        sunRef.current.intensity = isNight ? 0 : 0.8 + Math.sin(angle) * 0.7;
        ambRef.current.intensity = isNight ? 0.15 : 0.3 + Math.sin(angle) * 0.2;
    });

    return (
        <>
            <ambientLight ref={ambRef} intensity={0.4} />
            <directionalLight
                ref={sunRef}
                intensity={1.2}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
            />
            <hemisphereLight args={["#87ceeb", "#3d5c5c", 0.4]} />
        </>
    );
}

// ─── Sun/Moon spheres ───────────────────────────────────
function CelestialBodies({ hour }: { hour: number }) {
    const sunRef = useRef<THREE.Group>(null);
    const moonRef = useRef<THREE.Group>(null);

    useFrame(() => {
        if (sunRef.current) {
            const progress = Math.max(0, Math.min(1, (hour - 5) / 14));
            const angle = progress * Math.PI;
            const h = Math.sin(angle) * 16;
            const x = Math.cos(angle) * 22;
            sunRef.current.position.set(x, Math.max(h, -10), -12);
            sunRef.current.visible = hour >= 5 && hour <= 19 && h > -2;
        }
        if (moonRef.current) {
            let visible = false;
            let mp = 0;
            if (hour >= 18) { mp = (hour - 18) / 12; visible = true; }
            else if (hour <= 6) { mp = (hour + 6) / 12; visible = true; }
            if (visible) {
                const angle = mp * Math.PI;
                moonRef.current.position.set(Math.cos(angle) * 22, Math.max(Math.sin(angle) * 15, -10), -12);
            }
            moonRef.current.visible = visible;
        }
    });

    return (
        <>
            <group ref={sunRef}>
                <mesh>
                    <sphereGeometry args={[2, 32, 32]} />
                    <meshBasicMaterial color="#ffee55" />
                </mesh>
                <mesh>
                    <sphereGeometry args={[2.5, 32, 32]} />
                    <meshBasicMaterial color="#ffaa00" transparent opacity={0.3} side={THREE.BackSide} />
                </mesh>
            </group>
            <group ref={moonRef} visible={false}>
                <mesh>
                    <sphereGeometry args={[1.2, 32, 32]} />
                    <meshStandardMaterial color="#e0e0e0" roughness={0.8} />
                </mesh>
                <mesh>
                    <sphereGeometry args={[1.6, 32, 32]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.15} side={THREE.BackSide} />
                </mesh>
            </group>
        </>
    );
}

// ─── Ground ─────────────────────────────────────────────
function Ground() {
    return (
        <>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[200, 200]} />
                <meshStandardMaterial color="#2d5a2d" roughness={0.9} />
            </mesh>
            {/* concrete pad */}
            <mesh position={[0, 0, 0]} receiveShadow>
                <boxGeometry args={[30, 0.12, 20]} />
                <meshStandardMaterial color="#555555" roughness={0.7} />
            </mesh>
        </>
    );
}

// ─── Animated wire with current flow ────────────────────
function LiveWire({ from, to, active, color }: {
    from: { x: number; z: number }; to: { x: number; z: number };
    active: boolean; color: string;
}) {
    const curve = useMemo(() => {
        const s = new THREE.Vector3(from.x, 0.3, from.z);
        const e = new THREE.Vector3(to.x, 0.3, to.z);
        const m1 = s.clone().lerp(e, 0.33); m1.y = 0.8;
        const m2 = s.clone().lerp(e, 0.66); m2.y = 0.8;
        return new THREE.CatmullRomCurve3([s, m1, m2, e]);
    }, [from, to]);

    const tubeGeom = useMemo(() => new THREE.TubeGeometry(curve, 32, 0.04, 8, false), [curve]);

    return (
        <group>
            <mesh geometry={tubeGeom}>
                <meshStandardMaterial color={active ? color : "#333"} metalness={0.4} roughness={0.3} />
            </mesh>
            {active && (
                <mesh geometry={tubeGeom}>
                    <meshStandardMaterial color={color} transparent opacity={0.2} emissive={color} emissiveIntensity={0.6} />
                </mesh>
            )}
            {active && <FlowParticles curve={curve} color={color} />}
        </group>
    );
}

// ─── Flowing energy particles along a curve ──────────────
function FlowParticles({ curve, color, count = 8 }: { curve: THREE.CatmullRomCurve3; color: string; count?: number }) {
    const refs = useRef<(THREE.Mesh | null)[]>([]);

    useFrame(({ clock }) => {
        const t0 = clock.getElapsedTime() * 0.4;
        for (let i = 0; i < count; i++) {
            const mesh = refs.current[i];
            if (!mesh) continue;
            const t = ((t0 + i / count) % 1);
            const pt = curve.getPoint(t);
            mesh.position.set(pt.x, pt.y + Math.sin(t * Math.PI) * 0.15, pt.z);
        }
    });

    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <mesh key={i} ref={(el) => { refs.current[i] = el; }}>
                    <sphereGeometry args={[0.06, 6, 6]} />
                    <meshBasicMaterial color={color} transparent opacity={0.9} />
                </mesh>
            ))}
        </>
    );
}

// ─── Battery node with live SOC overlay ─────────────────
function LiveBatteryOverlay({ node, soc }: { node: PlacedNode; soc: number }) {
    const px = (node.x + node.width / 2) * SCALE;
    const pz = (node.y + node.height / 2) * SCALE;
    const fraction = Math.max(0, Math.min(1, soc / 100));
    const col = fraction > 0.5 ? "#22c55e" : fraction > 0.2 ? "#eab308" : "#ef4444";

    return (
        <group position={[px, 0, pz]}>
            {/* SOC bar behind/above the model */}
            <mesh position={[0, 1.8, 0.6]}>
                <boxGeometry args={[1, 0.15, 0.05]} />
                <meshBasicMaterial color="#1e293b" />
            </mesh>
            <mesh position={[-(1 - fraction) * 0.5, 1.8, 0.62]}>
                <boxGeometry args={[fraction * 1, 0.12, 0.05]} />
                <meshBasicMaterial color={col} />
            </mesh>
            <Text position={[0, 2.05, 0.6]} fontSize={0.18} color="#fff" anchorX="center">
                {`${soc.toFixed(0)}%`}
            </Text>
        </group>
    );
}

// ─── Power value label floating above a node ────────────
function PowerLabel({ node, value, unit, color }: {
    node: PlacedNode; value: number; unit: string; color: string;
}) {
    if (value < 0.01) return null;
    const px = (node.x + node.width / 2) * SCALE;
    const pz = (node.y + node.height / 2) * SCALE;
    return (
        <Text position={[px, 2.4, pz]} fontSize={0.2} color={color} anchorX="center" outlineWidth={0.02} outlineColor="#000">
            {`${value.toFixed(1)} ${unit}`}
        </Text>
    );
}

// ─── Camera auto-frame ──────────────────────────────────
function CameraSetup({ center }: { center: [number, number, number] }) {
    const { camera } = useThree();
    useMemo(() => {
        camera.position.set(center[0] + 12, 10, center[2] + 12);
        camera.lookAt(center[0], 0, center[2]);
    }, [camera, center]);
    return <OrbitControls target={center} maxPolarAngle={Math.PI / 2.1} minDistance={3} maxDistance={60} enableDamping dampingFactor={0.05} />;
}

// ═══════════════════════════════════════════════════════
// MAIN EXPORTED COMPONENT
// ═══════════════════════════════════════════════════════
export default function DesignerLive3DScene({ nodes, wires, currentData }: DesignerLive3DSceneProps) {
    const center = useMemo<[number, number, number]>(() => {
        if (nodes.length === 0) return [0, 0, 0];
        let cx = 0, cz = 0;
        nodes.forEach(n => { cx += (n.x + n.width / 2) * SCALE; cz += (n.y + n.height / 2) * SCALE; });
        return [cx / nodes.length, 0, cz / nodes.length];
    }, [nodes]);

    // Helper: get world-space position of a port
    const portPos = (nodeId: string, portId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        const port = node?.ports.find(p => p.id === portId);
        if (!node || !port) return { x: 0, z: 0 };
        return { x: (node.x + port.x) * SCALE, z: (node.y + port.y) * SCALE };
    };

    // Determine which wires are active based on energy flow
    const wireActivity = useMemo(() => {
        const result: Record<string, { active: boolean; color: string }> = {};
        const solarActive = currentData.solar_generation > 0.1;
        const gridActive = currentData.grid_usage > 0.1;
        const isCharging = currentData.battery_charge > 0.1;
        const isDischarging = currentData.battery_discharge > 0.1;

        wires.forEach(w => {
            const fromNode = nodes.find(n => n.id === w.fromNode);
            const toNode = nodes.find(n => n.id === w.toNode);
            let active = false;
            let color = "#4ade80";

            if (fromNode?.type === "solar_panel") {
                active = solarActive;
                color = "#fbbf24"; // yellow for solar
            } else if (fromNode?.type === "grid_connection" || toNode?.type === "grid_connection") {
                active = gridActive;
                color = "#8b5cf6"; // purple for grid
            } else if (fromNode?.type === "battery" && toNode) {
                active = isDischarging;
                color = "#22c55e"; // green for battery discharge
            } else if (toNode?.type === "battery") {
                active = isCharging;
                color = "#10b981";
            } else {
                active = solarActive || isDischarging;
                color = "#4ade80";
            }
            result[w.id] = { active, color };
        });
        return result;
    }, [wires, nodes, currentData]);

    // Find specific node types for overlay
    const batteryNodes = nodes.filter(n => n.type === "battery");
    const solarNodes = nodes.filter(n => n.type === "solar_panel");
    const gridNodes = nodes.filter(n => n.type === "grid_connection");
    const loadNodes = nodes.filter(n => ["residential_load", "commercial_load"].includes(n.type));

    const hour = currentData.hour;
    const isNight = hour < 5 || hour >= 20;

    return (
        <div className="w-full h-[350px] rounded-lg overflow-hidden relative">
            <Canvas shadows camera={{ position: [center[0] + 12, 10, center[2] + 12], fov: 50 }}>
                {/* Sky & lighting */}
                <DynamicSky hour={hour} />
                <DynamicLighting hour={hour} />
                <CelestialBodies hour={hour} />
                {isNight && <Stars radius={100} depth={50} count={2000} factor={3} saturation={0} fade speed={1} />}
                <fog attach="fog" args={["#87ceeb", 30, 80]} />

                {/* Ground */}
                <Ground />

                {/* Render user-placed nodes */}
                {nodes.map(node => {
                    const px = (node.x + node.width / 2) * SCALE;
                    const pz = (node.y + node.height / 2) * SCALE;
                    return (
                        <group key={node.id} position={[px, 0, pz]}>
                            <DesignerModel3D
                                type={node.type}
                                color={node.color}
                                label={node.label}
                                isSelected={false}
                                props={node.props}
                            />
                        </group>
                    );
                })}

                {/* Render wires with energy flow */}
                {wires.map(w => {
                    const from = portPos(w.fromNode, w.fromPort);
                    const to = portPos(w.toNode, w.toPort);
                    const info = wireActivity[w.id] || { active: false, color: "#333" };
                    return (
                        <LiveWire key={w.id} from={from} to={to} active={info.active} color={info.color} />
                    );
                })}

                {/* Battery SOC overlays */}
                {batteryNodes.map(n => (
                    <LiveBatteryOverlay key={`soc-${n.id}`} node={n} soc={currentData.battery_soc} />
                ))}

                {/* Power labels */}
                {solarNodes.length > 0 && (
                    <PowerLabel node={solarNodes[0]} value={currentData.solar_generation} unit="kW" color="#fbbf24" />
                )}
                {gridNodes.length > 0 && (
                    <PowerLabel node={gridNodes[0]} value={currentData.grid_usage} unit="kW" color="#8b5cf6" />
                )}
                {loadNodes.length > 0 && (
                    <PowerLabel node={loadNodes[0]} value={currentData.load_demand} unit="kW" color="#ef4444" />
                )}

                <CameraSetup center={center} />
            </Canvas>

            {/* HUD overlays */}
            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-white">
                <div className="text-[10px] text-gray-400">Time</div>
                <div className="text-lg font-bold font-mono">{String(hour).padStart(2, "0")}:00</div>
            </div>

            {currentData.is_peak_hour && (
                <div className="absolute top-3 right-24 bg-red-500/80 text-white px-2 py-1 rounded-lg text-xs font-medium animate-pulse">
                    ⚡ Peak Hour
                </div>
            )}

            {/* Bottom status bar */}
            <div className="absolute bottom-3 left-3 right-3 flex justify-between">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${currentData.solar_generation > 0.1 ? "bg-yellow-500/20 text-yellow-300" : "bg-gray-800/50 text-gray-500"}`}>
                    ☀️ {currentData.solar_generation.toFixed(1)} kW
                </div>
                {gridNodes.length > 0 && (
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${currentData.grid_usage > 0.1 ? "bg-violet-500/20 text-violet-300" : "bg-gray-800/50 text-gray-500"}`}>
                        ⚡ Grid {currentData.grid_usage.toFixed(1)} kW
                    </div>
                )}
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${currentData.battery_charge > 0.1 ? "bg-green-500/20 text-green-300" : currentData.battery_discharge > 0.1 ? "bg-amber-500/20 text-amber-300" : "bg-gray-800/50 text-gray-500"}`}>
                    🔋 {currentData.battery_soc.toFixed(0)}%
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${currentData.grid_usage > 0.1 ? "bg-red-500/20 text-red-300" : "bg-gray-800/50 text-gray-500"}`}>
                    ⚡ Grid {currentData.grid_usage.toFixed(1)} kW
                </div>
            </div>
        </div>
    );
}

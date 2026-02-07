"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Stars, Text } from "@react-three/drei";
import * as THREE from "three";
import DesignerModel3D from "./DesignerModel3D";
import type { PlacedNode, Wire } from "@/lib/microgridElements";

const SCALE = 0.02;

// ─── Wire component ────────────────────────────────────
function Wire3D({ from, to }: { from: { x: number; z: number }; to: { x: number; z: number } }) {
    const curve = useMemo(() => {
        const start = new THREE.Vector3(from.x, 0.3, from.z);
        const end = new THREE.Vector3(to.x, 0.3, to.z);
        const mid1 = start.clone().lerp(end, 0.33); mid1.y = 0.8;
        const mid2 = start.clone().lerp(end, 0.66); mid2.y = 0.8;
        return new THREE.CatmullRomCurve3([start, mid1, mid2, end]);
    }, [from, to]);

    const tubeGeom = useMemo(() => new THREE.TubeGeometry(curve, 32, 0.04, 8, false), [curve]);

    return (
        <group>
            <mesh geometry={tubeGeom}><meshStandardMaterial color="#4ade80" metalness={0.4} roughness={0.3} /></mesh>
            <mesh geometry={tubeGeom}><meshStandardMaterial color="#4ade80" transparent opacity={0.15} emissive="#4ade80" emissiveIntensity={0.6} /></mesh>
            <mesh position={[from.x, 0.3, from.z]}><sphereGeometry args={[0.08, 12, 12]} /><meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} /></mesh>
            <mesh position={[to.x, 0.3, to.z]}><sphereGeometry args={[0.08, 12, 12]} /><meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} /></mesh>
        </group>
    );
}

// ─── Flow particle ──────────────────────────────────────
function FlowParticle({ from, to }: { from: { x: number; z: number }; to: { x: number; z: number } }) {
    const ref = useRef<THREE.Mesh>(null);
    useFrame(({ clock }) => {
        if (!ref.current) return;
        const t = (clock.getElapsedTime() * 0.3) % 1;
        const x = from.x + (to.x - from.x) * t;
        const z = from.z + (to.z - from.z) * t;
        const y = 0.3 + Math.sin(t * Math.PI) * 0.5;
        ref.current.position.set(x, y, z);
    });
    return (
        <mesh ref={ref}><sphereGeometry args={[0.06, 8, 8]} /><meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1} /></mesh>
    );
}

// ─── Ground ─────────────────────────────────────────────
function Ground() {
    return (
        <>
            <Grid
                position={[0, 0, 0]}
                args={[100, 100]}
                cellSize={1}
                cellThickness={0.5}
                cellColor="#1e293b"
                sectionSize={5}
                sectionThickness={1}
                sectionColor="#334155"
                fadeDistance={50}
                fadeStrength={1}
                infiniteGrid
            />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                <planeGeometry args={[200, 200]} />
                <meshStandardMaterial color="#0f172a" />
            </mesh>
        </>
    );
}

// ─── Main 3D Scene ──────────────────────────────────────
interface DesignerScene3DProps {
    nodes: PlacedNode[];
    wires: Wire[];
    selected: string | null;
    onSelect: (id: string | null) => void;
}

export default function DesignerScene3D({ nodes, wires, selected, onSelect }: DesignerScene3DProps) {
    const center = useMemo(() => {
        if (nodes.length === 0) return [0, 0, 0] as [number, number, number];
        let cx = 0, cz = 0;
        nodes.forEach((n) => { cx += (n.x + n.width / 2) * SCALE; cz += (n.y + n.height / 2) * SCALE; });
        return [cx / nodes.length, 0, cz / nodes.length] as [number, number, number];
    }, [nodes]);

    const portPos3D = (nodeId: string, portId: string) => {
        const node = nodes.find((n) => n.id === nodeId);
        const port = node?.ports.find((p) => p.id === portId);
        if (!node || !port) return { x: 0, z: 0 };
        return { x: (node.x + port.x) * SCALE, z: (node.y + port.y) * SCALE };
    };

    return (
        <div className="w-full h-full">
            <Canvas shadows camera={{ position: [center[0] + 12, 10, center[2] + 12], fov: 50 }} style={{ background: "#0a0e1a" }}>
                <ambientLight intensity={0.4} />
                <directionalLight position={[15, 20, 10]} intensity={1.2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
                <pointLight position={[-10, 8, -10]} intensity={0.4} color="#60a5fa" />
                <Stars radius={100} depth={50} count={3000} factor={3} saturation={0} fade speed={1} />
                <fog attach="fog" args={["#0a0e1a", 30, 80]} />
                <Ground />
                {nodes.map((node) => {
                    const px = (node.x + node.width / 2) * SCALE;
                    const pz = (node.y + node.height / 2) * SCALE;
                    return (
                        <group key={node.id} position={[px, 0, pz]} onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}>
                            <DesignerModel3D type={node.type} color={node.color} label={node.label} isSelected={selected === node.id} props={node.props} />
                        </group>
                    );
                })}
                {wires.map((w) => {
                    const from = portPos3D(w.fromNode, w.fromPort);
                    const to = portPos3D(w.toNode, w.toPort);
                    return (
                        <group key={w.id}>
                            <Wire3D from={from} to={to} />
                            <FlowParticle from={from} to={to} />
                        </group>
                    );
                })}
                <OrbitControls target={center} maxPolarAngle={Math.PI / 2.1} minDistance={3} maxDistance={60} enableDamping dampingFactor={0.05} />
            </Canvas>
            <div className="absolute bottom-4 left-4 text-xs text-gray-500 bg-[#0f1117]/80 px-3 py-2 rounded-lg backdrop-blur-sm">
                <p>Scroll to zoom &bull; Drag to rotate &bull; Right-click to pan</p>
            </div>
            {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center text-gray-500">
                        <p className="text-lg font-medium">No components to display</p>
                        <p className="text-sm mt-1">Switch to 2D view and add components first</p>
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

// ─── Label ──────────────────────────────────────────────
function Label({ text, color, y = 1.5 }: { text: string; color: string; y?: number }) {
    return (
        <Text position={[0, y, 0]} fontSize={0.2} color={color} anchorX="center" anchorY="bottom" outlineWidth={0.02} outlineColor="#000">
            {text}
        </Text>
    );
}

// ─── Solar Panel ────────────────────────────────────────
function SolarPanel3D({ color, label, isSelected }: { color: string; label: string; isSelected: boolean }) {
    const ref = useRef<THREE.Group>(null);
    useFrame((_, dt) => { if (ref.current && isSelected) ref.current.rotation.y += dt * 0.3; });
    return (
        <group ref={ref}>
            <mesh position={[0, 0.6, 0]} castShadow><boxGeometry args={[2, 0.08, 1.4]} /><meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} /></mesh>
            <mesh position={[0, 0.65, 0]} castShadow><boxGeometry args={[1.8, 0.02, 1.2]} /><meshStandardMaterial color="#1e3a5f" metalness={0.9} roughness={0.1} /></mesh>
            {[-0.45, 0, 0.45].map((x) => (<mesh key={`v${x}`} position={[x, 0.67, 0]}><boxGeometry args={[0.02, 0.01, 1.2]} /><meshStandardMaterial color="#334155" /></mesh>))}
            {[-0.3, 0, 0.3].map((z) => (<mesh key={`h${z}`} position={[0, 0.67, z]}><boxGeometry args={[1.8, 0.01, 0.02]} /><meshStandardMaterial color="#334155" /></mesh>))}
            <mesh position={[0, 0.3, 0]} castShadow><cylinderGeometry args={[0.06, 0.08, 0.6, 8]} /><meshStandardMaterial color="#64748b" metalness={0.6} /></mesh>
            <mesh position={[0, 0.02, 0]} receiveShadow><cylinderGeometry args={[0.3, 0.35, 0.04, 16]} /><meshStandardMaterial color="#475569" /></mesh>
            {isSelected && (<mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.2, 1.35, 32]} /><meshBasicMaterial color="#3b82f6" transparent opacity={0.6} side={THREE.DoubleSide} /></mesh>)}
            <Label text={label} color={color} y={1.1} />
        </group>
    );
}

// ─── Diesel Generator ───────────────────────────────────
function DieselGenerator3D({ color, label, isSelected }: { color: string; label: string; isSelected: boolean }) {
    const ref = useRef<THREE.Group>(null);
    useFrame((_, dt) => { if (ref.current && isSelected) ref.current.rotation.y += dt * 0.3; });
    return (
        <group ref={ref}>
            <mesh position={[0, 0.4, 0]} castShadow><boxGeometry args={[1.6, 0.8, 0.9]} /><meshStandardMaterial color="#4b5563" metalness={0.5} roughness={0.4} /></mesh>
            <mesh position={[0.5, 1, 0.15]} castShadow><cylinderGeometry args={[0.06, 0.06, 0.5, 8]} /><meshStandardMaterial color="#374151" metalness={0.7} /></mesh>
            {[-0.3, -0.15, 0, 0.15, 0.3].map((x) => (<mesh key={x} position={[x, 0.4, 0.46]}><boxGeometry args={[0.04, 0.5, 0.02]} /><meshStandardMaterial color="#6b7280" /></mesh>))}
            <mesh position={[-0.6, 0.65, 0.3]}><boxGeometry args={[0.3, 0.2, 0.05]} /><meshStandardMaterial color="#1e293b" emissive="#22c55e" emissiveIntensity={0.3} /></mesh>
            <mesh position={[0, 0.02, 0]} receiveShadow><boxGeometry args={[1.8, 0.04, 1.1]} /><meshStandardMaterial color="#374151" /></mesh>
            {isSelected && (<mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.2, 1.35, 32]} /><meshBasicMaterial color="#3b82f6" transparent opacity={0.6} side={THREE.DoubleSide} /></mesh>)}
            <Label text={label} color={color} y={1.5} />
        </group>
    );
}

// ─── Utility Grid (pylon) ───────────────────────────────
function UtilityGrid3D({ color, label, isSelected }: { color: string; label: string; isSelected: boolean }) {
    return (
        <group>
            <mesh position={[0, 1.5, 0]} castShadow><cylinderGeometry args={[0.06, 0.1, 3, 6]} /><meshStandardMaterial color="#78716c" metalness={0.5} /></mesh>
            <mesh position={[0, 2.7, 0]} castShadow><boxGeometry args={[1.6, 0.06, 0.06]} /><meshStandardMaterial color="#78716c" metalness={0.5} /></mesh>
            {[-0.6, 0, 0.6].map((x) => (<mesh key={x} position={[x, 2.9, 0]} castShadow><cylinderGeometry args={[0.04, 0.06, 0.2, 8]} /><meshStandardMaterial color="#94a3b8" /></mesh>))}
            {[-0.6, 0, 0.6].map((x) => (<mesh key={`w${x}`} position={[x, 3.0, 0]}><sphereGeometry args={[0.03, 8, 8]} /><meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} /></mesh>))}
            <mesh position={[0, 0.02, 0]} receiveShadow><boxGeometry args={[0.6, 0.04, 0.6]} /><meshStandardMaterial color="#57534e" /></mesh>
            {isSelected && (<mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.2, 1.35, 32]} /><meshBasicMaterial color="#3b82f6" transparent opacity={0.6} side={THREE.DoubleSide} /></mesh>)}
            <Label text={label} color={color} y={3.5} />
        </group>
    );
}

// ─── Battery Bank ───────────────────────────────────────
function Battery3D({ color, label, isSelected, props }: { color: string; label: string; isSelected: boolean; props: Record<string, number | string> }) {
    const soc = (props?.soc as number) ?? 80;
    const fillHeight = (soc / 100) * 0.7;
    return (
        <group>
            <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[1.4, 1, 0.8]} /><meshStandardMaterial color="#1e293b" metalness={0.3} roughness={0.6} transparent opacity={0.9} /></mesh>
            <mesh position={[0, 0.05 + fillHeight / 2, 0]}><boxGeometry args={[1.3, fillHeight, 0.7]} /><meshStandardMaterial color={soc > 50 ? "#22c55e" : soc > 20 ? "#eab308" : "#ef4444"} emissive={soc > 50 ? "#22c55e" : soc > 20 ? "#eab308" : "#ef4444"} emissiveIntensity={0.2} transparent opacity={0.7} /></mesh>
            <mesh position={[0.4, 1.05, 0]}><cylinderGeometry args={[0.08, 0.08, 0.1, 8]} /><meshStandardMaterial color="#ef4444" /></mesh>
            <mesh position={[-0.4, 1.05, 0]}><cylinderGeometry args={[0.08, 0.08, 0.1, 8]} /><meshStandardMaterial color="#3b82f6" /></mesh>
            <mesh position={[0, 0.02, 0]} receiveShadow><boxGeometry args={[1.6, 0.04, 1]} /><meshStandardMaterial color="#334155" /></mesh>
            {isSelected && (<mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.2, 1.35, 32]} /><meshBasicMaterial color="#3b82f6" transparent opacity={0.6} side={THREE.DoubleSide} /></mesh>)}
            <Label text={`${label} (${soc}%)`} color={color} y={1.5} />
        </group>
    );
}

// ─── Super Capacitor ────────────────────────────────────
function SuperCapacitor3D({ color, label, isSelected }: { color: string; label: string; isSelected: boolean }) {
    return (
        <group>
            <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.5, 0.5, 1, 16]} /><meshStandardMaterial color="#115e59" metalness={0.6} roughness={0.3} /></mesh>
            <mesh position={[0, 0.7, 0]}><torusGeometry args={[0.52, 0.03, 8, 32]} /><meshStandardMaterial color="#14b8a6" metalness={0.8} /></mesh>
            <mesh position={[0, 1.05, 0]}><cylinderGeometry args={[0.06, 0.06, 0.1, 8]} /><meshStandardMaterial color="#a7f3d0" metalness={0.7} /></mesh>
            {isSelected && (<mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.0, 1.15, 32]} /><meshBasicMaterial color="#3b82f6" transparent opacity={0.6} side={THREE.DoubleSide} /></mesh>)}
            <Label text={label} color={color} y={1.5} />
        </group>
    );
}

// ─── Inverter ───────────────────────────────────────────
function Inverter3D({ color, label, isSelected }: { color: string; label: string; isSelected: boolean }) {
    return (
        <group>
            <mesh position={[0, 0.4, 0]} castShadow><boxGeometry args={[1.2, 0.8, 0.4]} /><meshStandardMaterial color="#831843" metalness={0.4} roughness={0.5} /></mesh>
            <mesh position={[0, 0.5, 0.21]}><boxGeometry args={[0.5, 0.25, 0.01]} /><meshStandardMaterial color="#0f172a" emissive="#22d3ee" emissiveIntensity={0.4} /></mesh>
            <mesh position={[0.35, 0.6, 0.21]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1} /></mesh>
            {[-0.3, -0.15, 0, 0.15, 0.3].map((x) => (<mesh key={x} position={[x, 0.4, -0.22]}><boxGeometry args={[0.04, 0.6, 0.08]} /><meshStandardMaterial color="#9f1239" metalness={0.5} /></mesh>))}
            {isSelected && (<mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.0, 1.15, 32]} /><meshBasicMaterial color="#3b82f6" transparent opacity={0.6} side={THREE.DoubleSide} /></mesh>)}
            <Label text={label} color={color} y={1.1} />
        </group>
    );
}

// ─── Charge Controller ──────────────────────────────────
function ChargeController3D({ color, label, isSelected }: { color: string; label: string; isSelected: boolean }) {
    return (
        <group>
            <mesh position={[0, 0.3, 0]} castShadow><boxGeometry args={[0.8, 0.6, 0.3]} /><meshStandardMaterial color="#9d174d" metalness={0.4} roughness={0.5} /></mesh>
            <mesh position={[0, 0.4, 0.16]}><boxGeometry args={[0.35, 0.2, 0.01]} /><meshStandardMaterial color="#0f172a" emissive="#a855f7" emissiveIntensity={0.3} /></mesh>
            {isSelected && (<mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.8, 0.95, 32]} /><meshBasicMaterial color="#3b82f6" transparent opacity={0.6} side={THREE.DoubleSide} /></mesh>)}
            <Label text={label} color={color} y={0.9} />
        </group>
    );
}

// ─── Residential Load (House) ───────────────────────────
function ResidentialLoad3D({ color, label, isSelected }: { color: string; label: string; isSelected: boolean }) {
    return (
        <group>
            <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[1.2, 1, 1]} /><meshStandardMaterial color="#fef2f2" roughness={0.8} /></mesh>
            <mesh position={[0, 1.3, 0]} castShadow rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[1, 0.6, 4]} /><meshStandardMaterial color="#dc2626" roughness={0.6} /></mesh>
            <mesh position={[0, 0.3, 0.51]}><boxGeometry args={[0.3, 0.6, 0.02]} /><meshStandardMaterial color="#92400e" /></mesh>
            {[-0.3, 0.3].map((x) => (<mesh key={x} position={[x, 0.65, 0.51]}><boxGeometry args={[0.2, 0.2, 0.02]} /><meshStandardMaterial color="#bfdbfe" emissive="#fbbf24" emissiveIntensity={0.2} /></mesh>))}
            {isSelected && (<mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.2, 1.35, 32]} /><meshBasicMaterial color="#3b82f6" transparent opacity={0.6} side={THREE.DoubleSide} /></mesh>)}
            <Label text={label} color={color} y={2} />
        </group>
    );
}

// ─── Commercial Load (Building) ─────────────────────────
function CommercialLoad3D({ color, label, isSelected }: { color: string; label: string; isSelected: boolean }) {
    return (
        <group>
            <mesh position={[0, 1, 0]} castShadow><boxGeometry args={[1.2, 2, 1]} /><meshStandardMaterial color="#78716c" roughness={0.5} metalness={0.3} /></mesh>
            {[0.4, 0.8, 1.2, 1.6].map((y) => [-0.3, 0.3].map((x) => (<mesh key={`${x}${y}`} position={[x, y, 0.51]}><boxGeometry args={[0.2, 0.15, 0.02]} /><meshStandardMaterial color="#bfdbfe" emissive="#60a5fa" emissiveIntensity={0.15} /></mesh>)))}
            <mesh position={[0, 0.3, 0.51]}><boxGeometry args={[0.4, 0.6, 0.02]} /><meshStandardMaterial color="#1e293b" /></mesh>
            {isSelected && (<mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.2, 1.35, 32]} /><meshBasicMaterial color="#3b82f6" transparent opacity={0.6} side={THREE.DoubleSide} /></mesh>)}
            <Label text={label} color={color} y={2.4} />
        </group>
    );
}

// ─── EV Charger ─────────────────────────────────────────
function EVCharger3D({ color, label, isSelected }: { color: string; label: string; isSelected: boolean }) {
    return (
        <group>
            <mesh position={[0, 0.7, 0]} castShadow><boxGeometry args={[0.4, 1.4, 0.3]} /><meshStandardMaterial color="#164e63" metalness={0.4} roughness={0.4} /></mesh>
            <mesh position={[0, 1, 0.16]}><boxGeometry args={[0.25, 0.2, 0.01]} /><meshStandardMaterial color="#0f172a" emissive="#22d3ee" emissiveIntensity={0.5} /></mesh>
            <mesh position={[0.25, 0.4, 0.1]} rotation={[0, 0, -0.3]}><cylinderGeometry args={[0.03, 0.03, 0.8, 8]} /><meshStandardMaterial color="#1e293b" /></mesh>
            <mesh position={[0.6, 0.1, 0.1]}><boxGeometry args={[0.12, 0.15, 0.1]} /><meshStandardMaterial color="#06b6d4" /></mesh>
            <mesh position={[0, 1.3, 0.16]}><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1} /></mesh>
            {isSelected && (<mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.8, 0.95, 32]} /><meshBasicMaterial color="#3b82f6" transparent opacity={0.6} side={THREE.DoubleSide} /></mesh>)}
            <Label text={label} color={color} y={1.7} />
        </group>
    );
}

// ─── AC/DC Bus ──────────────────────────────────────────
function Bus3D({ color, label, isSelected }: { color: string; label: string; isSelected: boolean }) {
    return (
        <group>
            <mesh position={[0, 1, 0]} castShadow><boxGeometry args={[0.15, 2, 0.15]} /><meshStandardMaterial color="#7c3aed" metalness={0.7} roughness={0.2} /></mesh>
            {[0.3, 1.0, 1.7].map((y) => (
                <group key={y}>
                    <mesh position={[-0.2, y, 0]}><boxGeometry args={[0.3, 0.08, 0.08]} /><meshStandardMaterial color="#a78bfa" metalness={0.6} /></mesh>
                    <mesh position={[0.2, y, 0]}><boxGeometry args={[0.3, 0.08, 0.08]} /><meshStandardMaterial color="#a78bfa" metalness={0.6} /></mesh>
                </group>
            ))}
            <mesh position={[0, 1, 0]}><boxGeometry args={[0.2, 2.1, 0.2]} /><meshStandardMaterial color="#7c3aed" transparent opacity={0.15} emissive="#7c3aed" emissiveIntensity={0.5} /></mesh>
            {isSelected && (<mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.8, 0.95, 32]} /><meshBasicMaterial color="#3b82f6" transparent opacity={0.6} side={THREE.DoubleSide} /></mesh>)}
            <Label text={label} color={color} y={2.3} />
        </group>
    );
}

// ─── Transformer ────────────────────────────────────────
function Transformer3D({ color, label, isSelected }: { color: string; label: string; isSelected: boolean }) {
    return (
        <group>
            <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[1.2, 1, 0.8]} /><meshStandardMaterial color="#475569" metalness={0.5} roughness={0.4} /></mesh>
            <mesh position={[-0.3, 1.1, 0]} castShadow><cylinderGeometry args={[0.15, 0.15, 0.3, 12]} /><meshStandardMaterial color="#94a3b8" metalness={0.6} /></mesh>
            <mesh position={[0.3, 1.1, 0]} castShadow><cylinderGeometry args={[0.15, 0.15, 0.3, 12]} /><meshStandardMaterial color="#94a3b8" metalness={0.6} /></mesh>
            {[-0.4, -0.2, 0, 0.2, 0.4].map((x) => (<mesh key={x} position={[x, 0.5, 0.42]}><boxGeometry args={[0.04, 0.7, 0.06]} /><meshStandardMaterial color="#64748b" /></mesh>))}
            {isSelected && (<mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.0, 1.15, 32]} /><meshBasicMaterial color="#3b82f6" transparent opacity={0.6} side={THREE.DoubleSide} /></mesh>)}
            <Label text={label} color={color} y={1.6} />
        </group>
    );
}

// ─── Router ─────────────────────────────────────────────
interface MicrogridModel3DProps {
    type: string;
    color: string;
    label: string;
    isSelected: boolean;
    props: Record<string, number | string>;
}

export default function MicrogridModel3D({ type, color, label, isSelected, props }: MicrogridModel3DProps) {
    switch (type) {
        case "solar_panel": return <SolarPanel3D color={color} label={label} isSelected={isSelected} />;
        case "diesel_generator": return <DieselGenerator3D color={color} label={label} isSelected={isSelected} />;
        case "grid_connection": return <UtilityGrid3D color={color} label={label} isSelected={isSelected} />;
        case "battery": return <Battery3D color={color} label={label} isSelected={isSelected} props={props} />;
        case "supercapacitor": return <SuperCapacitor3D color={color} label={label} isSelected={isSelected} />;
        case "inverter": return <Inverter3D color={color} label={label} isSelected={isSelected} />;
        case "charge_controller": return <ChargeController3D color={color} label={label} isSelected={isSelected} />;
        case "residential_load": return <ResidentialLoad3D color={color} label={label} isSelected={isSelected} />;
        case "commercial_load": return <CommercialLoad3D color={color} label={label} isSelected={isSelected} />;
        case "ev_charger": return <EVCharger3D color={color} label={label} isSelected={isSelected} />;
        case "bus": return <Bus3D color={color} label={label} isSelected={isSelected} />;
        case "transformer": return <Transformer3D color={color} label={label} isSelected={isSelected} />;
        default:
            return (<mesh position={[0, 0.5, 0]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color={color} /></mesh>);
    }
}

"use client";

// SVG icon renderers for each microgrid element type
interface ElementIconProps {
    icon: string;
    size?: number;
    color?: string;
}

export default function ElementIcon({ icon, size = 40, color = "#fff" }: ElementIconProps) {
    const s = size;
    switch (icon) {
        case "solar":
            return (
                <svg width={s} height={s} viewBox="0 0 40 40">
                    <rect x="4" y="10" width="32" height="20" rx="2" fill={color} opacity={0.85} />
                    <line x1="4" y1="17" x2="36" y2="17" stroke="#fff" strokeWidth="1" opacity={0.5} />
                    <line x1="4" y1="24" x2="36" y2="24" stroke="#fff" strokeWidth="1" opacity={0.5} />
                    <line x1="14" y1="10" x2="14" y2="30" stroke="#fff" strokeWidth="1" opacity={0.5} />
                    <line x1="26" y1="10" x2="26" y2="30" stroke="#fff" strokeWidth="1" opacity={0.5} />
                    <circle cx="20" cy="5" r="3" fill="#fbbf24" />
                    <line x1="20" y1="2" x2="20" y2="0" stroke="#fbbf24" strokeWidth="1.5" />
                    <line x1="23" y1="3" x2="25" y2="1" stroke="#fbbf24" strokeWidth="1.5" />
                    <line x1="17" y1="3" x2="15" y2="1" stroke="#fbbf24" strokeWidth="1.5" />
                </svg>
            );
        case "generator":
            return (
                <svg width={s} height={s} viewBox="0 0 40 40">
                    <rect x="6" y="10" width="28" height="20" rx="3" fill={color} opacity={0.85} />
                    <text x="20" y="24" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">G</text>
                    <rect x="10" y="30" width="6" height="4" fill={color} opacity={0.6} />
                    <rect x="24" y="30" width="6" height="4" fill={color} opacity={0.6} />
                </svg>
            );
        case "grid":
            return (
                <svg width={s} height={s} viewBox="0 0 40 40">
                    <line x1="12" y1="6" x2="12" y2="34" stroke={color} strokeWidth="3" />
                    <line x1="28" y1="6" x2="28" y2="34" stroke={color} strokeWidth="3" />
                    <line x1="8" y1="12" x2="32" y2="12" stroke={color} strokeWidth="2" />
                    <line x1="8" y1="20" x2="32" y2="20" stroke={color} strokeWidth="2" />
                    <line x1="8" y1="28" x2="32" y2="28" stroke={color} strokeWidth="2" />
                </svg>
            );
        case "battery":
            return (
                <svg width={s} height={s} viewBox="0 0 40 40">
                    <rect x="4" y="10" width="28" height="20" rx="3" fill={color} opacity={0.85} />
                    <rect x="32" y="16" width="4" height="8" rx="1" fill={color} />
                    <rect x="8" y="14" width="8" height="12" rx="1" fill="#fff" opacity={0.3} />
                    <rect x="18" y="14" width="8" height="12" rx="1" fill="#fff" opacity={0.2} />
                </svg>
            );
        case "capacitor":
            return (
                <svg width={s} height={s} viewBox="0 0 40 40">
                    <line x1="4" y1="20" x2="16" y2="20" stroke={color} strokeWidth="2" />
                    <line x1="16" y1="8" x2="16" y2="32" stroke={color} strokeWidth="3" />
                    <line x1="24" y1="8" x2="24" y2="32" stroke={color} strokeWidth="3" />
                    <line x1="24" y1="20" x2="36" y2="20" stroke={color} strokeWidth="2" />
                </svg>
            );
        case "inverter":
            return (
                <svg width={s} height={s} viewBox="0 0 40 40">
                    <rect x="6" y="8" width="28" height="24" rx="3" fill={color} opacity={0.85} />
                    <text x="14" y="24" fill="#fff" fontSize="9">~</text>
                    <text x="24" y="24" fill="#fff" fontSize="9">=</text>
                    <line x1="20" y1="12" x2="20" y2="28" stroke="#fff" strokeWidth="1" opacity={0.5} />
                </svg>
            );
        case "controller":
            return (
                <svg width={s} height={s} viewBox="0 0 40 40">
                    <rect x="6" y="8" width="28" height="24" rx="3" fill={color} opacity={0.85} />
                    <text x="20" y="24" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">CC</text>
                </svg>
            );
        case "house":
            return (
                <svg width={s} height={s} viewBox="0 0 40 40">
                    <polygon points="20,4 36,18 30,18 30,36 10,36 10,18 4,18" fill={color} opacity={0.85} />
                    <rect x="16" y="22" width="8" height="14" fill="#fff" opacity={0.3} />
                </svg>
            );
        case "building":
            return (
                <svg width={s} height={s} viewBox="0 0 40 40">
                    <rect x="8" y="6" width="24" height="32" rx="2" fill={color} opacity={0.85} />
                    <rect x="12" y="10" width="5" height="5" fill="#fff" opacity={0.3} />
                    <rect x="23" y="10" width="5" height="5" fill="#fff" opacity={0.3} />
                    <rect x="12" y="19" width="5" height="5" fill="#fff" opacity={0.3} />
                    <rect x="23" y="19" width="5" height="5" fill="#fff" opacity={0.3} />
                    <rect x="16" y="28" width="8" height="10" fill="#fff" opacity={0.3} />
                </svg>
            );
        case "ev":
            return (
                <svg width={s} height={s} viewBox="0 0 40 40">
                    <rect x="4" y="16" width="32" height="14" rx="4" fill={color} opacity={0.85} />
                    <circle cx="12" cy="32" r="3" fill={color} />
                    <circle cx="28" cy="32" r="3" fill={color} />
                    <path d="M10 16 L14 6 L26 6 L30 16" fill={color} opacity={0.6} />
                    <line x1="20" y1="8" x2="18" y2="12" stroke="#fbbf24" strokeWidth="2" />
                    <line x1="18" y1="12" x2="22" y2="12" stroke="#fbbf24" strokeWidth="2" />
                    <line x1="22" y1="12" x2="20" y2="16" stroke="#fbbf24" strokeWidth="2" />
                </svg>
            );
        case "bus":
            return (
                <svg width={s} height={s} viewBox="0 0 40 40">
                    <rect x="16" y="2" width="8" height="36" rx="2" fill={color} opacity={0.85} />
                    <line x1="10" y1="10" x2="30" y2="10" stroke={color} strokeWidth="2" />
                    <line x1="10" y1="20" x2="30" y2="20" stroke={color} strokeWidth="2" />
                    <line x1="10" y1="30" x2="30" y2="30" stroke={color} strokeWidth="2" />
                </svg>
            );
        case "transformer":
            return (
                <svg width={s} height={s} viewBox="0 0 40 40">
                    <circle cx="15" cy="20" r="10" fill="none" stroke={color} strokeWidth="2.5" />
                    <circle cx="25" cy="20" r="10" fill="none" stroke={color} strokeWidth="2.5" />
                    <text x="20" y="24" textAnchor="middle" fill={color} fontSize="8" fontWeight="bold">T</text>
                </svg>
            );
        default:
            return (
                <svg width={s} height={s} viewBox="0 0 40 40">
                    <rect x="6" y="6" width="28" height="28" rx="4" fill={color} opacity={0.85} />
                    <text x="20" y="24" textAnchor="middle" fill="#fff" fontSize="10">?</text>
                </svg>
            );
    }
}

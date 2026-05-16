import { useState, useRef, useCallback, useEffect, useMemo } from "react";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseData(data: string | null): { rotation?: number; scale?: number; fov?: number; range?: number; coneColor?: string; x1?: number; y1?: number; x2?: number; y2?: number; connColor?: string; utpColor?: string; utpCategory?: string } {
  if (!data) return {};
  try { return JSON.parse(data); } catch { return {}; }
}


// ─── Scale helpers ────────────────────────────────────────────────────────────
/** Parsea "1:100" -> 100, "1:50" -> 50, "100" -> 100 */
function parseScaleRatio(s: string | null | undefined): number | null {
  if (!s) return null;
  const clean = s.trim();
  const match = clean.match(/^1\s*:\s*(\d+(?:\.\d+)?)$/);
  if (match) return parseFloat(match[1]);
  const match2 = clean.match(/^(\d+(?:\.\d+)?)\s*:\s*1$/);
  if (match2) return 1 / parseFloat(match2[1]);
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

/**
 * Calcula la longitud real del cable en metros.
 * pxLen: longitud en pixeles del contenedor visible (sin zoom)
 * pdfDims: dimensiones del PDF en puntos a 72 DPI (devueltas por pdfjs)
 * containerPx: dimensiones del contenedor visible en pixeles
 * scaleStr: campo scale del plano, ej: "1:100"
 */
function calcUtpLengthMeters(
  pxLen: number,
  pdfDims: { w: number; h: number } | null,
  containerPx: { w: number; h: number } | null,
  scaleStr: string | null | undefined
): number | null {
  if (!pdfDims || !containerPx || pxLen <= 0) return null;
  const ratio = parseScaleRatio(scaleStr);
  if (!ratio) return null;
  // pixeles por punto PDF (el contenedor muestra el PDF a cierto zoom)
  const pxPerPdfPt = containerPx.w / pdfDims.w;
  // 1 punto PDF = 1/72 pulgada = 0.0254/72 metros
  const metersPerPdfPt = 0.0254 / 72;
  return (pxLen / pxPerPdfPt) * metersPerPdfPt * ratio;
}

/** Formatea metros a texto legible */
function formatMeters(m: number): string {
  if (m >= 100) return `${Math.round(m)} m`;
  if (m >= 10) return `${m.toFixed(1)} m`;
  return `${m.toFixed(2)} m`;
}

// ─── UTP Cable SVG ──────────────────────────────────────────────────────────
const UTP_MAX_METERS = 90;

function UtpCableSvg({ x1, y1, x2, y2, color, selected, category, lengthLabel, overLimit }: {
  x1: number; y1: number; x2: number; y2: number;
  color: string; selected: boolean; category?: string; lengthLabel?: string; overLimit?: boolean;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 2) return null;
  const sw = selected ? 4 : 3;
  // Normal perpendicular offset for labels
  const nx = -dy / len * 2;
  const ny = dx / len * 2;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const catLabel = category ?? "";
  // Combined label: "Cat6 · 12.50 m" or just "Cat6" or just "12.50 m"
  const topLabel = [catLabel, lengthLabel].filter(Boolean).join(" · ");
  // Alert color overrides cable color when over limit
  const alertColor = "#ef4444";
  const lineColor = overLimit ? alertColor : color;
  return (
    <g>
      {/* Over-limit pulsing glow */}
      {overLimit && (
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={alertColor} strokeWidth={sw + 10} strokeOpacity={0.25} strokeLinecap="round"
          style={{ animation: "utp-alert-pulse 1.2s ease-in-out infinite" }} />
      )}
      {/* Outer glow when selected */}
      {selected && <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={lineColor} strokeWidth={sw + 8} strokeOpacity={0.2} strokeLinecap="round" />}
      {/* Main cable line */}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={lineColor} strokeWidth={sw} strokeLinecap="round" opacity={0.95} />
      {/* Twisted pair stripes */}
      {Array.from({ length: Math.floor(len / 14) }, (_, i) => {
        const t = (i + 0.5) / Math.floor(len / 14);
        const cx = x1 + dx * t;
        const cy = y1 + dy * t;
        return <circle key={i} cx={cx} cy={cy} r={1.5} fill={overLimit ? alertColor : "white"} opacity={overLimit ? 0.7 : 0.4} />;
      })}
      {/* Endpoint connectors */}
      <rect x={x1 - 4} y={y1 - 4} width={8} height={8} rx={1.5} fill={lineColor} stroke={overLimit ? alertColor : "white"} strokeWidth={overLimit ? 1.5 : 1} opacity={0.9} />
      <rect x={x2 - 4} y={y2 - 4} width={8} height={8} rx={1.5} fill={lineColor} stroke={overLimit ? alertColor : "white"} strokeWidth={overLimit ? 1.5 : 1} opacity={0.9} />
      {/* Combined label: category + length */}
      {topLabel && (
        <text x={mx + nx} y={my + ny - 6} textAnchor="middle" fill={overLimit ? alertColor : color} fontSize="10" fontWeight="700"
          style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.9))", pointerEvents: "none" }}>{topLabel}</text>
      )}
      {/* Warning icon when over limit */}
      {overLimit && (
        <g transform={`translate(${mx + nx + (topLabel ? topLabel.length * 3.2 + 4 : 0)}, ${my + ny - 14})`} style={{ pointerEvents: "none" }}>
          <circle cx={0} cy={0} r={7} fill={alertColor} opacity={0.9} />
          <text x={0} y={4} textAnchor="middle" fill="white" fontSize="9" fontWeight="900">!</text>
        </g>
      )}
    </g>
  );
}

// ─── Connection line SVG ────────────────────────────────────────────────────
function ConnectionSvg({ x1, y1, x2, y2, color, selected }: { x1: number; y1: number; x2: number; y2: number; color: string; selected: boolean }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 2) return null;
  // Arrow head
  const arrowLen = 12;
  const arrowAngle = 0.4;
  const ux = dx / len;
  const uy = dy / len;
  const ax1 = x2 - arrowLen * (ux * Math.cos(arrowAngle) - uy * Math.sin(arrowAngle));
  const ay1 = y2 - arrowLen * (uy * Math.cos(arrowAngle) + ux * Math.sin(arrowAngle));
  const ax2 = x2 - arrowLen * (ux * Math.cos(-arrowAngle) - uy * Math.sin(-arrowAngle));
  const ay2 = y2 - arrowLen * (uy * Math.cos(-arrowAngle) + ux * Math.sin(-arrowAngle));
  const sw = selected ? 2.5 : 1.8;
  return (
    <g>
      {/* Dashed line */}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={sw} strokeDasharray={selected ? "none" : "6 3"} strokeLinecap="round" opacity={0.9} />
      {/* Arrow head */}
      <line x1={ax1} y1={ay1} x2={x2} y2={y2} stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <line x1={ax2} y1={ay2} x2={x2} y2={y2} stroke={color} strokeWidth={sw} strokeLinecap="round" />
      {/* Endpoint circles */}
      <circle cx={x1} cy={y1} r={selected ? 5 : 3.5} fill={color} opacity={0.8} />
      <circle cx={x2} cy={y2} r={selected ? 5 : 3.5} fill={color} opacity={0.8} />
      {selected && (
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={8} strokeOpacity={0.12} strokeLinecap="round" />
      )}
    </g>
  );
}

// Draw a ladder SVG between two absolute pixel points
function LadderSvg({ x1, y1, x2, y2, color, selected }: { x1: number; y1: number; x2: number; y2: number; color: string; selected: boolean }) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 2) return null;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const railGap = 12; // px between rails
  const rungCount = Math.max(2, Math.floor(len / 18));
  const rungSpacing = len / (rungCount + 1);
  const rungs: { x: number; y: number }[] = [];
  for (let i = 1; i <= rungCount; i++) {
    const t = (rungSpacing * i) / len;
    rungs.push({ x: x1 + dx * t, y: y1 + dy * t });
  }
  // Perpendicular unit vector
  const px = -dy / len;
  const py = dx / len;
  const r1x = x1 + px * railGap / 2;
  const r1y = y1 + py * railGap / 2;
  const r2x = x1 - px * railGap / 2;
  const r2y = y1 - py * railGap / 2;
  const e1x = x2 + px * railGap / 2;
  const e1y = y2 + py * railGap / 2;
  const e2x = x2 - px * railGap / 2;
  const e2y = y2 - py * railGap / 2;
  return (
    <g>
      {/* Rail 1 */}
      <line x1={r1x} y1={r1y} x2={e1x} y2={e1y} stroke={color} strokeWidth={selected ? 3 : 2.5} strokeLinecap="round" />
      {/* Rail 2 */}
      <line x1={r2x} y1={r2y} x2={e2x} y2={e2y} stroke={color} strokeWidth={selected ? 3 : 2.5} strokeLinecap="round" />
      {/* Rungs */}
      {rungs.map((rung, i) => (
        <line
          key={i}
          x1={rung.x + px * railGap / 2}
          y1={rung.y + py * railGap / 2}
          x2={rung.x - px * railGap / 2}
          y2={rung.y - py * railGap / 2}
          stroke={color}
          strokeWidth={selected ? 2.5 : 2}
          strokeLinecap="round"
          strokeOpacity="0.9"
        />
      ))}
      {/* Start/end dots */}
      <circle cx={x1} cy={y1} r={4} fill={color} fillOpacity="0.6" />
      <circle cx={x2} cy={y2} r={4} fill={color} fillOpacity="0.6" />
      {selected && <circle cx={x1} cy={y1} r={6} fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.5" />}
      {selected && <circle cx={x2} cy={y2} r={6} fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.5" />}
    </g>
  );
}
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────
type Annotation = {
  id: number;
  planId: number;
  layerId: number | null;
  type: string | null;
  x: string;
  y: string;
  label: string | null;
  color: string | null;
  icon: string | null;
  data: string | null;
  createdAt: Date;
};

type Layer = {
  id: number;
  name: string;
  label: string;
  color: string | null;
  icon: string | null;
};

// ─── Built-in marker types ────────────────────────────────────────────────────
const BUILTIN_MARKERS = [
  { type: "camera",     icon: "📷", label: "Cámara",       color: "#3b82f6" },
  { type: "reader",     icon: "🔖", label: "Lector",       color: "#f59e0b" },
  { type: "controller", icon: "⚙️", label: "Controladora", color: "#8b5cf6" },
  { type: "door",       icon: "🚪", label: "Puerta",       color: "#10b981" },
  { type: "sensor",     icon: "🔍", label: "Sensor",       color: "#06b6d4" },
  { type: "speaker",    icon: "🔊", label: "Bocina",       color: "#f97316" },
  { type: "ladder",     icon: "🪜", label: "Escalerilla",  color: "#22c55e" },
  { type: "idf",        icon: "🗄️", label: "IDF/MDF",      color: "#0ea5e9" },
  { type: "connection", icon: "🔗", label: "Conexión",     color: "#a78bfa" },
  { type: "utp",        icon: "🟦", label: "Cable UTP",    color: "#3b82f6" },
  { type: "marker",     icon: "📍", label: "Marcador",     color: "#ef4444" },
];

// ─── SVG marker shapes ────────────────────────────────────────────────────────
function MarkerShape({ type, color, size = 36, rotation = 0, fov = 60, range = 1, coneColor }: { type: string; color: string; size?: number; rotation?: number; fov?: number; range?: number; coneColor?: string }) {
  const s = size;
  const h = s * 1.5;
  const rotStyle: React.CSSProperties = rotation !== 0
    ? { transform: `rotate(${rotation}deg)`, transformOrigin: `${s / 2}px ${h / 2}px` }
    : {};
  switch (type) {
    case "camera": {
      // Build cone path using fov angle
      const cx = s / 2;
      const cy = s * 0.55;
      const coneLen = s * 0.9 * range; // length of cone from camera center (range multiplier)
      const halfAngle = (fov / 2) * (Math.PI / 180);
      const lx = cx + coneLen * Math.sin(-halfAngle);
      const ly = cy - coneLen * Math.cos(halfAngle);
      const rx = cx + coneLen * Math.sin(halfAngle);
      const ry = cy - coneLen * Math.cos(halfAngle);
      // Arc: sweep from left to right
      const largeArc = fov > 180 ? 1 : 0;
      const conePath = `M${cx} ${cy} L${lx} ${ly} A${coneLen} ${coneLen} 0 ${largeArc} 1 ${rx} ${ry} Z`;
      const effectiveConeColor = coneColor && coneColor !== "" ? coneColor : color;
      return (
        <svg width={s} height={h} viewBox={`0 0 ${s} ${h}`} style={{ overflow: "visible", display: "block", ...rotStyle }}>
          <path d={conePath} fill={effectiveConeColor} fillOpacity="0.22" stroke={effectiveConeColor} strokeWidth="1.2" strokeOpacity="0.7" />
          <circle cx={cx} cy={cy} r={s*0.28} fill={color} stroke="white" strokeWidth="2" />
          <circle cx={cx} cy={cy} r={s*0.13} fill="white" fillOpacity="0.5" />
        </svg>
      );
    }
    case "reader":
      return (
        <svg width={s} height={h} viewBox={`0 0 ${s} ${h}`} style={{ overflow: "visible", display: "block", ...rotStyle }}>
          <rect x={s*0.2} y={s*0.08} width={s*0.6} height={s*0.8} rx="3" fill={color} stroke="white" strokeWidth="1.5" />
          <rect x={s*0.3} y={s*0.22} width={s*0.4} height={s*0.07} rx="1" fill="white" fillOpacity="0.8" />
          <rect x={s*0.3} y={s*0.36} width={s*0.4} height={s*0.07} rx="1" fill="white" fillOpacity="0.8" />
          <rect x={s*0.3} y={s*0.5} width={s*0.25} height={s*0.07} rx="1" fill="white" fillOpacity="0.8" />
          <circle cx={s/2} cy={s*1.05} r={s*0.1} fill={color} stroke="white" strokeWidth="1.2" />
        </svg>
      );
    case "controller":
      return (
        <svg width={s} height={h} viewBox={`0 0 ${s} ${h}`} style={{ overflow: "visible", display: "block", ...rotStyle }}>
          <rect x={s*0.1} y={s*0.08} width={s*0.8} height={s*0.7} rx="4" fill={color} stroke="white" strokeWidth="1.5" />
          <circle cx={s*0.3} cy={s*0.32} r={s*0.1} fill="white" fillOpacity="0.5" />
          <circle cx={s*0.5} cy={s*0.32} r={s*0.1} fill="white" fillOpacity="0.5" />
          <circle cx={s*0.7} cy={s*0.32} r={s*0.1} fill="white" fillOpacity="0.5" />
          <rect x={s*0.25} y={s*0.55} width={s*0.5} height={s*0.1} rx="2" fill="white" fillOpacity="0.3" />
          <circle cx={s/2} cy={s*1.05} r={s*0.1} fill={color} stroke="white" strokeWidth="1.2" />
        </svg>
      );
    case "door":
      return (
        <svg width={s} height={h} viewBox={`0 0 ${s} ${h}`} style={{ overflow: "visible", display: "block", ...rotStyle }}>
          <rect x={s*0.15} y={s*0.08} width={s*0.7} height={s*0.8} rx="2" fill={color} stroke="white" strokeWidth="1.5" />
          <path d={`M${s*0.15} ${s*0.88} Q${s*0.15} ${s*0.08} ${s*0.85} ${s*0.08}`} fill="none" stroke={color} strokeWidth="1.2" strokeDasharray="3,2" strokeOpacity="0.5" />
          <circle cx={s*0.7} cy={s*0.48} r={s*0.07} fill="white" />
          <circle cx={s/2} cy={s*1.05} r={s*0.1} fill={color} stroke="white" strokeWidth="1.2" />
        </svg>
      );
    case "sensor":
      return (
        <svg width={s} height={h} viewBox={`0 0 ${s} ${h}`} style={{ overflow: "visible", display: "block", ...rotStyle }}>
          <path d={`M${s/2} ${s*0.5} m-${s*0.42} 0 a${s*0.42} ${s*0.42} 0 0 1 ${s*0.84} 0`} fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.35" />
          <path d={`M${s/2} ${s*0.5} m-${s*0.28} 0 a${s*0.28} ${s*0.28} 0 0 1 ${s*0.56} 0`} fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.6" />
          <circle cx={s/2} cy={s*0.5} r={s*0.16} fill={color} stroke="white" strokeWidth="2" />
          <circle cx={s/2} cy={s*0.5} r={s*0.07} fill="white" />
          <circle cx={s/2} cy={s*1.05} r={s*0.1} fill={color} stroke="white" strokeWidth="1.2" />
        </svg>
      );
    case "speaker":
      return (
        <svg width={s} height={h} viewBox={`0 0 ${s} ${h}`} style={{ overflow: "visible", display: "block", ...rotStyle }}>
          <polygon points={`${s*0.45},${s*0.2} ${s*0.7},${s*0.08} ${s*0.7},${s*0.72} ${s*0.45},${s*0.6}`} fill={color} stroke="white" strokeWidth="1.5" />
          <rect x={s*0.22} y={s*0.3} width={s*0.23} height={s*0.3} rx="1" fill={color} stroke="white" strokeWidth="1.5" />
          <path d={`M${s*0.72} ${s*0.2} Q${s*0.95} ${s*0.4} ${s*0.72} ${s*0.6}`} fill="none" stroke={color} strokeWidth="1.8" strokeOpacity="0.7" />
          <path d={`M${s*0.76} ${s*0.1} Q${s*1.05} ${s*0.4} ${s*0.76} ${s*0.7}`} fill="none" stroke={color} strokeWidth="1.3" strokeOpacity="0.4" />
          <circle cx={s/2} cy={s*1.05} r={s*0.1} fill={color} stroke="white" strokeWidth="1.2" />
        </svg>
      );
    case "ladder": {
      // Escalerilla: dos rieles verticales + peldaños horizontales
      const railW = s * 0.12;
      const leftX = s * 0.1;
      const rightX = s * 0.78;
      const topY = s * 0.04;
      const botY = s * 1.35;
      const rungs = 6;
      const step = (botY - topY) / (rungs + 1);
      return (
        <svg width={s} height={s * 1.5} viewBox={`0 0 ${s} ${s * 1.5}`} style={{ overflow: "visible", display: "block", ...rotStyle }}>
          {/* Left rail */}
          <rect x={leftX} y={topY} width={railW} height={botY - topY} rx="2" fill={color} />
          {/* Right rail */}
          <rect x={rightX} y={topY} width={railW} height={botY - topY} rx="2" fill={color} />
          {/* Rungs */}
          {Array.from({ length: rungs }).map((_, i) => {
            const y = topY + step * (i + 1);
            return (
              <rect
                key={i}
                x={leftX + railW}
                y={y - s * 0.055}
                width={rightX - leftX - railW}
                height={s * 0.11}
                rx="1"
                fill={color}
                fillOpacity="0.85"
              />
            );
          })}
          {/* Center dot anchor */}
          <circle cx={s / 2} cy={s * 0.75} r={s * 0.07} fill="white" fillOpacity="0.5" />
        </svg>
      );
    }
    case "idf": {
      // IDF/MDF: rack de telecomunicaciones con puertos y patch panels
      const rw = s * 0.8;
      const rh = s * 1.2;
      const rx0 = s * 0.1;
      const ry0 = s * 0.05;
      const numU = 6; // unidades de rack
      const uH = rh / (numU + 1);
      return (
        <svg width={s} height={s * 1.4} viewBox={`0 0 ${s} ${s * 1.4}`} style={{ overflow: "visible", display: "block", ...rotStyle }}>
          {/* Cuerpo del rack */}
          <rect x={rx0} y={ry0} width={rw} height={rh} rx="3" fill={color} stroke="white" strokeWidth="1.5" fillOpacity="0.9" />
          {/* Rieles laterales */}
          <rect x={rx0} y={ry0} width={rw * 0.08} height={rh} rx="1" fill="white" fillOpacity="0.25" />
          <rect x={rx0 + rw * 0.92} y={ry0} width={rw * 0.08} height={rh} rx="1" fill="white" fillOpacity="0.25" />
          {/* Unidades de rack (patch panels / equipos) */}
          {Array.from({ length: numU }).map((_, i) => {
            const uy = ry0 + uH * (i + 0.5);
            const isActive = i % 3 !== 2;
            return (
              <g key={i}>
                <rect x={rx0 + rw * 0.1} y={uy} width={rw * 0.8} height={uH * 0.7} rx="1"
                  fill={isActive ? "white" : "#1e3a5f"} fillOpacity={isActive ? 0.2 : 0.4}
                  stroke="white" strokeWidth="0.5" strokeOpacity="0.4" />
                {/* Puertos del patch panel */}
                {isActive && Array.from({ length: 6 }).map((_, j) => (
                  <circle key={j}
                    cx={rx0 + rw * 0.18 + j * (rw * 0.12)}
                    cy={uy + uH * 0.35}
                    r={rw * 0.04}
                    fill={j < 4 ? "#22c55e" : "#64748b"}
                    stroke="white" strokeWidth="0.5"
                  />
                ))}
              </g>
            );
          })}
          {/* Etiqueta IDF */}
          <text x={s / 2} y={ry0 + rh + s * 0.12} textAnchor="middle" fontSize={s * 0.18}
            fill="white" fontWeight="bold" fontFamily="monospace">IDF</text>
        </svg>
      );
    }
    default:
      return (
        <svg width={s} height={h} viewBox={`0 0 ${s} ${h}`} style={{ overflow: "visible", display: "block", ...rotStyle }}>
          <path d={`M${s/2} ${s*0.08} C${s*0.18} ${s*0.08} ${s*0.08} ${s*0.3} ${s*0.08} ${s*0.45} C${s*0.08} ${s*0.7} ${s/2} ${s*1.1} ${s/2} ${s*1.1} C${s/2} ${s*1.1} ${s*0.92} ${s*0.7} ${s*0.92} ${s*0.45} C${s*0.92} ${s*0.3} ${s*0.82} ${s*0.08} ${s/2} ${s*0.08} Z`} fill={color} stroke="white" strokeWidth="2" />
          <circle cx={s/2} cy={s*0.45} r={s*0.18} fill="white" fillOpacity="0.4" />
        </svg>
      );
  }
}

// ─── Draggable annotation marker ──────────────────────────────────────────────
function DraggableMarker({
  ann, selected, onSelect, onMove, onDelete, zoom,
}: {
  ann: Annotation;
  selected: boolean;
  onSelect: () => void;
  onMove: (x: string, y: string) => void;
  onDelete: () => void;
  zoom: number;
}) {
  const color = ann.color ?? "#6366f1";
  const { rotation = 0, scale: markerScale = 1, fov = 60, range = 1, coneColor = "" } = parseData(ann.data);
  const baseSize = Math.round(32 * markerScale);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    const parent = containerRef.current?.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: parseFloat(ann.x),
      origY: parseFloat(ann.y),
    };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = (ev.clientX - dragRef.current.startX) / zoom;
      const dy = (ev.clientY - dragRef.current.startY) / zoom;
      const newX = Math.max(0, Math.min(100, dragRef.current.origX + (dx / rect.width) * 100));
      const newY = Math.max(0, Math.min(100, dragRef.current.origY + (dy / rect.height) * 100));
      if (containerRef.current) {
        containerRef.current.style.left = `${newX}%`;
        containerRef.current.style.top = `${newY}%`;
      }
    };
    const onUp = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = (ev.clientX - dragRef.current.startX) / zoom;
      const dy = (ev.clientY - dragRef.current.startY) / zoom;
      const newX = Math.max(0, Math.min(100, dragRef.current.origX + (dx / rect.width) * 100));
      const newY = Math.max(0, Math.min(100, dragRef.current.origY + (dy / rect.height) * 100));
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      // Save final position
      ann.x = newX.toFixed(2);
      ann.y = newY.toFixed(2);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div
      ref={containerRef}
      className="absolute group"
      style={{
        left: `${ann.x}%`,
        top: `${ann.y}%`,
        transform: "translate(-50%, -50%)",
        zIndex: selected ? 100 : 20,
        cursor: "grab",
        userSelect: "none",
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        style={{
          transform: selected ? "scale(1.2)" : "scale(1)",
          transition: "transform 0.12s ease",
          filter: selected ? `drop-shadow(0 0 8px ${color})` : `drop-shadow(0 2px 4px rgba(0,0,0,0.5))`,
        }}
      >
        <MarkerShape type={ann.type ?? "marker"} color={color} size={baseSize} rotation={rotation} fov={fov} range={range} coneColor={coneColor} />
      </div>
      {/* Label */}
      {ann.label && (
        <div
          className="absolute left-1/2 whitespace-nowrap text-xs font-semibold px-1.5 py-0.5 rounded pointer-events-none"
          style={{
            top: "calc(100% + 2px)",
            transform: "translateX(-50%)",
            background: color + "ee",
            color: "white",
            fontSize: "10px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
          }}
        >
          {ann.label}
        </div>
      )}
      {/* Delete button */}
      {selected && (
        <button
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors z-50"
          onMouseDown={(e) => { e.stopPropagation(); onDelete(); }}
          title="Eliminar"
        >
          ×
        </button>
      )}
    </div>
  );
}

// ─── Tool button ──────────────────────────────────────────────────────────────
function ToolButton({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
        active ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-gray-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className="text-base leading-none">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

// ─── Label Dialog ─────────────────────────────────────────────────────────────
// ─── UTP Cable Dialog ────────────────────────────────────────────────────────
const UTP_COLORS = [
  { hex: "#3b82f6", label: "Azul" },
  { hex: "#f97316", label: "Naranja" },
  { hex: "#22c55e", label: "Verde" },
  { hex: "#92400e", label: "Café" },
  { hex: "#6b7280", label: "Gris" },
  { hex: "#ef4444", label: "Rojo" },
  { hex: "#eab308", label: "Amarillo" },
  { hex: "#f8fafc", label: "Blanco" },
  { hex: "#1e293b", label: "Negro" },
  { hex: "#8b5cf6", label: "Violeta" },
];
const UTP_CATEGORIES = ["Cat5e", "Cat6", "Cat6A", "Cat7", "Cat8"];

function UtpCableDialog({ open, color, category, estimatedLength, onColorChange, onCategoryChange, onConfirm, onCancel }: {
  open: boolean;
  color: string;
  category: string;
  estimatedLength?: string;
  onColorChange: (c: string) => void;
  onCategoryChange: (c: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [customColor, setCustomColor] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Cable UTP</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          {estimatedLength ? (() => {
            const meters = parseFloat(estimatedLength);
            const isOver = !isNaN(meters) && meters > UTP_MAX_METERS;
            return (
              <div>
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{
                    background: isOver ? "#450a0a" : "#1e293b",
                    border: `1px solid ${isOver ? "#ef4444" : "#334155"}`,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8h12M2 8l3-3M2 8l3 3" stroke={isOver ? "#ef4444" : color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-xs" style={{ color: isOver ? "#fca5a5" : "#9ca3af" }}>Longitud estimada:</span>
                  <span className="text-sm font-bold" style={{ color: isOver ? "#ef4444" : color }}>{estimatedLength}</span>
                  {isOver && (
                    <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#ef4444", color: "white" }}>LÍMITE</span>
                  )}
                </div>
                {isOver && (
                  <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: "#1c0a0a", border: "1px solid #7f1d1d" }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0">
                      <path d="M7 1L13 12H1L7 1Z" fill="#ef4444" opacity="0.9"/>
                      <text x="7" y="10" textAnchor="middle" fill="white" fontSize="7" fontWeight="900">!</text>
                    </svg>
                    <span className="text-[11px] leading-snug" style={{ color: "#fca5a5" }}>
                      Supera el límite estándar de <strong>90 m</strong> (IEEE 802.3). El rendimiento de la red puede verse afectado.
                    </span>
                  </div>
                )}
              </div>
            );
          })() : (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "#1e293b", border: "1px solid #334155" }}>
              <span className="text-xs text-gray-500">Configura la escala del plano para ver la longitud estimada</span>
            </div>
          )}
          <div>
            <Label className="mb-2 block">Color del cable</Label>
            <div className="flex flex-wrap gap-2">
              {UTP_COLORS.map((c) => (
                <button
                  key={c.hex}
                  title={c.label}
                  onClick={() => { onColorChange(c.hex); setCustomColor(false); }}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ background: c.hex, borderColor: color === c.hex ? "white" : "transparent" }}
                />
              ))}
              <button
                title="Color personalizado"
                onClick={() => setCustomColor(true)}
                className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-transform hover:scale-110"
                style={{ background: "#374151", borderColor: customColor ? "white" : "transparent", color: "white" }}
              >+</button>
            </div>
            {customColor && (
              <div className="mt-2 flex items-center gap-2">
                <Label>Color personalizado</Label>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => onColorChange(e.target.value)}
                  className="w-10 h-8 rounded cursor-pointer border-0"
                />
              </div>
            )}
          </div>
          <div>
            <Label className="mb-2 block">Categoría</Label>
            <Select value={category} onValueChange={onCategoryChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {UTP_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={onConfirm} style={{ background: color, color: "white" }}>Crear Cable</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AnnotationLabelDialog({ open, onConfirm, onCancel, defaultLabel }: {
  open: boolean; onConfirm: (label: string) => void; onCancel: () => void; defaultLabel: string;
}) {
  const [label, setLabel] = useState(defaultLabel);
  useEffect(() => { if (open) setLabel(defaultLabel); }, [open, defaultLabel]);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Etiqueta del marcador</DialogTitle></DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Nombre o descripción</Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ej: Cámara entrada principal"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && onConfirm(label)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={() => onConfirm(label)}>Colocar marcador</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── DXF Export ─────────────────────────────────────────────────────────────
/**
 * Genera un archivo DXF R2000 (AC1015) válido para AutoCAD/LibreCAD/DraftSight.
 * Formato: código de grupo (3 chars, right-padded) + CRLF + valor + CRLF
 * Unidades: metros (INSUNITS=6)
 */
function generateDXF(
  annotations: { id: number; type: string | null; label: string | null; color: string | null; data: string | null; x: string; y: string }[],
  pdfDims: { w: number; h: number } | null,
  containerPx: { w: number; h: number } | null,
  scaleStr: string | null | undefined
): string {
  // Helper: group code + CRLF + value + CRLF (DXF spec requires CRLF)
  const g = (code: number | string, value: string | number): string =>
    `${String(code).padStart(3)}\r\n${value}\r\n`;

  // Convert pixel distance to meters using scale
  const toM = (px: number): number => {
    const m = calcUtpLengthMeters(px, pdfDims, containerPx, scaleStr);
    return m != null ? parseFloat(m.toFixed(4)) : parseFloat((px * 0.001).toFixed(4));
  };

  // Convert hex color to AutoCAD Color Index (ACI)
  const hexToACI = (hex: string): number => {
    if (!hex || hex.length < 7) return 7;
    const r = parseInt(hex.slice(1, 3), 16);
    const g2 = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (r > 200 && g2 < 80 && b < 80) return 1;   // red
    if (r > 200 && g2 > 200 && b < 80) return 2;   // yellow
    if (r < 80 && g2 > 200 && b < 80) return 3;    // green
    if (r < 80 && g2 > 200 && b > 200) return 4;   // cyan
    if (r < 80 && g2 < 80 && b > 200) return 5;    // blue
    if (r > 200 && g2 < 80 && b > 200) return 6;   // magenta
    return 7;  // white/default
  };

  // Collect unique layers
  const layerSet = new Map<string, number>(); // name -> ACI color
  const addLayer = (name: string, aci: number) => {
    if (!layerSet.has(name)) layerSet.set(name, aci);
  };

  // Build entity strings
  const entityParts: string[] = [];

  for (const ann of annotations) {
    const layerName = (ann.type ?? "MARKER").toUpperCase().replace(/[^A-Z0-9_-]/g, "_");
    const aci = hexToACI(ann.color ?? "#ffffff");
    addLayer(layerName, aci);
    const d = parseData(ann.data);
    const labelText = (ann.label ?? "").replace(/[^\x20-\x7E]/g, ""); // ASCII only for DXF R2000

    if ((ann.type === "utp" || ann.type === "ladder" || ann.type === "connection") && d.x1 !== undefined) {
      const x1m = toM(d.x1!);
      const y1m = -toM(d.y1!); // DXF Y-axis is inverted vs screen
      const x2m = toM(d.x2!);
      const y2m = -toM(d.y2!);
      // LINE entity
      entityParts.push(
        g(0, "LINE") +
        g(8, layerName) +
        g(62, aci) +
        g(10, x1m.toFixed(4)) +
        g(20, y1m.toFixed(4)) +
        g(30, "0.0000") +
        g(11, x2m.toFixed(4)) +
        g(21, y2m.toFixed(4)) +
        g(31, "0.0000")
      );
      // TEXT label at midpoint
      if (labelText) {
        const labLayer = layerName + "_LBL";
        addLayer(labLayer, aci);
        const mx = ((x1m + x2m) / 2).toFixed(4);
        const my = ((y1m + y2m) / 2).toFixed(4);
        entityParts.push(
          g(0, "TEXT") +
          g(8, labLayer) +
          g(62, aci) +
          g(10, mx) +
          g(20, my) +
          g(30, "0.0000") +
          g(40, "0.15") +
          g(1, labelText)
        );
      }
    } else {
      // Point marker — use CIRCLE for visibility
      const xPct = parseFloat(ann.x) / 100;
      const yPct = parseFloat(ann.y) / 100;
      const cw = containerPx?.w ?? (pdfDims?.w ?? 800);
      const ch = containerPx?.h ?? (pdfDims?.h ?? 600);
      const xm = toM(xPct * cw);
      const ym = -toM(yPct * ch);
      entityParts.push(
        g(0, "CIRCLE") +
        g(8, layerName) +
        g(62, aci) +
        g(10, xm.toFixed(4)) +
        g(20, ym.toFixed(4)) +
        g(30, "0.0000") +
        g(40, "0.10")
      );
      if (labelText) {
        const labLayer = layerName + "_LBL";
        addLayer(labLayer, aci);
        entityParts.push(
          g(0, "TEXT") +
          g(8, labLayer) +
          g(62, aci) +
          g(10, xm.toFixed(4)) +
          g(20, (ym + 0.15).toFixed(4)) +
          g(30, "0.0000") +
          g(40, "0.12") +
          g(1, labelText)
        );
      }
    }
  }

  // ── Build complete DXF ──────────────────────────────────────────────────────
  let dxf = "";

  // HEADER section
  dxf += g(0, "SECTION") + g(2, "HEADER");
  dxf += g(9, "$ACADVER") + g(1, "AC1015"); // R2000
  dxf += g(9, "$INSUNITS") + g(70, "6");    // 6 = meters
  dxf += g(9, "$MEASUREMENT") + g(70, "1"); // 1 = metric
  dxf += g(9, "$EXTMIN") + g(10, "0.0") + g(20, "-1000.0") + g(30, "0.0");
  dxf += g(9, "$EXTMAX") + g(10, "1000.0") + g(20, "0.0") + g(30, "0.0");
  dxf += g(0, "ENDSEC");

  // TABLES section
  dxf += g(0, "SECTION") + g(2, "TABLES");
  // LTYPE table (required by R2000)
  dxf += g(0, "TABLE") + g(2, "LTYPE") + g(5, "5") + g(100, "AcDbSymbolTable") + g(70, "1");
  dxf += g(0, "LTYPE") + g(5, "14") + g(100, "AcDbSymbolTableRecord") + g(100, "AcDbLinetypeTableRecord");
  dxf += g(2, "CONTINUOUS") + g(70, "0") + g(3, "Solid line") + g(72, "65") + g(73, "0") + g(40, "0.0");
  dxf += g(0, "ENDTAB");
  // LAYER table
  dxf += g(0, "TABLE") + g(2, "LAYER") + g(5, "2") + g(100, "AcDbSymbolTable") + g(70, String(layerSet.size));
  let handleCounter = 100;
  for (const [lname, laci] of Array.from(layerSet.entries())) {
    dxf += g(0, "LAYER") + g(5, String(handleCounter++)) + g(100, "AcDbSymbolTableRecord") + g(100, "AcDbLayerTableRecord");
    dxf += g(2, lname) + g(70, "0") + g(62, laci) + g(6, "CONTINUOUS");
  }
  dxf += g(0, "ENDTAB");
  dxf += g(0, "ENDSEC");

  // ENTITIES section
  dxf += g(0, "SECTION") + g(2, "ENTITIES");
  dxf += entityParts.join("");
  dxf += g(0, "ENDSEC");

  // EOF
  dxf += g(0, "EOF");

  return dxf;
}

// ─── UTP Node Dialog ──────────────────────────────────────────────────────────
/**
 * Diálogo para configurar un nodo UTP completo:
 * - Altura del techo (m)
 * - Longitud horizontal (calculada del plano)
 * - Calcula longitud total = horizontal + 2 * altura_techo + margen_rack
 */
function UtpNodeDialog({
  open, color, category, horizontalMeters, onColorChange, onCategoryChange,
  onConfirm, onCancel,
}: {
  open: boolean; color: string; category: string; horizontalMeters: number | null;
  onColorChange: (c: string) => void; onCategoryChange: (c: string) => void;
  onConfirm: (ceilingHeight: number, rackMargin: number) => void; onCancel: () => void;
}) {
  const [ceilingHeight, setCeilingHeight] = useState(2.8);
  const [rackMargin, setRackMargin] = useState(1.5);
  const totalLength = horizontalMeters != null
    ? horizontalMeters + 2 * ceilingHeight + rackMargin
    : null;
  const isOver = totalLength != null && totalLength > UTP_MAX_METERS;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Nodo UTP Completo</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-xs text-gray-400">Calcula la longitud real del cable considerando el recorrido vertical por el techo.</p>
          {/* Horizontal distance */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "#1e293b", border: "1px solid #334155" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 8h12M2 8l3-3M2 8l3 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-xs text-gray-400">Distancia horizontal:</span>
            <span className="text-sm font-bold" style={{ color }}>
              {horizontalMeters != null ? formatMeters(horizontalMeters) : "Sin escala"}
            </span>
          </div>
          {/* Ceiling height */}
          <div>
            <Label className="mb-1 block text-xs">Altura del techo (m)</Label>
            <div className="flex items-center gap-2">
              <input type="range" min={1.5} max={12} step={0.1} value={ceilingHeight}
                onChange={(e) => setCeilingHeight(parseFloat(e.target.value))}
                className="flex-1" />
              <span className="text-sm font-mono font-bold w-12 text-right" style={{ color: "#94a3b8" }}>{ceilingHeight.toFixed(1)} m</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-0.5">Sube + baja = 2 × {ceilingHeight.toFixed(1)} = {(2*ceilingHeight).toFixed(1)} m</p>
          </div>
          {/* Rack margin */}
          <div>
            <Label className="mb-1 block text-xs">Margen en rack/patch panel (m)</Label>
            <div className="flex items-center gap-2">
              <input type="range" min={0.5} max={5} step={0.1} value={rackMargin}
                onChange={(e) => setRackMargin(parseFloat(e.target.value))}
                className="flex-1" />
              <span className="text-sm font-mono font-bold w-12 text-right" style={{ color: "#94a3b8" }}>{rackMargin.toFixed(1)} m</span>
            </div>
          </div>
          {/* Total */}
          <div className="px-3 py-2 rounded-lg" style={{
            background: isOver ? "#450a0a" : "#0f172a",
            border: `1px solid ${isOver ? "#ef4444" : "#1e3a5f"}`,
          }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold" style={{ color: isOver ? "#fca5a5" : "#94a3b8" }}>Longitud total estimada</span>
              {isOver && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#ef4444", color: "white" }}>LÍMITE</span>}
            </div>
            <p className="text-xl font-bold mt-1" style={{ color: isOver ? "#ef4444" : "#3b82f6" }}>
              {totalLength != null ? formatMeters(totalLength) : "—"}
            </p>
            {horizontalMeters != null && (
              <p className="text-[10px] text-gray-500 mt-0.5">
                {formatMeters(horizontalMeters)} horizontal + {formatMeters(2*ceilingHeight)} vertical + {formatMeters(rackMargin)} rack
              </p>
            )}
            {isOver && (
              <p className="text-[11px] mt-1" style={{ color: "#fca5a5" }}>⚠ Supera el límite IEEE 802.3 de 90 m</p>
            )}
          </div>
          {/* Color + Category */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="mb-1 block text-xs">Color</Label>
              <div className="flex flex-wrap gap-1">
                {UTP_COLORS.slice(0,6).map((c) => (
                  <button key={c.hex} title={c.label} onClick={() => onColorChange(c.hex)}
                    className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ background: c.hex, borderColor: color === c.hex ? "white" : "transparent" }}
                  />
                ))}
              </div>
            </div>
            <div className="flex-1">
              <Label className="mb-1 block text-xs">Categoría</Label>
              <Select value={category} onValueChange={onCategoryChange}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UTP_CATEGORIES.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={() => onConfirm(ceilingHeight, rackMargin)} style={{ background: color, color: "white" }}>
            Crear Nodo UTP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── PDF Canvas Renderer ──────────────────────────────────────────────────────
function PdfCanvas({ url, onReady }: { url: string; onReady: (w: number, h: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        // Use bundled worker via Vite import
        const workerUrl = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        const pdf = await pdfjsLib.getDocument(url).promise;
        if (cancelled) return;
        const page = await pdf.getPage(1);
        if (cancelled) return;
        const scale = 2; // high-res render
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, canvas: canvas, viewport }).promise;
        if (!cancelled) onReady(viewport.width / scale, viewport.height / scale);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Error al cargar PDF");
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-16 rounded-lg" style={{ background: "#22262e", border: "1px solid #2e3340", minWidth: 400, minHeight: 300 }}>
        <span className="text-4xl">⚠️</span>
        <p className="text-red-400 font-medium">Error al renderizar PDF</p>
        <p className="text-gray-400 text-sm text-center">{error}</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-sm text-white border hover:bg-white/10 transition-colors" style={{ borderColor: "#3a3f4b" }}>
          Abrir PDF directamente
        </a>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", borderRadius: "2px", maxWidth: "100%" }}
    />
  );
}

// ─── DXF Viewer Component ─────────────────────────────────────────────────────
/**
 * Renders a DXF file using WebGL via dxf-viewer library.
 * Displays the drawing with pan/zoom and reports canvas dimensions via onReady.
 */
function DxfViewerComponent({ url, onReady }: { url: string; onReady: (w: number, h: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const DEFAULT_W = 1200;
  const DEFAULT_H = 900;

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    const container = containerRef.current;

    (async () => {
      try {
        const { DxfViewer } = await import("dxf-viewer");
        if (cancelled) return;

        const viewer = new DxfViewer(container, {
          autoResize: false,
          canvasWidth: DEFAULT_W,
          canvasHeight: DEFAULT_H,
          clearColor: new (await import("three")).Color(0x1a1d23),
          clearAlpha: 1,
          pointSize: 2,
        });
        viewerRef.current = viewer;

        await viewer.Load({ url, fonts: null });
        if (cancelled) { viewer.Destroy?.(); return; }

        const canvas = viewer.GetCanvas();
        if (canvas) {
          canvas.style.borderRadius = "2px";
          canvas.style.display = "block";
          canvas.style.maxWidth = "100%";
        }

        setLoading(false);
        onReady(DEFAULT_W, DEFAULT_H);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Error al cargar DXF");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      try { viewerRef.current?.Destroy?.(); } catch (_) {}
      viewerRef.current = null;
    };
  }, [url]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-16 rounded-lg" style={{ background: "#22262e", border: "1px solid #2e3340", minWidth: 400, minHeight: 300 }}>
        <span className="text-4xl">⚠️</span>
        <p className="text-red-400 font-medium">Error al renderizar DXF</p>
        <p className="text-gray-400 text-sm text-center">{error}</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-sm text-white border hover:bg-white/10 transition-colors" style={{ borderColor: "#3a3f4b" }}>
          Descargar DXF
        </a>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: DEFAULT_W, height: DEFAULT_H, maxWidth: "100%", borderRadius: "2px", overflow: "hidden" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#1a1d23" }}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Cargando DXF…</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Annotations Accordion ─────────────────────────────────────────────────────
/**
 * Panel compacto de anotaciones con acordeón por tipo.
 * Cada grupo (Cámara, UTP, etc.) es una fila colapsable con contador.
 * Sin scroll externo — cada grupo expandido tiene su propio scroll de 3 ítems máx.
 */
function AnnotationsAccordion({
  annotations, pdfDims, contentRef, planScale,
  selectedAnnotation, onSelect, onDelete,
}: {
  annotations: Annotation[];
  pdfDims: { w: number; h: number } | null;
  contentRef: React.RefObject<HTMLDivElement | null>;
  planScale: string | null | undefined;
  selectedAnnotation: number | null;
  onSelect: (id: number | null) => void;
  onDelete: (id: number) => void;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  if (annotations.length === 0) return null;

  // Group by type
  const groups: Record<string, Annotation[]> = {};
  for (const ann of annotations) {
    const key = ann.type ?? "marker";
    if (!groups[key]) groups[key] = [];
    groups[key].push(ann);
  }

  const toggleGroup = (type: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  const totalCount = annotations.length;

  // Count UTP over-limit cables
  const utpOverCount = (groups["utp"] ?? []).filter((ann) => {
    const d = parseData(ann.data);
    if (d.x1 === undefined) return false;
    const pxLen = Math.sqrt((d.x2! - d.x1!) ** 2 + (d.y2! - d.y1!) ** 2);
    const containerEl = contentRef.current;
    const containerPx = containerEl ? { w: containerEl.offsetWidth, h: containerEl.offsetHeight } : null;
    const meters = calcUtpLengthMeters(pxLen, null, containerPx, planScale);
    return meters != null && meters > UTP_MAX_METERS;
  }).length;

  return (
    <div className="px-2 pt-2 pb-1 border-t" style={{ borderColor: "#2e3340" }}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-1.5 px-1">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Anotaciones</p>
        <div className="flex items-center gap-1">
          {utpOverCount > 0 && (
            <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ background: "#ef444422", color: "#ef4444" }}>⚠{utpOverCount}</span>
          )}
          <span className="text-[10px] font-mono" style={{ color: "#6b7280" }}>{totalCount}</span>
        </div>
      </div>
      {/* Accordion rows — one per type */}
      <div className="rounded-lg overflow-hidden" style={{ background: "#1a1d23", border: "1px solid #2e3340" }}>
        {Object.entries(groups).map(([type, items], gi) => {
          const marker = BUILTIN_MARKERS.find((m) => m.type === type);
          const chipColor = marker?.color ?? "#6b7280";
          const isExpanded = expandedGroups.has(type);
          const hasAlert = type === "utp" && utpOverCount > 0;
          const hasSelected = items.some((a) => a.id === selectedAnnotation);
          return (
            <div key={type} style={{ borderTop: gi > 0 ? "1px solid #2e3340" : undefined }}>
              {/* Group header — click to expand/collapse */}
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 transition-colors hover:bg-white/5 text-left"
                style={{ background: hasSelected ? chipColor + "18" : undefined }}
                onClick={() => toggleGroup(type)}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: chipColor }} />
                <span className="flex-1 text-[11px] font-medium truncate" style={{ color: hasAlert ? "#fca5a5" : "#cbd5e1" }}>
                  {marker?.label ?? type}
                </span>
                <span className="text-[10px] font-mono px-1 rounded" style={{ background: chipColor + "22", color: chipColor }}>
                  {items.length}
                </span>
                {hasAlert && <span className="text-[10px]" style={{ color: "#ef4444" }}>⚠</span>}
                <svg
                  width="10" height="10" viewBox="0 0 10 10" fill="none"
                  style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms", flexShrink: 0 }}
                >
                  <path d="M2 3.5L5 6.5L8 3.5" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {/* Expanded item list — max 3 rows visible, then scroll */}
              {isExpanded && (
                <div style={{ maxHeight: `${Math.min(items.length, 4) * 26}px`, overflowY: items.length > 4 ? "auto" : "hidden" }}>
                  {items.map((ann, idx) => {
                    const color = ann.color ?? "#6366f1";
                    const isSelected = selectedAnnotation === ann.id;
                    let overLimit = false;
                    if (ann.type === "utp") {
                      const d = parseData(ann.data);
                      if (d.x1 !== undefined) {
                        const pxLen = Math.sqrt((d.x2! - d.x1!) ** 2 + (d.y2! - d.y1!) ** 2);
                        const containerEl = contentRef.current;
                        const containerPx = containerEl ? { w: containerEl.offsetWidth, h: containerEl.offsetHeight } : null;
                        const meters = calcUtpLengthMeters(pxLen, null, containerPx, planScale);
                        overLimit = meters != null && meters > UTP_MAX_METERS;
                      }
                    }
                    return (
                      <div
                        key={ann.id}
                        className="flex items-center gap-1.5 px-3 py-1 cursor-pointer group transition-colors hover:bg-white/5"
                        style={{
                          background: isSelected ? (overLimit ? "#450a0a" : "#1e3a5f") : undefined,
                          borderTop: idx > 0 ? "1px solid #2e3340" : "1px solid #2e3340",
                          borderLeft: overLimit ? "2px solid #ef4444" : "2px solid transparent",
                        }}
                        onClick={() => onSelect(isSelected ? null : ann.id)}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: overLimit ? "#ef4444" : color }} />
                        <span className="flex-1 text-[10px] truncate" style={{ color: overLimit ? "#fca5a5" : "#94a3b8" }}>
                          {ann.label || ann.type || "Marcador"}
                        </span>
                        {overLimit && <span className="text-[9px] flex-shrink-0" style={{ color: "#ef4444" }}>!</span>}
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-0.5 rounded"
                          style={{ color: "#ef4444" }}
                          onClick={(e) => { e.stopPropagation(); onDelete(ann.id); }}
                          title="Eliminar"
                        >
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Viewer ──────────────────────────────────────────────────────────────
export default function FloorPlanViewer() {
  const params = useParams<{ id: string }>();
  const planId = parseInt(params.id ?? "0", 10);
  const [, navigate] = useLocation();

  const utils = trpc.useUtils();
  const { data: plan, isLoading: planLoading } = trpc.floorPlans.getById.useQuery({ id: planId });
  const { data: annotations = [] } = trpc.floorPlanAnnotations.listByPlan.useQuery({ planId });
  const { data: layers = [] } = trpc.floorPlanLayers.list.useQuery();

  const createAnnotation = trpc.floorPlanAnnotations.create.useMutation({
    onSuccess: () => utils.floorPlanAnnotations.listByPlan.invalidate({ planId }),
  });
  const updateAnnotation = trpc.floorPlanAnnotations.update.useMutation({
    onSuccess: () => utils.floorPlanAnnotations.listByPlan.invalidate({ planId }),
  });
  const deleteAnnotation = trpc.floorPlanAnnotations.delete.useMutation({
    onSuccess: () => utils.floorPlanAnnotations.listByPlan.invalidate({ planId }),
  });
  const updatePlan = trpc.floorPlans.update.useMutation({
    onSuccess: () => utils.floorPlans.getById.invalidate({ id: planId }),
  });

  // ── State ─────────────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOrigin, setPanOrigin] = useState({ x: 0, y: 0 });
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  const [ladderStart, setLadderStart] = useState<{ x: number; y: number } | null>(null);
  const [ladderPreview, setLadderPreview] = useState<{ x: number; y: number } | null>(null);
  const [connectionStart, setConnectionStart] = useState<{ x: number; y: number } | null>(null);
  const [connectionPreview, setConnectionPreview] = useState<{ x: number; y: number } | null>(null);
  const [utpStart, setUtpStart] = useState<{ x: number; y: number } | null>(null);
  const [utpPreview, setUtpPreview] = useState<{ x: number; y: number } | null>(null);
  const [utpDialogOpen, setUtpDialogOpen] = useState(false);
  const [utpPending, setUtpPending] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [utpColor, setUtpColor] = useState("#3b82f6");
  const [utpCategory, setUtpCategory] = useState("Cat6");
  const [utpNodeDialogOpen, setUtpNodeDialogOpen] = useState(false);
  const [utpNodePending, setUtpNodePending] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [editingScale, setEditingScale] = useState(false);
  const [scaleInput, setScaleInput] = useState("");
  const [pendingAnnotation, setPendingAnnotation] = useState<{
    x: string; y: string; icon: string; color: string; type: string; layerId: number | null;
  } | null>(null);
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState<number | null>(null);
  const [pdfDims, setPdfDims] = useState<{ w: number; h: number } | null>(null);
  const [localRotation, setLocalRotation] = useState(0);
  const [localScale, setLocalScale] = useState(1);
  const [localFov, setLocalFov] = useState(60);
  const [localRange, setLocalRange] = useState(1);
  const [localConeColor, setLocalConeColor] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  // ── Zoom / Pan ────────────────────────────────────────────────────────────
  const handleZoomIn  = () => setZoom((z) => Math.min(z * 1.25, 8));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.25, 0.05));
  const handleZoomFit = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(Math.max(z * (e.deltaY > 0 ? 0.9 : 1.1), 0.05), 8));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (selectedTool || e.button !== 0) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setPanOrigin({ ...pan });
  }, [selectedTool, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: panOrigin.x + (e.clientX - panStart.x), y: panOrigin.y + (e.clientY - panStart.y) });
    }
    // Update ladder preview
    if (selectedTool === "ladder" && ladderStart) {
      const rect = contentRef.current?.getBoundingClientRect();
      if (rect) {
        setLadderPreview({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    }
    // Update connection preview
    if (selectedTool === "connection" && connectionStart) {
      const rect = contentRef.current?.getBoundingClientRect();
      if (rect) {
        setConnectionPreview({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    }
    // Update UTP / UTP-Node preview
    if ((selectedTool === "utp" || selectedTool === "utp-node") && utpStart) {
      const rect = contentRef.current?.getBoundingClientRect();
      if (rect) {
        setUtpPreview({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    }
  }, [isPanning, panStart, panOrigin, selectedTool, ladderStart, connectionStart, utpStart]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  // ── Place annotation on the content area ─────────────────────────────────
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    if (!selectedTool) return;
    e.stopPropagation();
    const rect = contentRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    const xPx = e.clientX - rect.left;
    const yPx = e.clientY - rect.top;

    // UTP Cable: two-point drawing mode
    if (selectedTool === "utp") {
      if (!utpStart) {
        setUtpStart({ x: xPx, y: yPx });
        return;
      }
      // Second click: open dialog to pick color and category
      setUtpPending({ x1: utpStart.x, y1: utpStart.y, x2: xPx, y2: yPx });
      setUtpStart(null);
      setUtpPreview(null);
      setUtpDialogOpen(true);
      return;
    }
    // UTP Node: two-point drawing mode (opens node dialog with ceiling height)
    if (selectedTool === "utp-node") {
      if (!utpStart) {
        setUtpStart({ x: xPx, y: yPx });
        return;
      }
      // Second click: open node dialog
      setUtpNodePending({ x1: utpStart.x, y1: utpStart.y, x2: xPx, y2: yPx });
      setUtpStart(null);
      setUtpPreview(null);
      setUtpNodeDialogOpen(true);
      return;
    }
    // Connection: two-point drawing mode
    if (selectedTool === "connection") {
      if (!connectionStart) {
        setConnectionStart({ x: xPx, y: yPx });
        return;
      }
      // Second click: create the connection annotation
      const color = "#a78bfa";
      const data = JSON.stringify({ x1: connectionStart.x, y1: connectionStart.y, x2: xPx, y2: yPx, connColor: color });
      setConnectionStart(null);
      setConnectionPreview(null);
      createAnnotation.mutate({
        planId,
        type: "connection",
        x: xPct.toFixed(2),
        y: yPct.toFixed(2),
        color,
        icon: "🔗",
        data,
      });
      return;
    }
    // Ladder: two-point drawing mode
    if (selectedTool === "ladder") {
      if (!ladderStart) {
        setLadderStart({ x: xPx, y: yPx });
        return;
      }
      // Second click: create the ladder annotation
      const color = "#22c55e";
      const data = JSON.stringify({ x1: ladderStart.x, y1: ladderStart.y, x2: xPx, y2: yPx });
      setLadderStart(null);
      setLadderPreview(null);
      createAnnotation.mutate({
        planId,
        type: "ladder",
        x: xPct.toFixed(2),
        y: yPct.toFixed(2),
        color,
        icon: "🪜",
        data,
      });
      return;
    }

    const builtin = BUILTIN_MARKERS.find((m) => m.type === selectedTool);
    const customLayer = (layers as Layer[]).find((l) => `layer_${l.id}` === selectedTool);
    setPendingAnnotation({
      x: xPct.toFixed(2),
      y: yPct.toFixed(2),
      icon: builtin?.icon ?? customLayer?.icon ?? "📍",
      color: builtin?.color ?? customLayer?.color ?? "#6366f1",
      type: builtin?.type ?? "marker",
      layerId: customLayer?.id ?? null,
    });
    setLabelDialogOpen(true);
  }, [selectedTool, layers, ladderStart, planId, createAnnotation]);

  const handleLabelConfirm = async (label: string) => {
    if (!pendingAnnotation) return;
    setLabelDialogOpen(false);
    try {
      await createAnnotation.mutateAsync({
        planId,
        layerId: pendingAnnotation.layerId ?? undefined,
        type: pendingAnnotation.type,
        x: pendingAnnotation.x,
        y: pendingAnnotation.y,
        label: label || undefined,
        color: pendingAnnotation.color,
        icon: pendingAnnotation.icon,
      });
      toast.success("Marcador colocado");
    } catch (e: any) {
      toast.error(e?.message ?? "Error al colocar marcador");
    }
    setPendingAnnotation(null);
  };

  const handleLabelCancel = () => { setLabelDialogOpen(false); setPendingAnnotation(null); };

  const handleUtpConfirm = async () => {
    if (!utpPending) return;
    setUtpDialogOpen(false);
    try {
      const data = JSON.stringify({
        x1: utpPending.x1, y1: utpPending.y1,
        x2: utpPending.x2, y2: utpPending.y2,
        utpColor, utpCategory,
      });
      const activeLayer = layers && layers.length > 0 ? layers[0].id : undefined;
      await createAnnotation.mutateAsync({
        planId,
        layerId: activeLayer,
        type: "utp",
        x: "0",
        y: "0",
        label: `Cable ${utpCategory}`,
        icon: "🟦",
        color: utpColor,
        data,
      });
      toast.success("Cable UTP colocado");
    } catch (e: any) {
      toast.error(e?.message ?? "Error al colocar cable UTP");
    }
    setUtpPending(null);
  };

  const handleUtpCancel = () => { setUtpDialogOpen(false); setUtpPending(null); };

  // ── UTP Node (full path with ceiling height) ─────────────────────────────
  const handleUtpNodeConfirm = async (ceilingHeight: number, rackMargin: number) => {
    if (!utpNodePending) return;
    setUtpNodeDialogOpen(false);
    try {
      const containerEl = contentRef.current;
      const containerPx = containerEl ? { w: containerEl.offsetWidth, h: containerEl.offsetHeight } : null;
      const pxLen = Math.sqrt((utpNodePending.x2 - utpNodePending.x1) ** 2 + (utpNodePending.y2 - utpNodePending.y1) ** 2);
      const horizMeters = calcUtpLengthMeters(pxLen, pdfDims, containerPx, plan?.scale) ?? 0;
      const totalMeters = horizMeters + 2 * ceilingHeight + rackMargin;
      const data = JSON.stringify({
        x1: utpNodePending.x1, y1: utpNodePending.y1,
        x2: utpNodePending.x2, y2: utpNodePending.y2,
        utpColor, utpCategory,
        ceilingHeight, rackMargin, totalMeters,
        isNode: true,
      });
      const activeLayer = layers && layers.length > 0 ? layers[0].id : undefined;
      await createAnnotation.mutateAsync({
        planId,
        layerId: activeLayer,
        type: "utp",
        x: "0", y: "0",
        label: `Nodo ${utpCategory} (${formatMeters(totalMeters)})`,
        icon: "🟦",
        color: utpColor,
        data,
      });
      toast.success(`Nodo UTP creado: ${formatMeters(totalMeters)}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al crear nodo UTP");
    }
    setUtpNodePending(null);
  };

  const handleUtpNodeCancel = () => { setUtpNodeDialogOpen(false); setUtpNodePending(null); };

  // ── Export DXF ───────────────────────────────────────────────────────────
  const handleExportDXF = () => {
    const containerEl = contentRef.current;
    const containerPx = containerEl ? { w: containerEl.offsetWidth, h: containerEl.offsetHeight } : null;
    const dxf = generateDXF(annotations as Annotation[], pdfDims, containerPx, plan?.scale);
    const blob = new Blob([dxf], { type: "application/dxf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan?.name ?? "plano"}.dxf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Archivo DXF exportado");
  };

  // ── Move annotation (drag end) ────────────────────────────────────────────
  // Sync local rotation/scale when selection changes
  useEffect(() => {
    if (selectedAnnotation === null) return;
    const ann = (annotations as Annotation[]).find((a) => a.id === selectedAnnotation);
    if (!ann) return;
    const { rotation = 0, scale = 1, fov = 60, range = 1, coneColor = "" } = parseData(ann.data);
    setLocalRotation(rotation);
    setLocalScale(scale);
    setLocalFov(fov);
    setLocalRange(range);
    setLocalConeColor(coneColor);
  }, [selectedAnnotation]);

  const handleRotationChange = useCallback((val: number) => {
    setLocalRotation(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (selectedAnnotation === null) return;
      const ann = (annotations as Annotation[]).find((a) => a.id === selectedAnnotation);
      if (!ann) return;
      const existing = parseData(ann.data);
      try {
        await updateAnnotation.mutateAsync({ id: selectedAnnotation, data: JSON.stringify({ ...existing, rotation: val }) });
      } catch { toast.error("Error al guardar rotación"); }
    }, 400);
  }, [selectedAnnotation, annotations, updateAnnotation]);

  const handleScaleChange = useCallback((val: number) => {
    setLocalScale(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (selectedAnnotation === null) return;
      const ann = (annotations as Annotation[]).find((a) => a.id === selectedAnnotation);
      if (!ann) return;
      const existing = parseData(ann.data);
      try {
        await updateAnnotation.mutateAsync({ id: selectedAnnotation, data: JSON.stringify({ ...existing, scale: val }) });
      } catch { toast.error("Error al guardar tamaño"); }
    }, 400);
  }, [selectedAnnotation, annotations, updateAnnotation]);

  const handleFovChange = useCallback((val: number) => {
    setLocalFov(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (selectedAnnotation === null) return;
      const ann = (annotations as Annotation[]).find((a) => a.id === selectedAnnotation);
      if (!ann) return;
      const existing = parseData(ann.data);
      try {
        await updateAnnotation.mutateAsync({ id: selectedAnnotation, data: JSON.stringify({ ...existing, fov: val }) });
      } catch { toast.error("Error al guardar ángulo"); }
    }, 400);
  }, [selectedAnnotation, annotations, updateAnnotation]);

  const handleRangeChange = useCallback((val: number) => {
    setLocalRange(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (selectedAnnotation === null) return;
      const ann = (annotations as Annotation[]).find((a) => a.id === selectedAnnotation);
      if (!ann) return;
      const existing = parseData(ann.data);
      try {
        await updateAnnotation.mutateAsync({ id: selectedAnnotation, data: JSON.stringify({ ...existing, range: val }) });
      } catch { toast.error("Error al guardar alcance"); }
    }, 400);
    }, [selectedAnnotation, annotations, updateAnnotation]);
  const handleConeColorChange = useCallback((val: string) => {
    setLocalConeColor(val);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (selectedAnnotation === null) return;
      const ann = (annotations as Annotation[]).find((a) => a.id === selectedAnnotation);
      if (!ann) return;
      const existing = parseData(ann.data);
      try {
        await updateAnnotation.mutateAsync({ id: selectedAnnotation, data: JSON.stringify({ ...existing, coneColor: val }) });
      } catch { toast.error("Error al guardar color del cono"); }
    }, 400);
  }, [selectedAnnotation, annotations, updateAnnotation]);
  const handleAnnotationMove = useCallback(async (id: number, x: string, y: string) => {
    try {
      await updateAnnotation.mutateAsync({ id, x, y });
    } catch {
      toast.error("Error al mover marcador");
    }
  }, [updateAnnotation]);

  const handleDeleteAnnotation = async (id: number) => {
    try {
      await deleteAnnotation.mutateAsync({ id });
      toast.success("Marcador eliminado");
      if (selectedAnnotation === id) setSelectedAnnotation(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Error al eliminar marcador");
    }
  };

  // ── Layer visibility ──────────────────────────────────────────────────────
  const toggleLayer = (key: string) => {
    setHiddenLayers((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const isVisible = (ann: Annotation) =>
    ann.layerId ? !hiddenLayers.has(`layer_${ann.layerId}`) : !hiddenLayers.has(ann.type ?? "marker");

  const visibleAnnotations = useMemo(
    () => (annotations as Annotation[]).filter(isVisible),
    [annotations, hiddenLayers]
  );

  // ── Dismiss selection on canvas click ────────────────────────────────────
  const handleCanvasBgClick = useCallback(() => {
    if (!selectedTool) {
      setSelectedAnnotation(null);
      setLocalRotation(0);
      setLocalScale(1);
    }
  }, [selectedTool]);

  // Cancel ladder drawing on tool change
  useEffect(() => {
    if (selectedTool !== "ladder") {
      setLadderStart(null);
      setLadderPreview(null);
    }
    if (selectedTool !== "connection") {
      setConnectionStart(null);
      setConnectionPreview(null);
    }
    if (selectedTool !== "utp" && selectedTool !== "utp-node") {
      setUtpStart(null);
      setUtpPreview(null);
    }
  }, [selectedTool]);

  // ── Loading / not found ───────────────────────────────────────────────────
  if (planLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1d23]">
        <div className="text-gray-400 text-sm">Cargando plano...</div>
      </div>
    );
  }
  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#1a1d23] gap-4">
        <span className="text-5xl">🗺️</span>
        <p className="text-lg font-medium text-gray-200">Plano no encontrado</p>
        <Button onClick={() => navigate("/floor-plans")}>← Volver a planos</Button>
      </div>
    );
  }

  const isPdf   = plan.format === "pdf";
  const isImage = ["png", "jpg", "jpeg"].includes(plan.format ?? "");
  const isDxf   = plan.format === "dxf";
  const isDwg   = plan.format === "dwg";
  const hasFile = !!plan.fileUrl;

  return (
    <>
      <div className="flex h-screen overflow-hidden" style={{ background: "#1a1d23" }}>

        {/* ═══ LEFT TOOLBAR ═══════════════════════════════════════════════════ */}
        <div className="flex-shrink-0 flex flex-col border-r" style={{ width: "200px", background: "#22262e", borderColor: "#2e3340" }}>
          {/* Back + plan info */}
          <div className="px-3 pt-3 pb-2 border-b" style={{ borderColor: "#2e3340" }}>
            <button
              onClick={() => navigate("/floor-plans")}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors mb-2"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Planos
            </button>
            <p className="text-sm font-semibold text-white leading-tight truncate">{plan.name}</p>
            {(plan.building || plan.floor) && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{[plan.building, plan.floor].filter(Boolean).join(" · ")}</p>
            )}
          </div>

          {/* Tool list */}
          <div className="px-2 pt-3 pb-2 flex-1 overflow-y-auto">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-1 mb-1.5">Herramientas</p>
            <div className="space-y-0.5">
              <ToolButton
                active={selectedTool === null}
                onClick={() => setSelectedTool(null)}
                icon={<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 2L13 8L8 9.5L6 14L3 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill={selectedTool === null ? "white" : "none"} fillOpacity="0.5"/></svg>}
                label="Seleccionar"
              />
              {BUILTIN_MARKERS.map((m) => (
                <ToolButton key={m.type} active={selectedTool === m.type} onClick={() => setSelectedTool(m.type)} icon={<span>{m.icon}</span>} label={m.label} />
              ))}
              <ToolButton
                active={selectedTool === "utp-node"}
                onClick={() => setSelectedTool("utp-node")}
                icon={<span>🔵</span>}
                label="Nodo UTP"
              />
              {(layers as Layer[]).map((layer) => (
                <ToolButton key={layer.id} active={selectedTool === `layer_${layer.id}`} onClick={() => setSelectedTool(`layer_${layer.id}`)} icon={<span>{layer.icon ?? "📍"}</span>} label={layer.label} />
              ))}
            </div>
            {/* Export DXF */}
            <div className="px-2 pb-2 pt-1">
              <button
                onClick={handleExportDXF}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                style={{ background: "#0ea5e922", color: "#0ea5e9", border: "1px solid #0ea5e944" }}
                title="Exportar anotaciones a AutoCAD DXF"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M5 5h4M5 7.5h4M5 10h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <path d="M9 9l2 2M11 9l-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Exportar DXF
              </button>
            </div>
          </div>

          {/* Status */}
          <div className="px-3 py-2 border-t text-xs" style={{ borderColor: "#2e3340" }}>
            {selectedTool === "ladder" && ladderStart ? (
              <p className="text-green-400">Clic para definir el punto final de la escalerilla</p>
            ) : selectedTool === "ladder" ? (
              <p className="text-green-400">Clic para definir el punto inicial de la escalerilla</p>
            ) : selectedTool === "connection" && connectionStart ? (
              <p className="text-purple-400">Clic en el elemento destino para conectar</p>
            ) : selectedTool === "connection" ? (
              <p className="text-purple-400">Clic en el elemento origen de la conexión</p>
            ) : selectedTool === "utp" && utpStart ? (
              <p className="text-blue-400">Clic para definir el punto final del cable UTP</p>
            ) : selectedTool === "utp" ? (
              <p className="text-blue-400">Clic para definir el punto inicial del cable UTP</p>
            ) : selectedTool === "utp-node" && utpStart ? (
              <p className="text-cyan-400">Clic para definir el punto final del nodo UTP</p>
            ) : selectedTool === "utp-node" ? (
              <p className="text-cyan-400">Clic para definir el punto inicial del nodo UTP</p>
            ) : selectedTool ? (
              <p className="text-blue-400">Clic en el plano para colocar</p>
            ) : (
              <p className="text-gray-500">{(annotations as Annotation[]).length} marcadores</p>
            )}
          </div>
        </div>

        {/* ═══ CANVAS AREA ════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2 border-b" style={{ background: "#22262e", borderColor: "#2e3340" }}>
            <div className="flex items-center gap-1 rounded-lg px-1 py-0.5" style={{ background: "#1a1d23" }}>
              <button onClick={handleZoomOut} className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:bg-white/10 hover:text-white transition-colors text-lg font-light">−</button>
              <span className="text-xs font-mono text-gray-300 w-12 text-center select-none">{Math.round(zoom * 100)}%</span>
              <button onClick={handleZoomIn} className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:bg-white/10 hover:text-white transition-colors text-lg font-light">+</button>
            </div>
            <button onClick={handleZoomFit} className="px-3 py-1 rounded text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-colors border" style={{ borderColor: "#3a3f4b" }}>Ajustar</button>
            <button
              onClick={() => { const el = document.documentElement; if (!document.fullscreenElement) el.requestFullscreen?.(); else document.exitFullscreen?.(); }}
              className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
              title="Pantalla completa"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 5V1H5M9 1H13V5M13 9V13H9M5 13H1V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            </button>
            <div className="ml-auto flex items-center gap-2">
              {plan.scale && <span className="text-xs text-gray-400 font-mono">Escala {plan.scale}</span>}
              {plan.format && <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: "#2e3340", color: "#9ca3af" }}>{plan.format.toUpperCase()}</span>}
            </div>
          </div>

          {/* Canvas */}
          <div
            ref={viewerRef}
            className="flex-1 relative overflow-hidden"
            style={{ background: "#14161b", cursor: selectedTool ? "crosshair" : isPanning ? "grabbing" : "grab" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onClick={handleCanvasBgClick}
          >
            {/* Grid dots */}
            <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%", opacity: 0.12 }}>
              <defs>
                <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="#6b7280" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#dots)" />
            </svg>

            {!hasFile ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <span className="text-5xl opacity-40">📁</span>
                <p className="text-gray-400 font-medium">Sin archivo adjunto</p>
                <p className="text-gray-500 text-sm">Sube un PDF o imagen desde la lista de planos</p>
              </div>
            ) : (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "center center",
                  transition: isPanning ? "none" : "transform 0.08s ease-out",
                  willChange: "transform",
                }}
              >
                {/* Content container — annotations are positioned relative to this */}
                <div
                  ref={contentRef}
                  className="relative shadow-2xl"
                  style={{ cursor: selectedTool ? "crosshair" : "default" }}
                  onClick={handleContentClick}
                >
                  {isPdf ? (
                    <PdfCanvas
                      url={plan.fileUrl!}
                      onReady={(w, h) => setPdfDims({ w, h })}
                    />
                  ) : isImage ? (
                    <img
                      src={plan.fileUrl!}
                      alt={plan.name}
                      style={{ maxWidth: "1200px", maxHeight: "1600px", display: "block", borderRadius: "2px" }}
                      draggable={false}
                    />
                  ) : isDxf ? (
                    <DxfViewerComponent
                      url={plan.fileUrl!}
                      onReady={(w, h) => setPdfDims({ w, h })}
                    />
                  ) : isDwg ? (
                    <div className="flex flex-col items-center justify-center gap-4 p-12 rounded-lg" style={{ background: "#22262e", border: "1px solid #2e3340", minWidth: "420px" }}>
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: "#0ea5e922", border: "1px solid #0ea5e944" }}>
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                          <rect x="4" y="2" width="20" height="24" rx="3" stroke="#0ea5e9" strokeWidth="1.5"/>
                          <path d="M9 9h10M9 13h10M9 17h6" stroke="#0ea5e9" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-white text-sm mb-1">{plan.name}</p>
                        <p className="text-xs text-gray-400 mb-3">Archivo DWG (formato binario AutoCAD)</p>
                        <div className="rounded-lg p-3 text-left mb-3" style={{ background: "#1a1d23", border: "1px solid #2e3340" }}>
                          <p className="text-[11px] font-semibold text-yellow-400 mb-1.5">⚠ Para visualizar en HOROS:</p>
                          <p className="text-[11px] text-gray-400 leading-relaxed">El formato DWG es propietario de Autodesk y no puede renderizarse directamente en el navegador. Convierta el archivo a <strong className="text-white">DXF</strong> o <strong className="text-white">PDF</strong> para visualizarlo aquí.</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-[10px] text-gray-500">Opciones de conversión gratuita:</p>
                            <p className="text-[10px] text-blue-400">• AutoCAD: Guardar como → DXF</p>
                            <p className="text-[10px] text-blue-400">• LibreCAD (gratis): Abrir DWG → Exportar DXF</p>
                            <p className="text-[10px] text-blue-400">• Online: cloudconvert.com/dwg-to-dxf</p>
                          </div>
                        </div>
                      </div>
                      <a href={plan.fileUrl!} target="_blank" rel="noopener noreferrer"
                        className="px-4 py-2 rounded-lg text-sm text-white border hover:bg-white/10 transition-colors"
                        style={{ borderColor: "#3a3f4b" }}
                      >
                        Descargar DWG original
                      </a>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 p-16 rounded-lg" style={{ background: "#22262e", border: "1px solid #2e3340" }}>
                      <span className="text-5xl">📐</span>
                      <p className="font-medium text-white">{plan.name}</p>
                      <a href={plan.fileUrl!} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-sm text-white border hover:bg-white/10 transition-colors" style={{ borderColor: "#3a3f4b" }}>Descargar archivo</a>
                    </div>
                  )}

                  {/* Annotation markers */}
                  {visibleAnnotations.map((ann) => (
                    ann.type === "ladder" || ann.type === "connection" || ann.type === "utp" ? null : (
                      <DraggableMarker
                        key={ann.id}
                        ann={ann}
                        selected={selectedAnnotation === ann.id}
                        onSelect={() => setSelectedAnnotation(ann.id)}
                        onMove={(x, y) => handleAnnotationMove(ann.id, x, y)}
                        onDelete={() => handleDeleteAnnotation(ann.id)}
                        zoom={zoom}
                      />
                    )
                  ))}
                  {/* Connection lines rendered as SVG overlay */}
                  {(() => {
                    const connAnns = visibleAnnotations.filter((a) => a.type === "connection");
                    if (connAnns.length === 0 && !connectionStart) return null;
                    const rect = contentRef.current;
                    const w = rect?.offsetWidth ?? 1000;
                    const h = rect?.offsetHeight ?? 800;
                    return (
                      <svg
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible", zIndex: 29 }}
                        viewBox={`0 0 ${w} ${h}`}
                        preserveAspectRatio="none"
                      >
                        {connAnns.map((ann) => {
                          const d = parseData(ann.data);
                          if (d.x1 === undefined) return null;
                          const col = d.connColor ?? ann.color ?? "#a78bfa";
                          return (
                            <g key={ann.id} style={{ pointerEvents: "all", cursor: "pointer" }} onClick={() => setSelectedAnnotation(selectedAnnotation === ann.id ? null : ann.id)}>
                              <ConnectionSvg x1={d.x1!} y1={d.y1!} x2={d.x2!} y2={d.y2!} color={col} selected={selectedAnnotation === ann.id} />
                              {selectedAnnotation === ann.id && (
                                <g>
                                  <circle cx={(d.x1! + d.x2!) / 2} cy={(d.y1! + d.y2!) / 2} r={10} fill="#ef4444" style={{ cursor: "pointer", pointerEvents: "all" }}
                                    onClick={(ev) => { ev.stopPropagation(); handleDeleteAnnotation(ann.id); }} />
                                  <text x={(d.x1! + d.x2!) / 2} y={(d.y1! + d.y2!) / 2 + 4} textAnchor="middle" fill="white" fontSize="12" style={{ pointerEvents: "none" }}>×</text>
                                </g>
                              )}
                              {ann.label && (
                                <text x={(d.x1! + d.x2!) / 2} y={(d.y1! + d.y2!) / 2 - 12} textAnchor="middle" fill={col} fontSize="11" fontWeight="600" style={{ pointerEvents: "none", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }}>{ann.label}</text>
                              )}
                            </g>
                          );
                        })}
                        {/* Preview while drawing */}
                        {connectionStart && connectionPreview && (
                          <ConnectionSvg x1={connectionStart.x} y1={connectionStart.y} x2={connectionPreview.x} y2={connectionPreview.y} color="#a78bfa" selected={false} />
                        )}
                        {connectionStart && (
                          <circle cx={connectionStart.x} cy={connectionStart.y} r={6} fill="#a78bfa" fillOpacity="0.8" />
                        )}
                      </svg>
                    );
                  })()}
                  {/* Ladder annotations rendered as SVG overlay */}
                  {(() => {
                    const ladderAnns = visibleAnnotations.filter((a) => a.type === "ladder");
                    if (ladderAnns.length === 0 && !ladderStart) return null;
                    const rect = contentRef.current;
                    const w = rect?.offsetWidth ?? 1000;
                    const h = rect?.offsetHeight ?? 800;
                    return (
                      <svg
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible", zIndex: 30 }}
                        viewBox={`0 0 ${w} ${h}`}
                        preserveAspectRatio="none"
                      >
                        {ladderAnns.map((ann) => {
                          const d = parseData(ann.data);
                          if (d.x1 === undefined) return null;
                          return (
                            <g key={ann.id} style={{ pointerEvents: "all", cursor: "pointer" }} onClick={() => setSelectedAnnotation(selectedAnnotation === ann.id ? null : ann.id)}>
                              <LadderSvg x1={d.x1!} y1={d.y1!} x2={d.x2!} y2={d.y2!} color={ann.color ?? "#22c55e"} selected={selectedAnnotation === ann.id} />
                              {selectedAnnotation === ann.id && (
                                <g>
                                  <circle cx={(d.x1! + d.x2!) / 2} cy={(d.y1! + d.y2!) / 2} r={10} fill="#ef4444" style={{ cursor: "pointer", pointerEvents: "all" }}
                                    onClick={(e) => { e.stopPropagation(); handleDeleteAnnotation(ann.id); }} />
                                  <text x={(d.x1! + d.x2!) / 2} y={(d.y1! + d.y2!) / 2 + 4} textAnchor="middle" fill="white" fontSize="12" style={{ pointerEvents: "none" }}>×</text>
                                </g>
                              )}
                              {ann.label && (
                                <text x={(d.x1! + d.x2!) / 2} y={(d.y1! + d.y2!) / 2 - 12} textAnchor="middle" fill={ann.color ?? "#22c55e"} fontSize="11" fontWeight="600" style={{ pointerEvents: "none", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }}>{ann.label}</text>
                              )}
                            </g>
                          );
                        })}
                        {/* Preview line while drawing */}
                        {ladderStart && ladderPreview && (
                          <LadderSvg x1={ladderStart.x} y1={ladderStart.y} x2={ladderPreview.x} y2={ladderPreview.y} color="#22c55e" selected={false} />
                        )}
                        {ladderStart && (
                          <circle cx={ladderStart.x} cy={ladderStart.y} r={6} fill="#22c55e" fillOpacity="0.8" />
                        )}
                      </svg>
                    );
                  })()}
                  {/* UTP Cable annotations rendered as SVG overlay */}
                  {(() => {
                    const utpAnns = visibleAnnotations.filter((a) => a.type === "utp");
                    if (utpAnns.length === 0 && !utpStart) return null;
                    const rect = contentRef.current;
                    const w = rect?.offsetWidth ?? 1000;
                    const h = rect?.offsetHeight ?? 800;
                    return (
                      <svg
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible", zIndex: 31 }}
                        viewBox={`0 0 ${w} ${h}`}
                        preserveAspectRatio="none"
                      >
                        {utpAnns.map((ann) => {
                          const d = parseData(ann.data);
                          if (d.x1 === undefined) return null;
                          const col = d.utpColor ?? ann.color ?? "#3b82f6";
                          // Calcular longitud real
                          const pxLen = Math.sqrt((d.x2! - d.x1!) ** 2 + (d.y2! - d.y1!) ** 2);
                          const containerPx = rect ? { w: rect.offsetWidth, h: rect.offsetHeight } : null;
                          // Para nodos UTP: usar la longitud total guardada (incluye altura de techo)
                          const horizMeters = calcUtpLengthMeters(pxLen, pdfDims, containerPx, plan.scale);
                          const meters = (d as any).isNode && (d as any).totalMeters != null
                            ? (d as any).totalMeters as number
                            : horizMeters;
                          const lengthLabel = meters != null ? `${(d as any).isNode ? "🔵 " : ""}${formatMeters(meters)}` : undefined;
                          const overLimit = meters != null && meters > UTP_MAX_METERS;
                          return (
                            <g key={ann.id} style={{ pointerEvents: "all", cursor: "pointer" }} onClick={() => setSelectedAnnotation(selectedAnnotation === ann.id ? null : ann.id)}>
                              <UtpCableSvg x1={d.x1!} y1={d.y1!} x2={d.x2!} y2={d.y2!} color={col} selected={selectedAnnotation === ann.id} category={d.utpCategory} lengthLabel={lengthLabel} overLimit={overLimit} />
                              {selectedAnnotation === ann.id && (
                                <g>
                                  <circle cx={(d.x1! + d.x2!) / 2} cy={(d.y1! + d.y2!) / 2} r={10} fill="#ef4444" style={{ cursor: "pointer", pointerEvents: "all" }}
                                    onClick={(ev) => { ev.stopPropagation(); handleDeleteAnnotation(ann.id); }} />
                                  <text x={(d.x1! + d.x2!) / 2} y={(d.y1! + d.y2!) / 2 + 4} textAnchor="middle" fill="white" fontSize="12" style={{ pointerEvents: "none" }}>×</text>
                                </g>
                              )}
                            </g>
                          );
                        })}
                        {/* Preview while drawing */}
                        {utpStart && utpPreview && (() => {
                          const pxLen = Math.sqrt((utpPreview.x - utpStart.x) ** 2 + (utpPreview.y - utpStart.y) ** 2);
                          const containerPx = contentRef.current ? { w: contentRef.current.offsetWidth, h: contentRef.current.offsetHeight } : null;
                          const meters = calcUtpLengthMeters(pxLen, pdfDims, containerPx, plan.scale);
                          const lengthLabel = meters != null ? formatMeters(meters) : undefined;
                          const overLimit = meters != null && meters > UTP_MAX_METERS;
                          return (
                            <UtpCableSvg x1={utpStart.x} y1={utpStart.y} x2={utpPreview.x} y2={utpPreview.y} color={utpColor} selected={false} category={utpCategory} lengthLabel={lengthLabel} overLimit={overLimit} />
                          );
                        })()}
                        {utpStart && (
                          <circle cx={utpStart.x} cy={utpStart.y} r={6} fill={utpColor} fillOpacity="0.8" />
                        )}
                      </svg>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Zoom badge */}
            <div className="absolute bottom-3 left-3 text-xs font-mono px-2 py-1 rounded pointer-events-none" style={{ background: "#22262e", color: "#6b7280", border: "1px solid #2e3340" }}>
              {Math.round(zoom * 100)}%
            </div>
          </div>
        </div>

        {/* ═══ RIGHT PANEL ════════════════════════════════════════════════════ */}
        <div className="flex-shrink-0 flex flex-col border-l" style={{ width: "220px", background: "#22262e", borderColor: "#2e3340" }}>
          <div className="flex-1 overflow-y-auto">
            {/* Layers */}
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Capas</p>
              <div className="space-y-0.5">
                {BUILTIN_MARKERS.map((m) => {
                  const count = (annotations as Annotation[]).filter((a) => a.type === m.type && !a.layerId).length;
                  const hidden = hiddenLayers.has(m.type);
                  return (
                    <button key={m.type} onClick={() => toggleLayer(m.type)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${hidden ? "opacity-35" : "hover:bg-white/5"}`}>
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: m.color }} />
                      <span className="flex-1 text-left text-gray-300 truncate">{m.label}</span>
                      {count > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: m.color + "33", color: m.color }}>{count}</span>}
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-gray-500 flex-shrink-0">
                        {hidden ? <path d="M1 1L11 11M5 3.2C5.3 3.1 5.6 3 6 3C8.2 3 10 6 10 6C10 6 9.5 6.9 8.7 7.7M3.3 4.3C2.5 5.1 2 6 2 6C2 6 3.8 9 6 9C6.4 9 6.7 8.9 7 8.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/> : <path d="M6 3C3.8 3 2 6 2 6C2 6 3.8 9 6 9C8.2 9 10 6 10 6C10 6 8.2 3 6 3ZM6 7.5C5.2 7.5 4.5 6.8 4.5 6C4.5 5.2 5.2 4.5 6 4.5C6.8 4.5 7.5 5.2 7.5 6C7.5 6.8 6.8 7.5 6 7.5Z" stroke="currentColor" strokeWidth="1.2"/>}
                      </svg>
                    </button>
                  );
                })}
                {(layers as Layer[]).map((layer) => {
                  const count = (annotations as Annotation[]).filter((a) => a.layerId === layer.id).length;
                  const hidden = hiddenLayers.has(`layer_${layer.id}`);
                  const color = layer.color ?? "#6366f1";
                  return (
                    <button key={layer.id} onClick={() => toggleLayer(`layer_${layer.id}`)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${hidden ? "opacity-35" : "hover:bg-white/5"}`}>
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="flex-1 text-left text-gray-300 truncate">{layer.label}</span>
                      {count > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: color + "33", color }}>{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Annotations list - compact silver panel */}
            {/* ── Annotations accordion ─────────────────────────────────────── */}
            <AnnotationsAccordion
              annotations={annotations as Annotation[]}
              pdfDims={pdfDims}
              contentRef={contentRef}
              planScale={plan?.scale}
              selectedAnnotation={selectedAnnotation}
              onSelect={setSelectedAnnotation}
              onDelete={handleDeleteAnnotation}
            />
          </div>

          {/* Selected annotation controls */}
          {selectedAnnotation !== null && (() => {
            const ann = (annotations as Annotation[]).find((a) => a.id === selectedAnnotation);
            if (!ann) return null;
            const color = ann.color ?? "#6366f1";
            return (
              <div className="px-3 py-3 border-t" style={{ borderColor: "#2e3340" }}>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">Editar marcador</p>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-xs text-gray-300 truncate">{ann.label || ann.type}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-gray-400">Rotación</label>
                    <span className="text-[10px] font-mono text-blue-300">{localRotation}°</span>
                  </div>
                  <input
                    type="range" min={0} max={359} step={1}
                    value={localRotation}
                    onChange={(e) => handleRotationChange(parseInt(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: color }}
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                      <button
                        key={deg}
                        onClick={() => handleRotationChange(deg)}
                        className="text-[9px] px-1.5 py-0.5 rounded transition-colors"
                        style={{
                          background: localRotation === deg ? color + "44" : "#2e3340",
                          color: localRotation === deg ? color : "#9ca3af",
                          border: `1px solid ${localRotation === deg ? color + "66" : "transparent"}`,
                        }}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-gray-400">Tamaño</label>
                    <span className="text-[10px] font-mono text-blue-300">{Math.round(localScale * 100)}%</span>
                  </div>
                  <input
                    type="range" min={0.3} max={4} step={0.1}
                    value={localScale}
                    onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: color }}
                  />
                  <div className="flex gap-1 mt-1">
                    {[0.5, 1, 1.5, 2, 3].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleScaleChange(s)}
                        className="text-[9px] px-1.5 py-0.5 rounded transition-colors"
                        style={{
                          background: Math.abs(localScale - s) < 0.05 ? color + "44" : "#2e3340",
                          color: Math.abs(localScale - s) < 0.05 ? color : "#9ca3af",
                          border: `1px solid ${Math.abs(localScale - s) < 0.05 ? color + "66" : "transparent"}`,
                        }}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>
                </div>
                {/* FOV and Range — camera only */}
                {ann.type === "camera" && (
                  <>
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-gray-400">Color del cono</label>
                        <div
                          className="w-5 h-5 rounded-full border-2 border-white/20 cursor-pointer"
                          style={{ background: localConeColor || color }}
                          title="Haz clic para cambiar el color"
                        />
                      </div>
                      <div className="flex gap-1.5 flex-wrap mt-1">
                        {["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899","#ffffff","#facc15"].map((c) => (
                          <button
                            key={c}
                            onClick={() => handleConeColorChange(c)}
                            className="w-5 h-5 rounded-full border-2 transition-all"
                            style={{
                              background: c,
                              borderColor: (localConeColor || color) === c ? "white" : "transparent",
                              transform: (localConeColor || color) === c ? "scale(1.25)" : "scale(1)",
                            }}
                            title={c}
                          />
                        ))}
                        <label className="w-5 h-5 rounded-full border-2 border-dashed border-gray-500 flex items-center justify-center cursor-pointer" title="Color personalizado">
                          <span className="text-[8px] text-gray-400">+</span>
                          <input type="color" className="sr-only" value={localConeColor || color} onChange={(e) => handleConeColorChange(e.target.value)} />
                        </label>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-gray-400">Ángulo de visión</label>
                        <span className="text-[10px] font-mono text-blue-300">{localFov}°</span>
                      </div>
                      <input
                        type="range" min={15} max={180} step={5}
                        value={localFov}
                        onChange={(e) => handleFovChange(parseInt(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{ accentColor: color }}
                      />
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {[30, 60, 90, 120, 150, 180].map((f) => (
                          <button key={f} onClick={() => handleFovChange(f)}
                            className="text-[9px] px-1.5 py-0.5 rounded transition-colors"
                            style={{ background: localFov === f ? color+"44" : "#2e3340", color: localFov === f ? color : "#9ca3af", border: `1px solid ${localFov===f?color+"66":"transparent"}` }}>
                            {f}°
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-gray-400">Alcance del cono</label>
                        <span className="text-[10px] font-mono text-blue-300">{localRange.toFixed(1)}×</span>
                      </div>
                      <input
                        type="range" min={0.3} max={5} step={0.1}
                        value={localRange}
                        onChange={(e) => handleRangeChange(parseFloat(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{ accentColor: color }}
                      />
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {[0.5, 1, 1.5, 2, 3, 5].map((r) => (
                          <button key={r} onClick={() => handleRangeChange(r)}
                            className="text-[9px] px-1.5 py-0.5 rounded transition-colors"
                            style={{ background: Math.abs(localRange-r)<0.05 ? color+"44" : "#2e3340", color: Math.abs(localRange-r)<0.05 ? color : "#9ca3af", border: `1px solid ${Math.abs(localRange-r)<0.05?color+"66":"transparent"}` }}>
                            {r}×
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* Bottom info + scale editor */}
          <div className="px-3 py-2 border-t text-xs space-y-1.5" style={{ borderColor: "#2e3340" }}>
            {plan.format && <p className="text-gray-500">Formato: <span className="text-gray-300">{plan.format.toUpperCase()}</span></p>}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500">Escala:</span>
              {editingScale ? (
                <form
                  className="flex items-center gap-1 flex-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const val = scaleInput.trim();
                    if (val) {
                      updatePlan.mutate({ id: planId, scale: val });
                    }
                    setEditingScale(false);
                  }}
                >
                  <input
                    autoFocus
                    value={scaleInput}
                    onChange={(e) => setScaleInput(e.target.value)}
                    placeholder="ej: 1:100"
                    className="flex-1 min-w-0 px-1.5 py-0.5 rounded text-xs text-white"
                    style={{ background: "#1a1d23", border: "1px solid #3b82f6", outline: "none" }}
                    onKeyDown={(e) => e.key === "Escape" && setEditingScale(false)}
                  />
                  <button type="submit" className="text-[10px] px-1.5 py-0.5 rounded text-white" style={{ background: "#3b82f6" }}>OK</button>
                  <button type="button" onClick={() => setEditingScale(false)} className="text-[10px] px-1.5 py-0.5 rounded text-gray-400" style={{ background: "#2e3340" }}>✕</button>
                </form>
              ) : (
                <button
                  onClick={() => { setScaleInput(plan.scale ?? "1:100"); setEditingScale(true); }}
                  className="text-gray-300 hover:text-blue-400 transition-colors flex items-center gap-1 group"
                  title="Editar escala del plano"
                >
                  <span>{plan.scale ?? <span className="text-gray-600 italic">sin escala</span>}</span>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <path d="M1 9L7 3M7 3H4M7 3V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
            {plan.scale && parseScaleRatio(plan.scale) && (
              <p className="text-gray-600">1 px ≈ {formatMeters((0.0254 / 72) * (parseScaleRatio(plan.scale) ?? 1))} en plano</p>
            )}
          </div>
        </div>
      </div>

      <AnnotationLabelDialog
        open={labelDialogOpen}
        onConfirm={handleLabelConfirm}
        onCancel={handleLabelCancel}
        defaultLabel={
          BUILTIN_MARKERS.find((m) => m.type === pendingAnnotation?.type)?.label ??
          (layers as Layer[]).find((l) => `layer_${l.id}` === selectedTool)?.label ?? ""
        }
      />

      <UtpCableDialog
        open={utpDialogOpen}
        color={utpColor}
        category={utpCategory}
        estimatedLength={(() => {
          if (!utpPending) return undefined;
          const pxLen = Math.sqrt((utpPending.x2 - utpPending.x1) ** 2 + (utpPending.y2 - utpPending.y1) ** 2);
          const containerPx = contentRef.current ? { w: contentRef.current.offsetWidth, h: contentRef.current.offsetHeight } : null;
          const meters = calcUtpLengthMeters(pxLen, pdfDims, containerPx, plan.scale);
          return meters != null ? formatMeters(meters) : undefined;
        })()}
        onColorChange={setUtpColor}
        onCategoryChange={setUtpCategory}
        onConfirm={handleUtpConfirm}
        onCancel={handleUtpCancel}
      />

      <UtpNodeDialog
        open={utpNodeDialogOpen}
        color={utpColor}
        category={utpCategory}
        horizontalMeters={(() => {
          if (!utpNodePending) return null;
          const pxLen = Math.sqrt((utpNodePending.x2 - utpNodePending.x1) ** 2 + (utpNodePending.y2 - utpNodePending.y1) ** 2);
          const containerPx = contentRef.current ? { w: contentRef.current.offsetWidth, h: contentRef.current.offsetHeight } : null;
          return calcUtpLengthMeters(pxLen, pdfDims, containerPx, plan.scale);
        })()}
        onColorChange={setUtpColor}
        onCategoryChange={setUtpCategory}
        onConfirm={handleUtpNodeConfirm}
        onCancel={handleUtpNodeCancel}
      />
    </>
  );
}

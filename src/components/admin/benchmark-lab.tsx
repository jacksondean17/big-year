"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

export interface LabChallenge {
  id: number;
  title: string;
  btScore: number;
  wins: number;
  losses: number;
  winRate: number;
  avgTimeMs: number | null;
  points: number | null;
  isBenchmark: boolean;
  benchmarkPoints: number | null;
}

interface Props {
  challenges: LabChallenge[];
}

const STORAGE_KEY = "benchmark-lab-overrides-v1";
const TOP_PERCENTILE_CLAMP = 0.98;

function interpolate(
  lnTheta: number,
  anchors: { lnTheta: number; points: number }[]
): number | null {
  if (anchors.length === 0) return null;
  if (anchors.length === 1) return anchors[0].points;
  const sorted = [...anchors].sort((a, b) => a.lnTheta - b.lnTheta);

  // Below range: extrapolate along first segment
  if (lnTheta <= sorted[0].lnTheta) {
    const [a, b] = sorted;
    const slope = (b.points - a.points) / (b.lnTheta - a.lnTheta);
    return a.points + slope * (lnTheta - a.lnTheta);
  }
  // Above range: extrapolate along last segment
  if (lnTheta >= sorted[sorted.length - 1].lnTheta) {
    const a = sorted[sorted.length - 2];
    const b = sorted[sorted.length - 1];
    const slope = (b.points - a.points) / (b.lnTheta - a.lnTheta);
    return b.points + slope * (lnTheta - b.lnTheta);
  }
  // In range: find bracket
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (lnTheta >= a.lnTheta && lnTheta <= b.lnTheta) {
      const t = (lnTheta - a.lnTheta) / (b.lnTheta - a.lnTheta);
      return a.points + t * (b.points - a.points);
    }
  }
  return null;
}

export function BenchmarkLab({ challenges }: Props) {
  // Session overrides: map from challenge id to entered Bench Pts.
  // Seeded from DB benchmark_points for existing benchmarks.
  const [overrides, setOverrides] = useState<Record<number, number>>(() => {
    const seed: Record<number, number> = {};
    for (const c of challenges) {
      if (c.benchmarkPoints != null) seed[c.id] = c.benchmarkPoints;
    }
    return seed;
  });
  const [hydrated, setHydrated] = useState(false);
  // Hide challenges with too few comparisons so noisy items don't anchor or distort the curve.
  const [minComparisons, setMinComparisons] = useState(0);

  const visibleChallenges = useMemo(
    () => challenges.filter((c) => c.wins + c.losses >= minComparisons),
    [challenges, minComparisons]
  );

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, number>;
        const restored: Record<number, number> = {};
        for (const [k, v] of Object.entries(parsed)) {
          const n = Number(v);
          if (Number.isFinite(n)) restored[Number(k)] = n;
        }
        setOverrides(restored);
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  // Persist on change
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    } catch {
      // ignore quota errors
    }
  }, [overrides, hydrated]);

  const anchors = useMemo(() => {
    const list: { lnTheta: number; points: number }[] = [];
    for (const c of visibleChallenges) {
      const v = overrides[c.id];
      if (v != null && Number.isFinite(v)) {
        list.push({ lnTheta: Math.log(c.btScore), points: v });
      }
    }
    return list;
  }, [overrides, visibleChallenges]);

  const projected = useMemo(() => {
    const m = new Map<number, number | null>();
    for (const c of visibleChallenges) {
      const override = overrides[c.id];
      if (override != null && Number.isFinite(override)) {
        m.set(c.id, override);
        continue;
      }
      const raw = interpolate(Math.log(c.btScore), anchors);
      if (raw == null) {
        m.set(c.id, null);
      } else {
        // Clamp projected to >= 1 so we don't show silly negatives
        m.set(c.id, Math.max(1, Math.round(raw)));
      }
    }
    return m;
  }, [visibleChallenges, anchors, overrides]);

  const handleInput = (id: number, raw: string) => {
    if (raw.trim() === "") {
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    setOverrides((prev) => ({ ...prev, [id]: n }));
  };

  const handleReset = () => {
    if (
      !confirm(
        "Clear all session Bench Pts? This will also wipe the seed from DB benchmark_points."
      )
    )
      return;
    setOverrides({});
  };

  const handleReseedFromDb = () => {
    const seed: Record<number, number> = {};
    for (const c of challenges) {
      if (c.benchmarkPoints != null) seed[c.id] = c.benchmarkPoints;
    }
    setOverrides(seed);
  };

  const handleCopySql = async () => {
    const lines: string[] = [];
    lines.push(
      "-- Benchmark updates generated from admin/rankings Benchmark Lab"
    );
    lines.push("-- Review carefully before running against prod!");
    lines.push("BEGIN;");
    lines.push("UPDATE challenges SET is_benchmark=false, benchmark_points=NULL WHERE is_benchmark=true;");
    let exported = 0;
    for (const c of visibleChallenges) {
      const v = overrides[c.id];
      if (v == null) continue;
      const title = c.title.replace(/'/g, "''");
      lines.push(
        `UPDATE challenges SET is_benchmark=true, benchmark_points=${Math.round(v)} WHERE id=${c.id}; -- ${title}`
      );
      exported++;
    }
    lines.push("COMMIT;");
    const sql = lines.join("\n");
    try {
      await navigator.clipboard.writeText(sql);
      alert(`Copied ${exported} UPDATE statements to clipboard.`);
    } catch {
      // Fallback: show in a prompt so user can copy manually
      prompt("Copy this SQL:", sql);
    }
  };

  const anchorCount = Object.keys(overrides).length;

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Benchmark Lab</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fill the <strong>Bench Pts</strong> column for a few challenges
            (the anchors) — the rest get piecewise-linear point projections
            live. Nothing saves until you run the generated SQL.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            Min comparisons
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={minComparisons}
              onChange={(e) => {
                const n = Number(e.target.value);
                setMinComparisons(Number.isFinite(n) && n >= 0 ? n : 0);
              }}
              className="w-14 rounded border bg-background px-2 py-0.5 text-right text-sm font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <span className="font-mono text-muted-foreground/70">
              {visibleChallenges.length}/{challenges.length}
            </span>
          </label>
          <Button size="sm" variant="outline" onClick={handleReseedFromDb}>
            Re-seed from DB
          </Button>
          <Button size="sm" variant="outline" onClick={handleReset}>
            Clear all
          </Button>
          <Button size="sm" onClick={handleCopySql} disabled={anchorCount === 0}>
            Copy SQL ({anchorCount})
          </Button>
        </div>
      </div>

      {/* Curve chart */}
      <CurveChart
        challenges={visibleChallenges}
        projected={projected}
        overrides={overrides}
      />

      {/* Old vs new points scatter */}
      <OldVsNewScatter challenges={visibleChallenges} projected={projected} overrides={overrides} />

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">Challenge</th>
              <th className="px-3 py-2 font-medium text-right">ln(θ)</th>
              <th className="px-3 py-2 font-medium text-right">W</th>
              <th className="px-3 py-2 font-medium text-right">L</th>
              <th className="px-3 py-2 font-medium text-right">Pts</th>
              <th className="px-3 py-2 font-medium text-right">Bench Pts</th>
              <th className="px-3 py-2 font-medium text-right">Projected</th>
              <th className="px-3 py-2 font-medium text-right">Δ</th>
            </tr>
          </thead>
          <tbody>
            {visibleChallenges.map((c, i) => {
              const hasOverride = overrides[c.id] != null;
              const projectedVal = projected.get(c.id);
              const delta =
                projectedVal != null && c.points != null
                  ? projectedVal - c.points
                  : null;
              return (
                <tr
                  key={c.id}
                  className={
                    hasOverride
                      ? "bg-amber-500/15 border-l-2 border-amber-500"
                      : c.isBenchmark
                      ? "bg-amber-500/5"
                      : i % 2 === 0
                      ? "bg-card"
                      : "bg-muted/20"
                  }
                >
                  <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-1.5 text-muted-foreground font-mono text-xs">
                    {c.id}
                  </td>
                  <td className="px-3 py-1.5 font-medium">
                    {hasOverride && (
                      <span className="inline-block mr-1.5 text-amber-600" title="Anchor">
                        ★
                      </span>
                    )}
                    {c.title}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono">
                    {Math.log(c.btScore).toFixed(2)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-green-600">{c.wins}</td>
                  <td className="px-3 py-1.5 text-right text-red-600">{c.losses}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">
                    {c.points ?? "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={overrides[c.id] ?? ""}
                      onChange={(e) => handleInput(c.id, e.target.value)}
                      placeholder="—"
                      className="w-16 rounded border bg-background px-2 py-0.5 text-right text-sm font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold">
                    {projectedVal != null ? projectedVal : "—"}
                  </td>
                  <td
                    className={`px-3 py-1.5 text-right font-mono text-xs ${
                      delta == null
                        ? "text-muted-foreground"
                        : delta > 0
                        ? "text-green-600"
                        : delta < 0
                        ? "text-red-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {delta == null ? "—" : delta > 0 ? `+${delta}` : delta}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CurveChart({
  challenges,
  projected,
  overrides,
}: {
  challenges: LabChallenge[];
  projected: Map<number, number | null>;
  overrides: Record<number, number>;
}) {
  const W = 800;
  const H = 280;
  const PAD = { top: 20, right: 20, bottom: 40, left: 50 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const points = challenges
    .map((c) => ({
      id: c.id,
      title: c.title,
      lnTheta: Math.log(c.btScore),
      projected: projected.get(c.id),
      isAnchor: overrides[c.id] != null,
    }))
    .filter((p) => p.projected != null) as {
    id: number;
    title: string;
    lnTheta: number;
    projected: number;
    isAnchor: boolean;
  }[];

  if (points.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        Enter a Bench Pts value on a few rows to preview the mapping curve.
      </div>
    );
  }

  const lnThetas = points.map((p) => p.lnTheta);
  const pts = points.map((p) => p.projected);
  // Clamp y-axis upper at 98th percentile so one absurd anchor doesn't squash the rest
  const sortedPts = [...pts].sort((a, b) => a - b);
  const yMaxIdx = Math.floor(sortedPts.length * TOP_PERCENTILE_CLAMP);
  const yMin = Math.min(0, sortedPts[0]);
  const yMax = Math.max(sortedPts[yMaxIdx] ?? sortedPts[sortedPts.length - 1], 1);
  const xMin = Math.min(...lnThetas);
  const xMax = Math.max(...lnThetas);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const toX = (lt: number) => PAD.left + ((lt - xMin) / xRange) * plotW;
  const toY = (p: number) => PAD.top + plotH - ((p - yMin) / yRange) * plotH;

  const yTicks: number[] = [];
  const yStep = yMax - yMin <= 20 ? 5 : yMax - yMin <= 100 ? 20 : 50;
  for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax; v += yStep)
    yTicks.push(v);

  return (
    <div className="rounded-lg border bg-card p-4 overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full max-w-3xl"
        style={{ minWidth: 400 }}
      >
        {yTicks.map((v) => {
          const y = toY(v);
          return (
            <g key={`y-${v}`}>
              <line
                x1={PAD.left}
                y1={y}
                x2={W - PAD.right}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
              />
              <text
                x={PAD.left - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={10}
                fill="currentColor"
                opacity={0.5}
              >
                {v}
              </text>
            </g>
          );
        })}
        {/* Non-anchor points */}
        {points
          .filter((p) => !p.isAnchor)
          .map((p) => (
            <circle
              key={`p-${p.id}`}
              cx={toX(p.lnTheta)}
              cy={toY(p.projected)}
              r={2.5}
              fill="hsl(210, 40%, 55%)"
              opacity={0.55}
            >
              <title suppressHydrationWarning>
                {p.title} — ln(θ)={p.lnTheta.toFixed(2)} pts={p.projected}
              </title>
            </circle>
          ))}
        {/* Anchor points on top */}
        {points
          .filter((p) => p.isAnchor)
          .map((p) => (
            <circle
              key={`a-${p.id}`}
              cx={toX(p.lnTheta)}
              cy={toY(p.projected)}
              r={5}
              fill="hsl(35, 95%, 55%)"
              stroke="hsl(35, 95%, 30%)"
              strokeWidth={1.5}
            >
              <title suppressHydrationWarning>
                {p.title} — ln(θ)={p.lnTheta.toFixed(2)} pts={p.projected} (anchor)
              </title>
            </circle>
          ))}
        <text
          x={PAD.left - 6}
          y={12}
          textAnchor="end"
          fontSize={10}
          fill="currentColor"
          opacity={0.6}
        >
          Points
        </text>
        <text
          x={W / 2}
          y={H - 2}
          textAnchor="middle"
          fontSize={10}
          fill="currentColor"
          opacity={0.6}
        >
          ln(θ)
        </text>
      </svg>
    </div>
  );
}

function OldVsNewScatter({
  challenges,
  projected,
  overrides,
}: {
  challenges: LabChallenge[];
  projected: Map<number, number | null>;
  overrides: Record<number, number>;
}) {
  const W = 800;
  const H = 320;
  const PAD = { top: 20, right: 20, bottom: 40, left: 50 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const points = challenges
    .map((c) => {
      const np = projected.get(c.id);
      if (np == null || c.points == null) return null;
      return {
        id: c.id,
        title: c.title,
        oldPts: c.points,
        newPts: np,
        isAnchor: overrides[c.id] != null,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p != null);

  if (points.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        Need both current points and a projection to plot — set some anchors first.
      </div>
    );
  }

  const oldVals = points.map((p) => p.oldPts);
  const newVals = points.map((p) => p.newPts);
  const xLo = Math.min(0, ...oldVals);
  const xHi = Math.max(...oldVals, 1);
  const yLo = Math.min(0, ...newVals);
  const yHi = Math.max(...newVals, 1);
  const xRange = xHi - xLo || 1;
  const yRange = yHi - yLo || 1;

  const toX = (v: number) => PAD.left + ((v - xLo) / xRange) * plotW;
  const toY = (v: number) => PAD.top + plotH - ((v - yLo) / yRange) * plotH;

  const tickStep = (lo: number, hi: number) =>
    hi - lo <= 20 ? 5 : hi - lo <= 100 ? 20 : 50;
  const xStep = tickStep(xLo, xHi);
  const yStep = tickStep(yLo, yHi);
  const xTicks: number[] = [];
  for (let v = Math.ceil(xLo / xStep) * xStep; v <= xHi; v += xStep) xTicks.push(v);
  const yTicks: number[] = [];
  for (let v = Math.ceil(yLo / yStep) * yStep; v <= yHi; v += yStep) yTicks.push(v);

  // y=x reference: clip to the visible square where both axes cover the value
  const diagLo = Math.max(xLo, yLo);
  const diagHi = Math.min(xHi, yHi);

  return (
    <section>
      <h4 className="text-sm font-semibold mb-1">
        Old points vs Projected points
      </h4>
      <p className="text-xs text-muted-foreground mb-2">
        Diagonal = no change. Above = projection inflates, below = deflates.
      </p>
      <div className="rounded-lg border bg-card p-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full max-w-3xl"
          style={{ minWidth: 400 }}
        >
          {/* X grid + ticks */}
          {xTicks.map((v) => (
            <g key={`xt-${v}`}>
              <line
                x1={toX(v)}
                y1={PAD.top}
                x2={toX(v)}
                y2={PAD.top + plotH}
                stroke="currentColor"
                strokeOpacity={0.06}
              />
              <text
                x={toX(v)}
                y={H - 22}
                textAnchor="middle"
                fontSize={10}
                fill="currentColor"
                opacity={0.5}
              >
                {v}
              </text>
            </g>
          ))}
          {/* Y grid + ticks */}
          {yTicks.map((v) => (
            <g key={`yt-${v}`}>
              <line
                x1={PAD.left}
                y1={toY(v)}
                x2={PAD.left + plotW}
                y2={toY(v)}
                stroke="currentColor"
                strokeOpacity={0.06}
              />
              <text
                x={PAD.left - 6}
                y={toY(v) + 4}
                textAnchor="end"
                fontSize={10}
                fill="currentColor"
                opacity={0.5}
              >
                {v}
              </text>
            </g>
          ))}
          {/* y = x reference line (clipped to where both axes overlap) */}
          {diagHi > diagLo && (
            <line
              x1={toX(diagLo)}
              y1={toY(diagLo)}
              x2={toX(diagHi)}
              y2={toY(diagHi)}
              stroke="currentColor"
              strokeOpacity={0.3}
              strokeDasharray="4 4"
            />
          )}
          {/* Points */}
          {points
            .filter((p) => !p.isAnchor)
            .map((p) => (
              <circle
                key={`p-${p.id}`}
                cx={toX(p.oldPts)}
                cy={toY(p.newPts)}
                r={3}
                fill="hsl(210, 50%, 55%)"
                opacity={0.55}
              >
                <title suppressHydrationWarning>
                  {p.title} — old={p.oldPts}, new={p.newPts} (Δ {p.newPts - p.oldPts > 0 ? "+" : ""}{p.newPts - p.oldPts})
                </title>
              </circle>
            ))}
          {points
            .filter((p) => p.isAnchor)
            .map((p) => (
              <circle
                key={`a-${p.id}`}
                cx={toX(p.oldPts)}
                cy={toY(p.newPts)}
                r={5}
                fill="hsl(35, 95%, 55%)"
                stroke="hsl(35, 95%, 30%)"
                strokeWidth={1.5}
              >
                <title suppressHydrationWarning>
                  {p.title} — old={p.oldPts}, new={p.newPts} (anchor)
                </title>
              </circle>
            ))}
          {/* Axis labels */}
          <text
            x={PAD.left - 6}
            y={12}
            textAnchor="end"
            fontSize={10}
            fill="currentColor"
            opacity={0.6}
          >
            New (projected)
          </text>
          <text
            x={W / 2}
            y={H - 4}
            textAnchor="middle"
            fontSize={10}
            fill="currentColor"
            opacity={0.6}
          >
            Old (current points)
          </text>
        </svg>
      </div>
    </section>
  );
}

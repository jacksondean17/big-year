"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  interpolate,
  effectiveLnTheta,
  type Anchor,
} from "@/lib/benchmark-mapping";
import {
  setBenchmark,
  setRankOverride,
  commitBenchmarkMapping,
} from "@/app/actions/admin-benchmark";

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
  lnThetaOverride: number | null;
  mappedPoints: number | null;
}

interface Props {
  challenges: LabChallenge[];
}

const TOP_PERCENTILE_CLAMP = 0.98;

export function BenchmarkLab({ challenges }: Props) {
  // Seeds from DB. `saved*` track the last-known DB state so we can diff
  // against the editable state and know what's dirty.
  const seedBench = useMemo(() => {
    const seed: Record<number, number> = {};
    for (const c of challenges) {
      if (c.benchmarkPoints != null) seed[c.id] = c.benchmarkPoints;
    }
    return seed;
  }, [challenges]);
  const seedRank = useMemo(() => {
    const seed: Record<number, number> = {};
    for (const c of challenges) {
      if (c.lnThetaOverride != null) seed[c.id] = c.lnThetaOverride;
    }
    return seed;
  }, [challenges]);

  const [overrides, setOverrides] = useState<Record<number, number>>(seedBench);
  const [rankOverrides, setRankOverridesState] = useState<
    Record<number, number>
  >(seedRank);
  const [savedBench, setSavedBench] = useState<Record<number, number>>(seedBench);
  const [savedRank, setSavedRank] = useState<Record<number, number>>(seedRank);

  const [minComparisons, setMinComparisons] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSavingEdits, startSaveEdits] = useTransition();
  const [isCommitting, startCommit] = useTransition();

  const visibleChallenges = useMemo(
    () => challenges.filter((c) => c.wins + c.losses >= minComparisons),
    [challenges, minComparisons]
  );

  // Effective ln(θ): override if set, else ln(BT score)
  const effectiveLn = (c: LabChallenge): number =>
    effectiveLnTheta(c.btScore, rankOverrides[c.id] ?? null);

  // Sort visible challenges by effective ln(θ) descending so the table reflects the active mapping rank
  const sortedVisible = useMemo(
    () => [...visibleChallenges].sort((a, b) => effectiveLn(b) - effectiveLn(a)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleChallenges, rankOverrides]
  );

  const anchors = useMemo<Anchor[]>(() => {
    const list: Anchor[] = [];
    for (const c of visibleChallenges) {
      const v = overrides[c.id];
      if (v != null && Number.isFinite(v)) {
        list.push({ lnTheta: effectiveLn(c), points: v });
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrides, visibleChallenges, rankOverrides]);

  const projected = useMemo(() => {
    const m = new Map<number, number | null>();
    for (const c of visibleChallenges) {
      const benchOverride = overrides[c.id];
      if (benchOverride != null && Number.isFinite(benchOverride)) {
        m.set(c.id, benchOverride);
        continue;
      }
      const raw = interpolate(effectiveLn(c), anchors);
      if (raw == null) {
        m.set(c.id, null);
      } else {
        m.set(c.id, Math.max(1, Math.round(raw)));
      }
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleChallenges, anchors, overrides, rankOverrides]);

  const handleBenchInput = (id: number, raw: string) => {
    const trimmed = raw.trim();
    const isClear = trimmed === "";
    const n = isClear ? null : Number(trimmed);
    if (!isClear && (n == null || !Number.isFinite(n))) return;

    setOverrides((curr) => {
      const next = { ...curr };
      if (n == null) delete next[id];
      else next[id] = n;
      return next;
    });
  };

  const handleRankInput = (id: number, raw: string) => {
    const trimmed = raw.trim();
    const isClear = trimmed === "";
    const n = isClear ? null : Number(trimmed);
    if (!isClear && (n == null || !Number.isFinite(n))) return;

    setRankOverridesState((curr) => {
      const next = { ...curr };
      if (n == null) delete next[id];
      else next[id] = n;
      return next;
    });
  };

  // Diff local edits vs last-known DB state → list of changes to send
  const pendingBenchChanges = useMemo(() => {
    const ids = new Set([
      ...Object.keys(overrides).map(Number),
      ...Object.keys(savedBench).map(Number),
    ]);
    const changes: { id: number; points: number | null }[] = [];
    for (const id of ids) {
      const cur = overrides[id];
      const prev = savedBench[id];
      if (cur == null && prev == null) continue;
      if (cur != null && prev != null && cur === prev) continue;
      changes.push({ id, points: cur ?? null });
    }
    return changes;
  }, [overrides, savedBench]);

  const pendingRankChanges = useMemo(() => {
    const ids = new Set([
      ...Object.keys(rankOverrides).map(Number),
      ...Object.keys(savedRank).map(Number),
    ]);
    const changes: { id: number; lnTheta: number | null }[] = [];
    for (const id of ids) {
      const cur = rankOverrides[id];
      const prev = savedRank[id];
      if (cur == null && prev == null) continue;
      if (cur != null && prev != null && cur === prev) continue;
      changes.push({ id, lnTheta: cur ?? null });
    }
    return changes;
  }, [rankOverrides, savedRank]);

  const pendingEditCount = pendingBenchChanges.length + pendingRankChanges.length;

  const handleCommitEdits = () => {
    if (pendingEditCount === 0) return;
    setStatusMessage(null);
    startSaveEdits(async () => {
      const benchResults = await Promise.all(
        pendingBenchChanges.map((e) => setBenchmark(e.id, e.points))
      );
      const rankResults = await Promise.all(
        pendingRankChanges.map((e) => setRankOverride(e.id, e.lnTheta))
      );

      const failures: string[] = [];
      benchResults.forEach((r, i) => {
        if (!r.success)
          failures.push(
            `Bench id=${pendingBenchChanges[i].id}: ${r.error ?? "unknown"}`
          );
      });
      rankResults.forEach((r, i) => {
        if (!r.success)
          failures.push(
            `Rank id=${pendingRankChanges[i].id}: ${r.error ?? "unknown"}`
          );
      });

      // Baseline absorbs successful writes only; failed rows stay dirty.
      setSavedBench((curr) => {
        const next = { ...curr };
        benchResults.forEach((r, i) => {
          if (!r.success) return;
          const { id, points } = pendingBenchChanges[i];
          if (points == null) delete next[id];
          else next[id] = points;
        });
        return next;
      });
      setSavedRank((curr) => {
        const next = { ...curr };
        rankResults.forEach((r, i) => {
          if (!r.success) return;
          const { id, lnTheta } = pendingRankChanges[i];
          if (lnTheta == null) delete next[id];
          else next[id] = lnTheta;
        });
        return next;
      });

      if (failures.length === 0) {
        setStatusMessage(
          `Saved ${benchResults.length} bench + ${rankResults.length} rank edits.`
        );
      } else {
        setStatusMessage(
          `Saved with ${failures.length} failure(s): ${failures.slice(0, 3).join("; ")}${failures.length > 3 ? "…" : ""}`
        );
      }
    });
  };

  const handleDiscardEdits = () => {
    setOverrides(savedBench);
    setRankOverridesState(savedRank);
    setStatusMessage(null);
  };

  const handleCommitMapping = () => {
    setStatusMessage(null);
    startCommit(() => {
      commitBenchmarkMapping().then((res) => {
        if (res.success) {
          setStatusMessage(
            `Committed ${res.updated ?? 0} rows. Refresh to see updated Mapped column.`
          );
        } else {
          setStatusMessage(`Commit failed: ${res.error ?? "unknown error"}`);
        }
      });
    });
  };

  const anchorCount = Object.keys(overrides).length;

  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Benchmark Lab</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Set <strong>Bench Pts</strong> on a few challenges (anchors) — the
            rest get piecewise-linear point projections live. Use{" "}
            <strong>Manual ln(θ)</strong> to override a row&apos;s rank position
            for mapping. Edits stay local until you click{" "}
            <strong>Commit to Database</strong>. Then{" "}
            <strong>Commit mapping</strong> snapshots the projected values into{" "}
            <code>mapped_points</code>.
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
          <Button
            size="sm"
            variant="outline"
            onClick={handleDiscardEdits}
            disabled={isSavingEdits || pendingEditCount === 0}
          >
            Discard edits
          </Button>
          <Button
            size="sm"
            onClick={handleCommitEdits}
            disabled={isSavingEdits || pendingEditCount === 0}
          >
            {isSavingEdits
              ? "Saving…"
              : `Commit to Database${pendingEditCount > 0 ? ` (${pendingEditCount})` : ""}`}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCommitMapping}
            disabled={isCommitting || anchorCount === 0}
          >
            {isCommitting ? "Committing…" : `Commit mapping (${anchorCount})`}
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
          {statusMessage}
        </div>
      )}

      {/* Curve chart */}
      <CurveChart
        challenges={sortedVisible}
        projected={projected}
        overrides={overrides}
        effectiveLn={effectiveLn}
      />

      {/* Old vs new points scatter */}
      <OldVsNewScatter
        challenges={sortedVisible}
        projected={projected}
        overrides={overrides}
      />

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-3 py-2 font-medium">#</th>
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">Challenge</th>
              <th className="px-3 py-2 font-medium text-right">ln(θ)</th>
              <th className="px-3 py-2 font-medium text-right">Manual ln(θ)</th>
              <th className="px-3 py-2 font-medium text-right">W</th>
              <th className="px-3 py-2 font-medium text-right">L</th>
              <th className="px-3 py-2 font-medium text-right">Pts</th>
              <th className="px-3 py-2 font-medium text-right">Bench Pts</th>
              <th className="px-3 py-2 font-medium text-right">Projected</th>
              <th className="px-3 py-2 font-medium text-right">Mapped</th>
              <th className="px-3 py-2 font-medium text-right">Δ</th>
            </tr>
          </thead>
          <tbody>
            {sortedVisible.map((c, i) => {
              const hasOverride = overrides[c.id] != null;
              const hasRankOverride = rankOverrides[c.id] != null;
              const benchDirty = (overrides[c.id] ?? null) !== (savedBench[c.id] ?? null);
              const rankDirty = (rankOverrides[c.id] ?? null) !== (savedRank[c.id] ?? null);
              const projectedVal = projected.get(c.id);
              const delta =
                projectedVal != null && c.points != null
                  ? projectedVal - c.points
                  : null;
              const lnTheta = Math.log(c.btScore);
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
                      <span
                        className="inline-block mr-1.5 text-amber-600"
                        title="Anchor"
                      >
                        ★
                      </span>
                    )}
                    {c.title}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono">
                    {lnTheta.toFixed(2)}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={rankOverrides[c.id] ?? ""}
                      onChange={(e) => handleRankInput(c.id, e.target.value)}
                      placeholder="—"
                      className={`w-16 rounded border bg-background px-2 py-0.5 text-right text-sm font-mono focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                        rankDirty
                          ? "border-sky-500 bg-sky-500/10"
                          : hasRankOverride
                          ? "border-sky-500/50"
                          : ""
                      }`}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right text-green-600">
                    {c.wins}
                  </td>
                  <td className="px-3 py-1.5 text-right text-red-600">
                    {c.losses}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">
                    {c.points ?? "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={overrides[c.id] ?? ""}
                      onChange={(e) => handleBenchInput(c.id, e.target.value)}
                      placeholder="—"
                      className={`w-16 rounded border bg-background px-2 py-0.5 text-right text-sm font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 ${
                        benchDirty ? "border-amber-500 bg-amber-500/10" : ""
                      }`}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold">
                    {projectedVal != null ? projectedVal : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">
                    {c.mappedPoints ?? "—"}
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
  effectiveLn,
}: {
  challenges: LabChallenge[];
  projected: Map<number, number | null>;
  overrides: Record<number, number>;
  effectiveLn: (c: LabChallenge) => number;
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
      lnTheta: effectiveLn(c),
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

"use client";

export function DecisionTimeChart({
  data,
  profiles,
}: {
  data: { index: number; timeMs: number; userId: string }[];
  profiles: Record<string, string>;
}) {
  const W = 800;
  const H = 320;
  const PAD = { top: 20, right: 20, bottom: 40, left: 60 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const cappedData = data.map((d) => ({
    ...d,
    timeSec: Math.min(d.timeMs / 1000, 60),
    judge: profiles[d.userId] ?? "Unknown",
  }));
  const maxTime = Math.ceil(Math.max(...cappedData.map((d) => d.timeSec)));
  const yRange = maxTime || 1;
  const maxIndex = data[data.length - 1].index;

  const points = cappedData.map((d) => ({
    x: PAD.left + ((d.index - 1) / (maxIndex - 1 || 1)) * plotW,
    y: PAD.top + plotH - (d.timeSec / yRange) * plotH,
    index: d.index,
    timeSec: d.timeSec,
    originalMs: d.timeMs,
    judge: d.judge,
  }));

  const yStep = maxTime <= 10 ? 2 : maxTime <= 30 ? 5 : 10;
  const yTicks: number[] = [];
  for (let v = 0; v <= maxTime; v += yStep) yTicks.push(v);

  const xTickInterval = Math.max(1, Math.floor(maxIndex / 10));
  const xTicks: number[] = [];
  for (let i = 1; i <= maxIndex; i += xTickInterval) xTicks.push(i);
  if (xTicks[xTicks.length - 1] !== maxIndex) xTicks.push(maxIndex);

  return (
    <section>
      <h3 className="text-lg font-semibold mb-1">Decision Time vs Comparison #</h3>
      <p className="text-xs text-muted-foreground mb-3">
        How long each comparison took (capped at 60s) — chronological order across all judges
      </p>
      <div className="rounded-lg border bg-card p-4 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-3xl" style={{ minWidth: 400 }}>
          {yTicks.map((v) => {
            const y = PAD.top + plotH - (v / yRange) * plotH;
            return (
              <g key={`y-${v}`}>
                <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="currentColor" strokeOpacity={0.1} />
                <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill="currentColor" opacity={0.5}>
                  {v}s
                </text>
              </g>
            );
          })}

          {xTicks.map((idx) => {
            const x = PAD.left + ((idx - 1) / (maxIndex - 1 || 1)) * plotW;
            return (
              <text key={`x-${idx}`} x={x} y={H - 8} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.5}>
                {idx}
              </text>
            );
          })}

          <text x={PAD.left - 8} y={12} textAnchor="end" fontSize={11} fill="currentColor" opacity={0.6}>
            Time
          </text>
          <text x={W / 2} y={H - 0} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.6}>
            Comparison #
          </text>

          {points.map((p) => (
            <circle
              key={p.index}
              cx={p.x}
              cy={p.y}
              r={data.length > 200 ? 2 : 3}
              fill="hsl(200, 70%, 55%)"
              opacity={0.7}
            >
              <title>
                #{p.index} — {(p.originalMs / 1000).toFixed(1)}s — {p.judge}
              </title>
            </circle>
          ))}
        </svg>
      </div>
    </section>
  );
}

export function BtChart({
  challenges,
}: {
  challenges: { id: number; title: string; btScore: number }[];
}) {
  const W = 800;
  const H = 320;
  const PAD = { top: 20, right: 20, bottom: 40, left: 60 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const logScores = challenges.map((c) => Math.log(c.btScore));
  const minLog = Math.floor(Math.min(...logScores));
  const maxLog = Math.ceil(Math.max(...logScores));
  const yRange = maxLog - minLog || 1;

  const points = challenges.map((c, i) => ({
    x: PAD.left + (i / (challenges.length - 1 || 1)) * plotW,
    y: PAD.top + plotH - ((Math.log(c.btScore) - minLog) / yRange) * plotH,
    rank: i + 1,
    title: c.title,
    logScore: Math.log(c.btScore),
  }));

  const yTicks: number[] = [];
  const step = yRange <= 10 ? 1 : yRange <= 30 ? 5 : 10;
  for (let v = minLog; v <= maxLog; v += step) {
    yTicks.push(v);
  }

  const xTickInterval = Math.max(1, Math.floor(challenges.length / 10));
  const xTicks: number[] = [];
  for (let i = 0; i < challenges.length; i += xTickInterval) {
    xTicks.push(i);
  }
  if (xTicks[xTicks.length - 1] !== challenges.length - 1) {
    xTicks.push(challenges.length - 1);
  }

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <section>
      <h3 className="text-lg font-semibold mb-1">BT Score Distribution</h3>
      <p className="text-xs text-muted-foreground mb-3">
        ln(θ) by rank — a difference of 1 ≈ 73% win probability, 2 ≈ 88%, 3 ≈ 95%
      </p>
      <div className="rounded-lg border bg-card p-4 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-3xl" style={{ minWidth: 400 }}>
          {yTicks.map((v) => {
            const y = PAD.top + plotH - ((v - minLog) / yRange) * plotH;
            return (
              <g key={`y-${v}`}>
                <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="currentColor" strokeOpacity={0.1} />
                <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill="currentColor" opacity={0.5}>
                  {v}
                </text>
              </g>
            );
          })}

          {xTicks.map((i) => (
            <text key={`x-${i}`} x={points[i].x} y={H - 8} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.5}>
              #{i + 1}
            </text>
          ))}

          <text x={PAD.left - 8} y={12} textAnchor="end" fontSize={11} fill="currentColor" opacity={0.6}>
            ln(θ)
          </text>
          <text x={W / 2} y={H - 0} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.6}>
            Rank
          </text>

          <path d={pathD} fill="none" stroke="hsl(45, 80%, 55%)" strokeWidth={2} />

          {points.map((p) => (
            <circle
              key={p.rank}
              cx={p.x}
              cy={p.y}
              r={challenges.length > 80 ? 2 : 3}
              fill="hsl(45, 80%, 55%)"
            >
              <title>
                #{p.rank} {p.title} — ln(θ)={p.logScore.toFixed(2)}
              </title>
            </circle>
          ))}
        </svg>
      </div>
    </section>
  );
}

export function CompCountHistogram({ counts }: { counts: number[] }) {
  const W = 800;
  const H = 260;
  const PAD = { top: 20, right: 20, bottom: 40, left: 60 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const buckets: { label: string; min: number; max: number }[] = [
    { label: "0", min: 0, max: 0 },
    { label: "1–2", min: 1, max: 2 },
    { label: "3–5", min: 3, max: 5 },
    { label: "6–10", min: 6, max: 10 },
    { label: "11–20", min: 11, max: 20 },
    { label: "21–30", min: 21, max: 30 },
    { label: "31–50", min: 31, max: 50 },
    { label: "50+", min: 51, max: Infinity },
  ];
  const bucketCounts = buckets.map(
    (b) => counts.filter((c) => c >= b.min && c <= b.max).length
  );
  const maxBucket = Math.max(...bucketCounts, 1);

  const barWidth = plotW / buckets.length;

  return (
    <section>
      <h3 className="text-lg font-semibold mb-1">Comparisons per item</h3>
      <p className="text-xs text-muted-foreground mb-3">
        How many challenges have N comparisons — under-sampled buckets on the left should be small
      </p>
      <div className="rounded-lg border bg-card p-4 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-3xl" style={{ minWidth: 400 }}>
          {bucketCounts.map((n, i) => {
            const barH = (n / maxBucket) * plotH;
            const x = PAD.left + i * barWidth + barWidth * 0.15;
            const y = PAD.top + plotH - barH;
            const w = barWidth * 0.7;
            const isUnder = i < 3;
            return (
              <g key={buckets[i].label}>
                <rect x={x} y={y} width={w} height={barH} fill={isUnder ? "hsl(0, 70%, 55%)" : "hsl(45, 80%, 55%)"} opacity={0.8} />
                <text x={x + w / 2} y={y - 4} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.7}>
                  {n}
                </text>
                <text x={x + w / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.6}>
                  {buckets[i].label}
                </text>
              </g>
            );
          })}
          <text x={PAD.left - 8} y={12} textAnchor="end" fontSize={11} fill="currentColor" opacity={0.6}>
            # items
          </text>
          <text x={W / 2} y={H - 0} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.6}>
            Comparisons per item
          </text>
        </svg>
      </div>
    </section>
  );
}

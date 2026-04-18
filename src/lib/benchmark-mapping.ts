export interface Anchor {
  lnTheta: number;
  points: number;
}

export function interpolate(lnTheta: number, anchors: Anchor[]): number | null {
  if (anchors.length === 0) return null;
  if (anchors.length === 1) return anchors[0].points;
  const sorted = [...anchors].sort((a, b) => a.lnTheta - b.lnTheta);

  if (lnTheta <= sorted[0].lnTheta) {
    const [a, b] = sorted;
    const slope = (b.points - a.points) / (b.lnTheta - a.lnTheta);
    return a.points + slope * (lnTheta - a.lnTheta);
  }
  if (lnTheta >= sorted[sorted.length - 1].lnTheta) {
    const a = sorted[sorted.length - 2];
    const b = sorted[sorted.length - 1];
    const slope = (b.points - a.points) / (b.lnTheta - a.lnTheta);
    return b.points + slope * (lnTheta - b.lnTheta);
  }
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

export function effectiveLnTheta(
  btScore: number,
  override: number | null
): number {
  return override ?? Math.log(btScore);
}

export function projectPoints(
  btScore: number,
  override: number | null,
  anchors: Anchor[]
): number | null {
  const raw = interpolate(effectiveLnTheta(btScore, override), anchors);
  if (raw == null) return null;
  return Math.max(1, Math.round(raw));
}

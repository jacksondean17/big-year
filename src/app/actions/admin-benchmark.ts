"use server";

import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { computeBradleyTerry } from "@/lib/bradley-terry";
import {
  effectiveLnTheta,
  projectPoints,
  type Anchor,
} from "@/lib/benchmark-mapping";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase service role credentials");
  return createClient(url, key);
}

async function assertAdmin() {
  if (process.env.NODE_ENV === "development") return;
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const adminIds = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim());
  if (!user || !adminIds.includes(user.id)) {
    redirect("/");
  }
}

export async function setBenchmark(
  challengeId: number,
  points: number | null
): Promise<{ success: boolean; error?: string }> {
  await assertAdmin();
  const supabase = getServiceClient();

  const update =
    points == null
      ? { is_benchmark: false, benchmark_points: null }
      : { is_benchmark: true, benchmark_points: Math.round(points) };

  const { error } = await supabase
    .from("challenges")
    .update(update)
    .eq("id", challengeId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/rankings");
  return { success: true };
}

export async function setRankOverride(
  challengeId: number,
  lnTheta: number | null
): Promise<{ success: boolean; error?: string }> {
  await assertAdmin();
  const supabase = getServiceClient();

  const { error } = await supabase
    .from("challenges")
    .update({ ln_theta_override: lnTheta })
    .eq("id", challengeId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/rankings");
  return { success: true };
}

export async function commitBenchmarkMapping(): Promise<{
  success: boolean;
  updated?: number;
  error?: string;
}> {
  await assertAdmin();
  const supabase = getServiceClient();

  // Fetch all comparisons (paginated to avoid the 1000-row default cap)
  const comparisons: { winner_id: number; loser_id: number }[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("challenge_comparisons")
      .select("winner_id, loser_id")
      .range(from, from + pageSize - 1);
    if (error) return { success: false, error: error.message };
    if (!data || data.length === 0) break;
    comparisons.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  const bt = computeBradleyTerry(comparisons);

  const { data: challenges, error: chErr } = await supabase
    .from("challenges")
    .select("id, is_benchmark, benchmark_points, ln_theta_override");
  if (chErr) return { success: false, error: chErr.message };
  if (!challenges) return { success: false, error: "No challenges returned" };

  const anchors: Anchor[] = [];
  for (const c of challenges) {
    if (c.is_benchmark && c.benchmark_points != null) {
      const theta = bt.scores.get(c.id);
      if (theta == null) continue; // benchmark with no comparisons can't anchor
      anchors.push({
        lnTheta: effectiveLnTheta(theta, c.ln_theta_override),
        points: c.benchmark_points,
      });
    }
  }

  if (anchors.length === 0) {
    return { success: false, error: "No benchmarks configured" };
  }

  const rows = challenges.map((c) => {
    const theta = bt.scores.get(c.id);
    const mapped =
      theta == null ? null : projectPoints(theta, c.ln_theta_override, anchors);
    return { id: c.id, mapped_points: mapped };
  });

  const { error: upErr } = await supabase
    .from("challenges")
    .upsert(rows, { onConflict: "id" });
  if (upErr) return { success: false, error: upErr.message };

  revalidatePath("/admin/rankings");
  return { success: true, updated: rows.length };
}

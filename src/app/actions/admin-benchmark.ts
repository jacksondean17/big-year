"use server";

import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { recomputeAndCommitMapping } from "@/lib/benchmark-commit";

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
  const result = await recomputeAndCommitMapping();
  if (result.success) revalidatePath("/admin/rankings");
  return result;
}

"use server";

import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/lib/supabase/server";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase service role credentials");
  return createClient(url, key);
}

async function assertAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const adminIds = (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim());
  if (!user || !adminIds.includes(user.id)) {
    redirect("/");
  }
}

export async function createChallenge(formData: FormData) {
  await assertAdmin();
  const supabase = getServiceClient();

  const { error } = await supabase.from("challenges").insert({
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    estimated_time: formData.get("estimated_time") as string,
    completion_criteria: formData.get("completion_criteria") as string,
    category: formData.get("category") as string,
    depth: formData.get("depth") ? parseInt(formData.get("depth") as string) : null,
    courage: formData.get("courage") ? parseInt(formData.get("courage") as string) : null,
    story_power: formData.get("story_power") ? parseInt(formData.get("story_power") as string) : null,
    commitment: formData.get("commitment") ? parseInt(formData.get("commitment") as string) : null,
  });

  if (error) throw error;
  redirect("/admin");
}

export async function updateChallenge(id: number, formData: FormData) {
  await assertAdmin();
  const supabase = getServiceClient();

  const { error } = await supabase
    .from("challenges")
    .update({
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      estimated_time: formData.get("estimated_time") as string,
      completion_criteria: formData.get("completion_criteria") as string,
      category: formData.get("category") as string,
      depth: formData.get("depth") ? parseInt(formData.get("depth") as string) : null,
      courage: formData.get("courage") ? parseInt(formData.get("courage") as string) : null,
      story_power: formData.get("story_power") ? parseInt(formData.get("story_power") as string) : null,
      commitment: formData.get("commitment") ? parseInt(formData.get("commitment") as string) : null,
    })
    .eq("id", id);

  if (error) throw error;
  redirect("/admin");
}

export async function getChallengeStats(id: number) {
  await assertAdmin();
  const supabase = getServiceClient();

  const [saves, completions, votes, notes, comments] = await Promise.all([
    supabase.from("user_challenges").select("*", { count: "exact", head: true }).eq("challenge_id", id),
    supabase.from("challenge_completions").select("*", { count: "exact", head: true }).eq("challenge_id", id),
    supabase.from("challenge_votes").select("*", { count: "exact", head: true }).eq("challenge_id", id),
    supabase.from("challenge_notes").select("*", { count: "exact", head: true }).eq("challenge_id", id),
    supabase.from("challenge_comments").select("*", { count: "exact", head: true }).eq("challenge_id", id),
  ]);

  return {
    saves: saves.count ?? 0,
    completions: completions.count ?? 0,
    votes: votes.count ?? 0,
    notes: notes.count ?? 0,
    comments: comments.count ?? 0,
  };
}

export async function deleteChallenge(id: number) {
  await assertAdmin();
  const supabase = getServiceClient();

  // Delete comment votes first (depends on comments)
  const commentIds = (await supabase.from("challenge_comments").select("id").eq("challenge_id", id)).data?.map((c) => c.id) ?? [];
  if (commentIds.length > 0) {
    await supabase.from("challenge_comment_votes").delete().in("comment_id", commentIds);
  }

  // Delete completion media (depends on completions)
  const completionIds = (await supabase.from("challenge_completions").select("id").eq("challenge_id", id)).data?.map((c) => c.id) ?? [];
  if (completionIds.length > 0) {
    await supabase.from("completion_media").delete().in("completion_id", completionIds);
  }

  // Delete all direct challenge references
  await Promise.all([
    supabase.from("challenge_votes").delete().eq("challenge_id", id),
    supabase.from("challenge_notes").delete().eq("challenge_id", id),
    supabase.from("user_challenges").delete().eq("challenge_id", id),
    supabase.from("challenge_comments").delete().eq("challenge_id", id),
    supabase.from("challenge_completions").delete().eq("challenge_id", id),
  ]);

  const { error } = await supabase.from("challenges").delete().eq("id", id);
  if (error) throw error;

  redirect("/admin");
}

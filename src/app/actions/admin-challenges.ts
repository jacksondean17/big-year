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
    difficulty: formData.get("difficulty") as string,
    completion_criteria: formData.get("completion_criteria") as string,
    category: formData.get("category") as string,
    points: formData.get("points") ? Number(formData.get("points")) : null,
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
      difficulty: formData.get("difficulty") as string,
      completion_criteria: formData.get("completion_criteria") as string,
      category: formData.get("category") as string,
      points: formData.get("points") ? Number(formData.get("points")) : null,
    })
    .eq("id", id);

  if (error) throw error;
  redirect("/admin");
}

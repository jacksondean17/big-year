"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateAppSetting(key: string, value: string) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("app_settings")
    .update({ value })
    .eq("key", key);

  if (error) throw error;
}

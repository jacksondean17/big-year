import { createClient } from "./supabase/server";
import { deleteFromR2 } from "./r2";
import type { CompletionMedia } from "./types";

export async function getCompletionMedia(
  completionId: string
): Promise<CompletionMedia[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("completion_media")
    .select("*")
    .eq("completion_id", completionId)
    .order("uploaded_at", { ascending: false });

  if (error) {
    console.error("getCompletionMedia error:", error);
    return [];
  }
  return (data ?? []) as CompletionMedia[];
}

export async function deleteCompletionMedia(mediaId: string): Promise<void> {
  const supabase = await createClient();

  // Fetch media record to get storage path
  const { data: media, error: fetchError } = await supabase
    .from("completion_media")
    .select("storage_path")
    .eq("id", mediaId)
    .single();

  if (fetchError || !media) throw new Error("Media not found");

  // Delete from R2
  await deleteFromR2(media.storage_path);

  // Delete from DB
  const { error } = await supabase
    .from("completion_media")
    .delete()
    .eq("id", mediaId);

  if (error) throw error;
}

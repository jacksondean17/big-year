import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadToR2, getPublicUrl, deleteFromR2 } from "@/lib/r2";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const completionId = formData.get("completionId") as string | null;

  if (!file || !completionId) {
    return NextResponse.json(
      { error: "File and completionId are required" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "File type not allowed. Use JPEG, PNG, WebP, GIF, MP4, or MOV." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10MB." },
      { status: 400 }
    );
  }

  // Verify the completion belongs to the user
  const { data: completion, error: completionError } = await supabase
    .from("challenge_completions")
    .select("id")
    .eq("id", completionId)
    .eq("user_id", user.id)
    .single();

  if (completionError || !completion) {
    return NextResponse.json(
      { error: "Completion not found or not owned by you" },
      { status: 403 }
    );
  }

  // Generate storage key
  const ext = file.name.split(".").pop() || "bin";
  const key = `completions/${user.id}/${completionId}/${Date.now()}.${ext}`;

  // Upload to R2
  const buffer = Buffer.from(await file.arrayBuffer());
  await uploadToR2(buffer, key, file.type);

  const publicUrl = getPublicUrl(key);

  // Create media record
  const { data: media, error: mediaError } = await supabase
    .from("completion_media")
    .insert({
      completion_id: completionId,
      storage_path: key,
      public_url: publicUrl,
      file_type: file.type,
      file_size: file.size,
    })
    .select()
    .single();

  if (mediaError) {
    return NextResponse.json(
      { error: "Failed to save media record" },
      { status: 500 }
    );
  }

  return NextResponse.json({ media });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mediaId = searchParams.get("mediaId");

  if (!mediaId) {
    return NextResponse.json(
      { error: "mediaId is required" },
      { status: 400 }
    );
  }

  // Fetch media with ownership check via join
  const { data: media, error: fetchError } = await supabase
    .from("completion_media")
    .select("id, storage_path, completion_id")
    .eq("id", mediaId)
    .single();

  if (fetchError || !media) {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  // Verify ownership
  const { data: completion } = await supabase
    .from("challenge_completions")
    .select("id")
    .eq("id", media.completion_id)
    .eq("user_id", user.id)
    .single();

  if (!completion) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Delete from R2
  await deleteFromR2(media.storage_path);

  // Delete from DB
  await supabase.from("completion_media").delete().eq("id", mediaId);

  return NextResponse.json({ success: true });
}

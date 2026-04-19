import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadToR2, getPublicUrl, deleteFromR2 } from "@/lib/r2";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
];
const ALLOWED_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "heic",
  "heif",
  "mp4",
  "mov",
];
const EXT_TO_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  mov: "video/quicktime",
};
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  try {
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

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const typeAllowed = file.type && ALLOWED_TYPES.includes(file.type);
    const extAllowed = ALLOWED_EXTENSIONS.includes(ext);
    if (!typeAllowed && !extAllowed) {
      return NextResponse.json(
        {
          error: `File type not allowed (received type="${file.type || "empty"}", ext="${ext || "none"}"). Use JPEG, PNG, WebP, GIF, HEIC, MP4, or MOV.`,
        },
        { status: 400 }
      );
    }

    // Mobile browsers sometimes send an empty file.type. Fall back to the
    // extension-derived MIME so the R2 object is stored with a usable type.
    const resolvedType =
      file.type && ALLOWED_TYPES.includes(file.type)
        ? file.type
        : EXT_TO_TYPE[ext] ?? "application/octet-stream";

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum size is 100MB.` },
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
    const keyExt = ext || "bin";
    const key = `completions/${user.id}/${completionId}/${Date.now()}.${keyExt}`;

    // Upload to R2
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadToR2(buffer, key, resolvedType);

    const publicUrl = getPublicUrl(key);

    // Create media record
    const { data: media, error: mediaError } = await supabase
      .from("completion_media")
      .insert({
        completion_id: completionId,
        storage_path: key,
        public_url: publicUrl,
        file_type: resolvedType,
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
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
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

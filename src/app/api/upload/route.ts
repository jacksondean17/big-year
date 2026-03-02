import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
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
  "image/heic-sequence",
  "image/heif-sequence",
  "video/mp4",
  "video/quicktime",
];

const HEIC_MIME_TYPES = [
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
];
const HEIC_EXTENSIONS = ["heic", "heif"];
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

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "File type not allowed. Use JPEG, PNG, WebP, GIF, HEIC, HEIF, MP4, or MOV.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 100MB." },
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
    const extFromName = file.name.split(".").pop()?.toLowerCase() || "";
    const isHeic =
      HEIC_MIME_TYPES.includes(file.type) || HEIC_EXTENSIONS.includes(extFromName);
    const ext = isHeic ? "jpg" : extFromName || "bin";
    const key = `completions/${user.id}/${completionId}/${Date.now()}.${ext}`;

    // Upload to R2 (convert HEIC/HEIF to JPEG for compatibility)
    const originalBuffer = Buffer.from(await file.arrayBuffer());
    const uploadBuffer = isHeic
      ? await sharp(originalBuffer)
          // Auto-orient based on EXIF so converted JPEG displays correctly
          .rotate()
          .jpeg({ quality: 90 })
          .toBuffer()
      : originalBuffer;
    const uploadType = isHeic ? "image/jpeg" : file.type;

    await uploadToR2(uploadBuffer, key, uploadType);

    const publicUrl = getPublicUrl(key);

    // Create media record
    const { data: media, error: mediaError } = await supabase
      .from("completion_media")
      .insert({
        completion_id: completionId,
        storage_path: key,
        public_url: publicUrl,
        file_type: uploadType,
        file_size: uploadBuffer.length,
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

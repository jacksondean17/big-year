"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, X } from "lucide-react";

interface FileUploadProps {
  type: "image" | "video";
  challengeId: number;
  onUploadComplete: (url: string) => void;
  onCancel: () => void;
}

export function FileUpload({
  type,
  challengeId,
  onUploadComplete,
  onCancel,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const maxSize = type === "image" ? 10 * 1024 * 1024 : 50 * 1024 * 1024; // 10MB or 50MB
  const accept =
    type === "image"
      ? "image/jpeg,image/jpg,image/png,image/gif,image/webp"
      : "video/mp4,video/quicktime,video/webm";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes =
      type === "image"
        ? ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
        : ["video/mp4", "video/quicktime", "video/webm"];

    if (!validTypes.includes(file.type)) {
      setError(`Invalid file type. Please upload a ${type}.`);
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      setError(
        `File too large. Maximum size is ${type === "image" ? "10MB" : "50MB"}.`
      );
      return;
    }

    setError(null);
    setUploading(true);
    setProgress(0);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const extension = file.name.split(".").pop();
      const fileName = `${user.id}/${challengeId}-${timestamp}.${extension}`;

      // Upload file
      const { data, error: uploadError } = await supabase.storage
        .from("verification-files")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setProgress(100);
      onUploadComplete(data.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label
          htmlFor="file-upload"
          className="flex cursor-pointer items-center gap-2 rounded-md bg-amber-200 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="size-4" />
          Choose {type}
        </label>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <X className="size-4" />
        </button>
        <input
          id="file-upload"
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
      </div>

      {uploading && (
        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-slate-600">Uploading...</p>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Maximum size: {type === "image" ? "10MB" : "50MB"}
      </p>
    </div>
  );
}

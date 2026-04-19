"use client";

import { useState, useTransition, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Trash2, X, ExternalLink } from "lucide-react";
import { ImagePreview, useImagePreview } from "@/components/image-preview";
import { Input } from "@/components/ui/input";
import {
  markChallengeComplete,
  removeChallengeCompletion,
  sendUserCompletionPing,
} from "@/app/actions/completions";
import type { Completion, CompletionMedia, CompletionStatus } from "@/lib/types";

interface CompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: number;
  completion: Completion | null;
  initialMedia: CompletionMedia[];
  onUpdate: (completion: Completion | null) => void;
}

const statusSteps: { value: CompletionStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

interface PendingFile {
  file: File;
  preview: string;
}

function StatusProgression({
  status,
  onSelect,
}: {
  status: CompletionStatus | null;
  onSelect: (s: CompletionStatus) => void;
}) {
  const selectedIdx = status ? statusSteps.findIndex((s) => s.value === status) : -1;

  return (
    <div className="flex">
      {statusSteps.map((step, i) => {
        const isActive = i <= selectedIdx;
        const isSelected = i === selectedIdx;
        const isFirst = i === 0;
        const isLast = i === statusSteps.length - 1;

        return (
          <button
            key={step.value}
            type="button"
            onClick={() => onSelect(step.value)}
            className="relative flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
            style={{ zIndex: statusSteps.length - i }}
          >
            <svg
              viewBox="0 0 120 40"
              preserveAspectRatio="none"
              className="h-12 w-full"
            >
              <path
                d={
                  isFirst && isLast
                    ? "M0,0 L120,0 L120,40 L0,40 Z"
                    : isFirst
                      ? "M0,0 L105,0 L120,20 L105,40 L0,40 Z"
                      : isLast
                        ? "M0,0 L120,0 L120,40 L0,40 L15,20 Z"
                        : "M0,0 L105,0 L120,20 L105,40 L0,40 L15,20 Z"
                }
                className={`transition-colors ${
                  isActive
                    ? isSelected
                      ? "fill-primary stroke-primary"
                      : "fill-primary/70 stroke-primary/70"
                    : "fill-muted stroke-border"
                }`}
                strokeWidth="1"
              />
            </svg>
            <span
              className={`absolute inset-0 flex items-center justify-center text-sm font-medium transition-colors ${
                isActive ? "text-primary-foreground" : "text-muted-foreground"
              } ${!isFirst ? "pl-2" : ""}`}
            >
              {step.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function CompletionDialog({
  open,
  onOpenChange,
  challengeId,
  completion,
  initialMedia,
  onUpdate,
}: CompletionDialogProps) {
  const [status, setStatus] = useState<CompletionStatus | null>(
    completion?.status ?? null
  );
  const [note, setNote] = useState(completion?.completion_note ?? "");
  const [externalUrl, setExternalUrl] = useState(completion?.external_url ?? "");
  const [existingMedia, setExistingMedia] =
    useState<CompletionMedia[]>(initialMedia);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const imagePreview = useImagePreview();

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      try {
        // Save/upsert the completion and get the real record back
        const saved = await markChallengeComplete(challengeId, status!, note, externalUrl);

        // Upload any pending files now that we have a completion ID
        let uploadError: string | null = null;
        const stillPending: PendingFile[] = [];
        const toRevoke: string[] = [];
        for (const pf of pendingFiles) {
          const formData = new FormData();
          formData.append("file", pf.file);
          formData.append("completionId", saved.id);

          let res: Response;
          try {
            res = await fetch("/api/upload", {
              method: "POST",
              body: formData,
            });
          } catch (err) {
            uploadError = `Network error uploading ${pf.file.name}: ${err instanceof Error ? err.message : String(err)}`;
            stillPending.push(pf);
            continue;
          }

          if (res.ok) {
            toRevoke.push(pf.preview);
            continue;
          }

          // Read as text first — some platform errors (e.g. 413) return HTML,
          // which would throw if we blindly called res.json().
          const text = await res.text().catch(() => "");
          let message = text;
          try {
            const parsed = JSON.parse(text);
            if (parsed?.error) message = parsed.error;
          } catch {
            const sizeMb = (pf.file.size / 1024 / 1024).toFixed(1);
            if (res.status === 413) {
              message = `File too large for server (${sizeMb}MB). Try a smaller file or an external link.`;
            } else {
              message = `Upload failed (HTTP ${res.status}). File: ${pf.file.name} (${sizeMb}MB, type="${pf.file.type || "empty"}")`;
            }
          }
          uploadError = message;
          stillPending.push(pf);
        }

        if (uploadError) {
          // Revoke previews for the ones that did succeed and keep failed ones
          // in state so the user can retry just those.
          for (const url of toRevoke) URL.revokeObjectURL(url);
          setPendingFiles(stillPending);
          setError(uploadError);
          onUpdate(saved);
          return;
        }

        // Clean up previews
        for (const pf of pendingFiles) {
          URL.revokeObjectURL(pf.preview);
        }
        setPendingFiles([]);

        // Send Discord ping after uploads are done (fire-and-forget)
        if (saved.status === "completed") {
          sendUserCompletionPing(saved.id, challengeId).catch(() => {});
        }

        onUpdate(saved);
        onOpenChange(false);
      } catch {
        setError("Failed to save. Please try again.");
      }
    });
  };

  const handleRemove = () => {
    setError(null);
    startTransition(async () => {
      try {
        await removeChallengeCompletion(challengeId);
        // Clean up previews
        for (const pf of pendingFiles) {
          URL.revokeObjectURL(pf.preview);
        }
        onUpdate(null);
        setStatus(null);
        setNote("");
        setExternalUrl("");
        setExistingMedia([]);
        setPendingFiles([]);
        onOpenChange(false);
      } catch {
        setError("Failed to remove. Please try again.");
      }
    });
  };

  const [isConverting, setIsConverting] = useState(false);

  const isHeic = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    return (
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      ext === "heic" ||
      ext === "heif"
    );
  }, []);

  const convertHeicToJpeg = useCallback(async (file: File): Promise<File> => {
    const { heicTo } = await import("heic-to");
    const blob = await heicTo({
      blob: file,
      type: "image/jpeg",
      quality: 0.9,
    });
    const name = file.name.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg");
    return new File([blob], name, { type: "image/jpeg" });
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/heic",
      "image/heif",
      "video/mp4",
      "video/quicktime",
    ];
    const ext = file.name.split(".").pop()?.toLowerCase();
    const allowedExtensions = ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "mp4", "mov"];
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext || "")) {
      setError("File type not allowed. Use JPEG, PNG, WebP, GIF, HEIC, MP4, or MOV.");
      e.target.value = "";
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError("File too large. Maximum size is 100MB.");
      e.target.value = "";
      return;
    }

    setError(null);

    // Convert HEIC/HEIF to JPEG for browser compatibility
    if (isHeic(file)) {
      try {
        setIsConverting(true);
        file = await convertHeicToJpeg(file);
      } catch {
        setError("Failed to convert HEIC image. Please try converting to JPEG first.");
        e.target.value = "";
        setIsConverting(false);
        return;
      } finally {
        setIsConverting(false);
      }
    }

    const preview = URL.createObjectURL(file);
    setPendingFiles((prev) => [...prev, { file, preview }]);
    e.target.value = "";
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDeleteExistingMedia = async (mediaId: string) => {
    try {
      const res = await fetch(`/api/upload?mediaId=${mediaId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setExistingMedia((prev) => prev.filter((m) => m.id !== mediaId));
      }
    } catch {
      setError("Failed to delete media.");
    }
  };

  const allMedia = [
    ...existingMedia.map((m) => ({
      key: m.id,
      src: m.public_url,
      type: m.file_type,
      isExisting: true as const,
      id: m.id,
    })),
    ...pendingFiles.map((pf, i) => ({
      key: `pending-${i}`,
      src: pf.preview,
      type: pf.file.type,
      isExisting: false as const,
      index: i,
    })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Track Your Progress</DialogTitle>
          <DialogDescription>
            Update your status and optionally add a note or proof.
          </DialogDescription>
          <p className="text-xs text-muted-foreground">
            Your status, note, and proof are visible to other users.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status progression */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <StatusProgression status={status} onSelect={setStatus} />
          </div>

          {/* Note */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Note (optional)</label>
            <Textarea
              placeholder="How did it go? Any thoughts?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={2000}
            />
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Proof (optional)</label>
            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted">
                <Upload className="size-4" />
                Upload image or video
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/quicktime"
                  onChange={handleFileSelect}
                  disabled={isPending || isConverting}
                />
              </label>
            </div>
            {isConverting && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" />
                Converting HEIC to JPEG...
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Max 100MB. JPEG, PNG, WebP, GIF, HEIC, MP4, or MOV.
            </p>

            {/* Media preview grid */}
            {allMedia.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {allMedia.map((m) => (
                  <div key={m.key} className="group relative">
                    {m.type.startsWith("image/") ? (
                      <img
                        src={m.src}
                        alt="Proof"
                        className="h-32 w-full cursor-pointer rounded-md object-cover transition-opacity hover:opacity-80"
                        onClick={() => imagePreview.open(m.src)}
                      />
                    ) : (
                      <video
                        src={m.src}
                        className="h-32 w-full rounded-md object-cover"
                        preload="metadata"
                        controls
                      />
                    )}
                    {!m.isExisting && (
                      <span className="absolute left-1 top-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                        Pending
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        m.isExisting
                          ? handleDeleteExistingMedia(m.id)
                          : removePendingFile(m.index)
                      }
                      className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* External link */}
          <div className="space-y-2">
            <label className="text-sm font-medium">External link (optional)</label>
            <div className="flex items-center gap-2">
              <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
              <Input
                type="url"
                placeholder="https://photos.google.com/... or iCloud link"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Link to Google Photos, iCloud, YouTube, or any external hosting.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Actions */}
          <div className="flex justify-between gap-2">
            <div>
              {completion && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  disabled={isPending}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="size-4" />
                  Remove
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isPending || !status}>
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
      <ImagePreview src={imagePreview.previewSrc} onClose={imagePreview.close} />
    </Dialog>
  );
}

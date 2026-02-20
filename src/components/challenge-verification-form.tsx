"use client";

import { useState } from "react";
import { createVerification } from "@/app/actions/verifications";
import type { VerificationType, LinkPreviewData } from "@/lib/types";
import { FileUpload } from "./file-upload";
import { LinkPreviewInput } from "./link-preview-input";
import { Image, Link, FileText, Video, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface ChallengeVerificationFormProps {
  challengeId: number;
  onCancel: () => void;
}

export function ChallengeVerificationForm({
  challengeId,
  onCancel,
}: ChallengeVerificationFormProps) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<VerificationType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for different verification types
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [linkPreview, setLinkPreview] = useState<LinkPreviewData | null>(null);
  const [textContent, setTextContent] = useState("");

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      let params: Parameters<typeof createVerification>[0] = {
        challengeId,
        verificationType: selectedType!,
      };

      switch (selectedType) {
        case "image":
          if (!imageUrl) {
            setError("Please upload an image");
            setSubmitting(false);
            return;
          }
          params.imageUrl = imageUrl;
          break;
        case "video":
          if (!videoUrl) {
            setError("Please upload a video");
            setSubmitting(false);
            return;
          }
          params.videoUrl = videoUrl;
          break;
        case "link":
          if (!linkPreview) {
            setError("Please fetch a link preview");
            setSubmitting(false);
            return;
          }
          params.linkUrl = linkPreview.url;
          params.linkTitle = linkPreview.title;
          params.linkDescription = linkPreview.description;
          params.linkImageUrl = linkPreview.image;
          break;
        case "text":
          if (!textContent.trim()) {
            setError("Please enter some text");
            setSubmitting(false);
            return;
          }
          params.textContent = textContent;
          break;
      }

      const result = await createVerification(params);

      if (result.success) {
        router.refresh();
        onCancel();
      } else {
        setError(result.error || "Failed to create verification");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
      <h3 className="font-display text-lg font-semibold text-slate-900">
        Add Verification
      </h3>

      {!selectedType ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => setSelectedType("image")}
            className="flex flex-col items-center gap-2 rounded-md border-2 border-slate-200 bg-white p-4 text-slate-700 transition-colors hover:border-amber-300 hover:bg-amber-50"
          >
            <Image className="size-6" />
            <span className="text-sm font-medium">Image</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedType("video")}
            className="flex flex-col items-center gap-2 rounded-md border-2 border-slate-200 bg-white p-4 text-slate-700 transition-colors hover:border-amber-300 hover:bg-amber-50"
          >
            <Video className="size-6" />
            <span className="text-sm font-medium">Video</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedType("link")}
            className="flex flex-col items-center gap-2 rounded-md border-2 border-slate-200 bg-white p-4 text-slate-700 transition-colors hover:border-amber-300 hover:bg-amber-50"
          >
            <Link className="size-6" />
            <span className="text-sm font-medium">Link</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedType("text")}
            className="flex flex-col items-center gap-2 rounded-md border-2 border-slate-200 bg-white p-4 text-slate-700 transition-colors hover:border-amber-300 hover:bg-amber-50"
          >
            <FileText className="size-6" />
            <span className="text-sm font-medium">Text</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              Type: {selectedType}
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedType(null);
                setImageUrl(null);
                setVideoUrl(null);
                setLinkPreview(null);
                setTextContent("");
                setError(null);
              }}
              className="text-sm text-amber-600 hover:underline"
            >
              Change type
            </button>
          </div>

          {selectedType === "image" && (
            <FileUpload
              type="image"
              challengeId={challengeId}
              onUploadComplete={setImageUrl}
              onCancel={() => setImageUrl(null)}
            />
          )}

          {selectedType === "video" && (
            <FileUpload
              type="video"
              challengeId={challengeId}
              onUploadComplete={setVideoUrl}
              onCancel={() => setVideoUrl(null)}
            />
          )}

          {selectedType === "link" && (
            <LinkPreviewInput onPreviewFetched={setLinkPreview} />
          )}

          {selectedType === "text" && (
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Describe how you completed this challenge..."
              rows={4}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 rounded-md bg-amber-200 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Submit Verification
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

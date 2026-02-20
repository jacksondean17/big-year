"use client";

import { useState } from "react";
import { fetchLinkPreview } from "@/app/actions/verifications";
import type { LinkPreviewData } from "@/lib/types";
import { ExternalLink, Loader2 } from "lucide-react";
import Image from "next/image";

interface LinkPreviewInputProps {
  onPreviewFetched: (data: LinkPreviewData) => void;
}

export function LinkPreviewInput({ onPreviewFetched }: LinkPreviewInputProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<LinkPreviewData | null>(null);

  const handleFetchPreview = async () => {
    if (!url) return;

    // Validate URL format
    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    setLoading(true);
    setError(null);

    const result = await fetchLinkPreview(url);

    if (result.success && result.data) {
      setPreview(result.data);
      onPreviewFetched(result.data);
    } else {
      setError(result.error || "Failed to fetch preview");
    }

    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleFetchPreview();
            }
          }}
          placeholder="https://example.com"
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          disabled={loading}
        />
        <button
          type="button"
          onClick={handleFetchPreview}
          disabled={loading || !url}
          className="flex items-center gap-2 rounded-md bg-amber-200 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ExternalLink className="size-4" />
          )}
          Fetch Preview
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {preview && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex gap-4">
            {preview.image && (
              <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md">
                <Image
                  src={preview.image}
                  alt={preview.title || "Link preview"}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            <div className="flex-1 space-y-1">
              {preview.title && (
                <h4 className="font-medium text-slate-900">{preview.title}</h4>
              )}
              {preview.description && (
                <p className="line-clamp-2 text-sm text-slate-600">
                  {preview.description}
                </p>
              )}
              <a
                href={preview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-amber-600 hover:underline"
              >
                <ExternalLink className="size-3" />
                {new URL(preview.url).hostname}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

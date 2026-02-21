"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";

interface ImagePreviewProps {
  src: string | null;
  onClose: () => void;
}

export function ImagePreview({ src, onClose }: ImagePreviewProps) {
  useEffect(() => {
    if (!src) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
      >
        <X className="size-5" />
      </button>
      <img
        src={src}
        alt="Full resolution preview"
        className="max-h-[90vh] max-w-[90vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export function useImagePreview() {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const open = useCallback((src: string) => setPreviewSrc(src), []);
  const close = useCallback(() => setPreviewSrc(null), []);
  return { previewSrc, open, close };
}

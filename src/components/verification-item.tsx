"use client";

import type { VerificationWithProfile } from "@/lib/types";
import { getDisplayName } from "@/lib/types";
import { deleteVerification } from "@/app/actions/verifications";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  FileText,
  Trash2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface VerificationItemProps {
  verification: VerificationWithProfile;
  currentUserId?: string;
}

export function VerificationItem({
  verification,
  currentUserId,
}: VerificationItemProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const isOwnVerification = currentUserId === verification.user_id;

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this verification?")) return;

    setDeleting(true);
    const fileUrl =
      verification.image_url || verification.video_url || undefined;
    const result = await deleteVerification(verification.id, fileUrl);

    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || "Failed to delete verification");
      setDeleting(false);
    }
  };

  const getVerificationIcon = () => {
    switch (verification.verification_type) {
      case "image":
        return <ImageIcon className="size-4" />;
      case "video":
        return <Video className="size-4" />;
      case "link":
        return <LinkIcon className="size-4" />;
      case "text":
        return <FileText className="size-4" />;
    }
  };

  const getStorageUrl = (path: string) => {
    const supabase = createClient();
    const { data } = supabase.storage
      .from("verification-files")
      .getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          {verification.profiles.avatar_url && (
            <Image
              src={verification.profiles.avatar_url}
              alt={getDisplayName(verification.profiles)}
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <div>
            <p className="font-medium text-slate-900">
              {getDisplayName(verification.profiles)}
            </p>
            <p className="text-xs text-slate-500">
              {new Date(verification.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
            {getVerificationIcon()}
            {verification.verification_type}
          </span>
          {isOwnVerification && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-slate-400 transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Delete verification"
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {verification.verification_type === "image" && verification.image_url && (
          <div className="relative h-64 w-full overflow-hidden rounded-md">
            <Image
              src={getStorageUrl(verification.image_url)}
              alt="Verification image"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}

        {verification.verification_type === "video" && verification.video_url && (
          <video
            src={getStorageUrl(verification.video_url)}
            controls
            className="w-full rounded-md"
          />
        )}

        {verification.verification_type === "link" && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex gap-3">
              {verification.link_image_url && (
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md">
                  <Image
                    src={verification.link_image_url}
                    alt={verification.link_title || "Link preview"}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <div className="flex-1 space-y-1">
                {verification.link_title && (
                  <h4 className="font-medium text-slate-900">
                    {verification.link_title}
                  </h4>
                )}
                {verification.link_description && (
                  <p className="line-clamp-2 text-sm text-slate-600">
                    {verification.link_description}
                  </p>
                )}
                {verification.link_url && (
                  <a
                    href={verification.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-amber-600 hover:underline"
                  >
                    <ExternalLink className="size-3" />
                    {new URL(verification.link_url).hostname}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {verification.verification_type === "text" && verification.text_content && (
          <p className="whitespace-pre-wrap text-sm text-slate-700">
            {verification.text_content}
          </p>
        )}
      </div>
    </div>
  );
}

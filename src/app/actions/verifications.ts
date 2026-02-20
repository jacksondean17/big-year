"use server";

import { createClient } from "@/lib/supabase/server";
import type { VerificationType, LinkPreviewData } from "@/lib/types";
import { revalidatePath } from "next/cache";

/**
 * Fetches Open Graph metadata from a URL (server-side to avoid CORS)
 */
export async function fetchLinkPreview(url: string): Promise<{
  success: boolean;
  data?: LinkPreviewData;
  error?: string;
}> {
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { success: false, error: "Only HTTP/HTTPS URLs are supported" };
    }

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BigYearBot/1.0)' },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { success: false, error: `Failed to fetch: ${response.status}` };
    }

    const html = await response.text();

    const getMetaContent = (property: string): string | null => {
      const regex = new RegExp(
        `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`,
        'i'
      );
      const match = html.match(regex);
      return match ? match[1] : null;
    };

    const data: LinkPreviewData = {
      url,
      title: getMetaContent('og:title') || getMetaContent('twitter:title'),
      description: getMetaContent('og:description') || getMetaContent('twitter:description'),
      image: getMetaContent('og:image') || getMetaContent('twitter:image'),
    };

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch preview"
    };
  }
}

/**
 * Creates a new verification
 */
export async function createVerification(params: {
  challengeId: number;
  verificationType: VerificationType;
  imageUrl?: string;
  videoUrl?: string;
  linkUrl?: string;
  linkTitle?: string;
  linkDescription?: string;
  linkImageUrl?: string;
  textContent?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("challenge_verifications")
    .insert({
      user_id: user.id,
      challenge_id: params.challengeId,
      verification_type: params.verificationType,
      image_url: params.imageUrl ?? null,
      video_url: params.videoUrl ?? null,
      link_url: params.linkUrl ?? null,
      link_title: params.linkTitle ?? null,
      link_description: params.linkDescription ?? null,
      link_image_url: params.linkImageUrl ?? null,
      text_content: params.textContent ?? null,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/challenges/${params.challengeId}`);
  revalidatePath("/");
  revalidatePath("/my-list");

  return { success: true };
}

/**
 * Deletes a verification and associated file
 */
export async function deleteVerification(
  verificationId: number,
  fileUrl?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Delete file from storage if exists
  if (fileUrl) {
    await supabase.storage.from('verification-files').remove([fileUrl]);
  }

  // Delete verification record
  const { error } = await supabase
    .from("challenge_verifications")
    .delete()
    .eq("id", verificationId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/challenges`);
  revalidatePath("/");
  revalidatePath("/my-list");

  return { success: true };
}

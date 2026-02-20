import { createClient } from "./supabase/server";
import type { ChallengeVerification, VerificationWithProfile } from "./types";

/**
 * Get all user's verifications for a specific challenge
 */
export async function getUserVerificationsForChallenge(
  challengeId: number
): Promise<ChallengeVerification[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("challenge_verifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("challenge_id", challengeId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as ChallengeVerification[];
}

/**
 * Get all verifications for a challenge from all users
 */
export async function getAllVerificationsForChallenge(
  challengeId: number
): Promise<VerificationWithProfile[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("challenge_verifications")
    .select(`
      *,
      profiles (
        id,
        display_name,
        avatar_url,
        guild_nickname
      )
    `)
    .eq("challenge_id", challengeId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as VerificationWithProfile[];
}

/**
 * Get verification count for a challenge
 */
export async function getVerificationCountForChallenge(
  challengeId: number
): Promise<number> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("challenge_verification_counts")
    .select("verification_count")
    .eq("challenge_id", challengeId)
    .maybeSingle();

  return data?.verification_count ?? 0;
}

/**
 * Get challenge IDs that user has verified
 */
export async function getUserVerificationChallengeIds(): Promise<Set<number>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data, error } = await supabase
    .from("challenge_verifications")
    .select("challenge_id")
    .eq("user_id", user.id);

  if (error) return new Set();
  return new Set((data ?? []).map((r) => r.challenge_id));
}

import { createClient } from "./supabase/server";
import { Challenge, UserProfile } from "./types";

export async function getChallenges(
  { includeArchived = false }: { includeArchived?: boolean } = {}
): Promise<Challenge[]> {
  const supabase = await createClient();
  let query = supabase.from("challenges").select("*");
  if (!includeArchived) {
    query = query.eq("archived", false);
  }
  const { data, error } = await query.order("id");

  if (error) throw error;
  return data as Challenge[];
}

export async function getChallengeById(
  id: number,
  { includeArchived = false }: { includeArchived?: boolean } = {}
): Promise<Challenge | null> {
  const supabase = await createClient();
  let query = supabase.from("challenges").select("*").eq("id", id);
  if (!includeArchived) {
    query = query.eq("archived", false);
  }
  const { data, error } = await query.single();

  if (error) return null;
  return data as Challenge;
}

export async function getSubmitterProfile(
  discordUsername: string
): Promise<UserProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, guild_nickname")
    .or(
      `display_name.eq.${discordUsername},guild_nickname.eq.${discordUsername}`
    )
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as UserProfile;
}

/** Batch-resolve submitted_by usernames to display names */
export async function getSubmitterDisplayNames(
  usernames: string[]
): Promise<Record<string, string>> {
  if (usernames.length === 0) return {};
  const supabase = await createClient();

  // Find profiles where display_name or guild_nickname matches any username
  const filters = usernames
    .map((u) => `display_name.eq.${u},guild_nickname.eq.${u}`)
    .join(",");
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, guild_nickname")
    .or(filters);

  if (error || !data) return {};

  const map: Record<string, string> = {};
  for (const profile of data) {
    // Map the matched username (guild_nickname or display_name) to the display_name
    for (const username of usernames) {
      if (
        profile.guild_nickname === username ||
        profile.display_name === username
      ) {
        map[username] = profile.display_name;
      }
    }
  }
  return map;
}

export async function getCategories(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("challenges")
    .select("category")
    .eq("archived", false)
    .order("category");

  if (error) throw error;
  const categories = [...new Set(data.map((d) => d.category as string))];
  return categories;
}

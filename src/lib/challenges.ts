import { supabase } from "./supabase";
import { Challenge } from "./types";

export async function getChallenges(): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .order("id");

  if (error) throw error;
  return data as Challenge[];
}

export async function getChallengeById(
  id: number
): Promise<Challenge | null> {
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as Challenge;
}

export async function getCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from("challenges")
    .select("category")
    .order("category");

  if (error) throw error;
  const categories = [...new Set(data.map((d) => d.category as string))];
  return categories;
}

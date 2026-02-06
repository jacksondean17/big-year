"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";

interface MyListButtonProps {
  challengeId: number;
  initialSaved?: boolean;
  size?: "sm" | "default";
  isLoggedIn?: boolean;
}

export function MyListButton({
  challengeId,
  initialSaved = false,
  size = "sm",
  isLoggedIn = false,
}: MyListButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  if (!isLoggedIn) return null;

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);

    if (saved) {
      await supabase
        .from("user_challenges")
        .delete()
        .eq("challenge_id", challengeId);
      setSaved(false);
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Ensure profile exists (fallback for users created before profiles table)
        await supabase.from("profiles").upsert(
          {
            id: user.id,
            display_name:
              user.user_metadata?.full_name || user.email || "Anonymous",
            avatar_url: user.user_metadata?.avatar_url || null,
          },
          { onConflict: "id" }
        );
        await supabase
          .from("user_challenges")
          .insert({ user_id: user.id, challenge_id: challengeId });
        setSaved(true);
      }
    }
    setLoading(false);
  };

  return (
    <Button
      variant={saved ? "default" : "outline"}
      size={size}
      onClick={toggle}
      disabled={loading}
      aria-label={saved ? "Remove from My List" : "Add to My List"}
    >
      <Bookmark className={`size-4 ${saved ? "fill-current" : ""}`} />
      {saved ? "Saved" : "Save"}
    </Button>
  );
}

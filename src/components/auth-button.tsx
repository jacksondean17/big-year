"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignIn = () => {
    supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (loading) return null;

  if (!user) {
    return (
      <Button variant="outline" size="sm" onClick={handleSignIn}>
        <LogIn className="size-4" />
        Sign in
      </Button>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url;
  const name = user.user_metadata?.full_name || user.email;

  return (
    <div className="flex items-center gap-2">
      {avatarUrl && (
        <img
          src={avatarUrl}
          alt={name ?? "User"}
          className="size-7 rounded-full border border-border"
        />
      )}
      <Button variant="ghost" size="sm" onClick={handleSignOut}>
        <LogOut className="size-4" />
        Sign out
      </Button>
    </div>
  );
}

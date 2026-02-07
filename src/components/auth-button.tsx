"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { syncDiscordNickname } from "@/app/actions/discord";

// Dev-only test users for quick login
const DEV_USERS = [
  { email: "alice@example.com", name: "Alice" },
  { email: "bob@example.com", name: "Bob" },
  { email: "charlie@example.com", name: "Charlie" },
];

export function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDevLogin, setShowDevLogin] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const supabase = createClient();

  // Check if running locally
  const isDev =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  // Track if we've already synced to avoid duplicate calls
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);

      // Only sync on an actual new sign-in, not on page load with existing session.
      // INITIAL_SESSION fires on mount with an existing session — skip that.
      if (event === "SIGNED_IN" && session?.user && !hasSyncedRef.current) {
        hasSyncedRef.current = true;
        console.log("[AuthButton] User signed in, syncing Discord nickname...");
        syncDiscordNickname()
          .then((result) => {
            console.log("[AuthButton] Discord sync result:", result);
            if (result.success && result.nickname) {
              window.location.reload();
            }
          })
          .catch((err) => {
            console.error("[AuthButton] Discord sync error:", err);
          });
      }

      // Mark as synced on initial load so we don't trigger on token refresh
      if (event === "INITIAL_SESSION" && session?.user) {
        hasSyncedRef.current = true;
      }

      // Reset sync flag on sign out
      if (event === "SIGNED_OUT") {
        hasSyncedRef.current = false;
      }
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

  const [devLoading, setDevLoading] = useState(false);

  const handleDevSignIn = async (email: string) => {
    console.log("handleDevSignIn called with:", email);
    setLoginError(null);
    setDevLoading(true);
    try {
      console.log("Calling signInWithPassword...");
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: "password123",
      });
      console.log("signInWithPassword result:", { data, error });
      if (error) {
        setLoginError(error.message);
      } else {
        setShowDevLogin(false);
        window.location.reload();
      }
    } catch (e) {
      console.error("signInWithPassword exception:", e);
      setLoginError(String(e));
    } finally {
      setDevLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (loading) return null;

  if (!user) {
    return (
      <div className="relative">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSignIn}>
            <LogIn className="size-4" />
            Sign in
          </Button>
          {isDev && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDevLogin(!showDevLogin)}
              className="text-xs text-muted-foreground"
            >
              Dev
            </Button>
          )}
        </div>
        {showDevLogin && (
          <div
            className="fixed top-16 right-4 z-[9999] bg-popover border rounded-md shadow-lg p-3 min-w-48"
            style={{ pointerEvents: 'auto' }}
          >
            <p className="text-xs text-muted-foreground mb-2">
              Quick dev login:
            </p>
            <div className="flex flex-col gap-1">
              {DEV_USERS.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  className="text-left px-2 py-1 text-sm hover:bg-accent rounded disabled:opacity-50"
                  onClick={() => {
                    console.log("Button clicked for:", u.email);
                    handleDevSignIn(u.email);
                  }}
                  disabled={devLoading}
                >
                  {u.name}
                </button>
              ))}
            </div>
            {devLoading && (
              <p className="text-xs text-muted-foreground mt-2">Signing in...</p>
            )}
            {loginError && (
              <p className="text-xs text-destructive mt-2">{loginError}</p>
            )}
          </div>
        )}
      </div>
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

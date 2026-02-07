import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncDiscordNickname } from "@/app/actions/discord";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Sync Discord nickname after successful login
      // Must await to ensure it completes before serverless function terminates
      try {
        const result = await syncDiscordNickname();
        console.log("[auth/callback] Discord sync result:", result);
      } catch (e) {
        console.error("[auth/callback] Discord sync failed:", e);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=true`);
}

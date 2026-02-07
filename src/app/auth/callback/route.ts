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
      // Sync Discord nickname after successful login (fire and forget)
      syncDiscordNickname().catch(console.error);

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=true`);
}

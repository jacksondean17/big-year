import { createClient } from "@supabase/supabase-js";
import { SendPingButton } from "./send-ping-button";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key)
    throw new Error("Missing Supabase service role credentials");
  return createClient(url, key);
}

export default async function AdminCompletionsPage() {
  const supabase = getServiceClient();

  const { data: completions } = await supabase
    .from("challenge_completions")
    .select(
      `
      user_id,
      challenge_id,
      status,
      completed_at,
      completion_note,
      profiles(display_name, guild_nickname, discord_id),
      challenges!inner(title, points, category, archived)
    `
    )
    .eq("status", "completed")
    .eq("challenges.archived", false)
    .order("completed_at", { ascending: false });

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Completions</h2>
        <p className="text-sm text-muted-foreground">
          Send Discord pings for completed challenges.{" "}
          {completions?.length ?? 0} completions total.
        </p>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Challenge</th>
              <th className="px-4 py-3 font-medium">Points</th>
              <th className="px-4 py-3 font-medium">Completed</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(completions ?? []).map((c, i) => {
              const profile = c.profiles as unknown as {
                display_name: string;
                guild_nickname: string | null;
                discord_id: string | null;
              };
              const challenge = c.challenges as unknown as {
                title: string;
                points: number | null;
                category: string;
              };
              const hasDiscord = !!profile?.discord_id;

              return (
                <tr
                  key={`${c.user_id}-${c.challenge_id}`}
                  className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}
                >
                  <td className="px-4 py-3 font-medium">
                    {profile?.guild_nickname ?? profile?.display_name ?? "—"}
                  </td>
                  <td className="px-4 py-3">{challenge?.title ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {challenge?.points ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.completed_at
                      ? new Date(c.completed_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {hasDiscord ? (
                      <SendPingButton
                        userId={c.user_id}
                        challengeId={c.challenge_id}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No Discord
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

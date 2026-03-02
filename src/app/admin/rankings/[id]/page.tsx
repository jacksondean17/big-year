import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getChallenges } from "@/lib/challenges";
import { ChallengeComparison, getDisplayName } from "@/lib/types";

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export default async function ChallengeMatchupsPage({
  params,
}: {
  params: { id: string };
}) {
  const challengeId = Number(params.id);
  if (!Number.isFinite(challengeId)) {
    notFound();
  }

  const supabase = await createClient();
  const [challenges, { data: comparisons }, { data: profiles }] =
    await Promise.all([
      getChallenges(),
      supabase
        .from("challenge_comparisons")
        .select("id, user_id, winner_id, loser_id, response_time_ms, created_at")
        .or(`winner_id.eq.${challengeId},loser_id.eq.${challengeId}`)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, display_name, guild_nickname"),
    ]);

  const challenge = challenges.find((c) => c.id === challengeId);
  if (!challenge) {
    notFound();
  }

  const challengeMap = new Map(challenges.map((c) => [c.id, c]));
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p])
  );

  const matchups = (comparisons ?? []) as ChallengeComparison[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Challenge #{challenge.id}</p>
          <h2 className="text-xl font-semibold">{challenge.title}</h2>
          <p className="text-sm text-muted-foreground">
            {matchups.length} matchup{matchups.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/admin/rankings">Back to rankings</Link>
        </Button>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Judge</th>
              <th className="px-4 py-3 font-medium">Winner</th>
              <th className="px-4 py-3 font-medium">Loser</th>
              <th className="px-4 py-3 font-medium text-right">Response</th>
            </tr>
          </thead>
          <tbody>
            {matchups.map((m, i) => {
              const winner = challengeMap.get(m.winner_id);
              const loser = challengeMap.get(m.loser_id);
              const profile = profileMap.get(m.user_id);
              const isWin = m.winner_id === challengeId;

              return (
                <tr
                  key={m.id}
                  className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(m.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {profile ? getDisplayName(profile) : m.user_id}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {winner?.title ?? m.winner_id}
                    {isWin && <span className="ml-2 text-xs text-green-600 font-semibold">WIN</span>}
                  </td>
                  <td className="px-4 py-3">
                    {loser?.title ?? m.loser_id}
                    {!isWin && <span className="ml-2 text-xs text-red-600 font-semibold">LOSS</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {formatDuration(m.response_time_ms ?? null)}
                  </td>
                </tr>
              );
            })}
            {matchups.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No matchups yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

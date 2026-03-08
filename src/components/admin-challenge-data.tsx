import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllVotersForChallenge } from "@/lib/votes";
import { getVoteCountForChallenge } from "@/lib/votes";
import { getAllChallengeSavers } from "@/lib/savers";
import { getAllNotesForChallenge } from "@/lib/notes";
import { getAllCompletionsForChallenge } from "@/lib/completions";
import { getCommentsForChallenge } from "@/lib/comments";
import { getDisplayName } from "@/lib/types";

function UserAvatar({ profile }: { profile: { display_name: string; avatar_url: string | null; guild_nickname?: string | null } }) {
  const name = getDisplayName(profile);
  return (
    <div className="flex items-center gap-2">
      {profile.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="w-5 h-5 rounded-full" />
      ) : (
        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">
          {name[0]}
        </div>
      )}
      <span className="text-sm">{name}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "completed" ? "default" : status === "in_progress" ? "secondary" : "outline";
  const label = status === "in_progress" ? "In Progress" : status === "planned" ? "Planned" : "Completed";
  return <Badge variant={variant}>{label}</Badge>;
}

export async function AdminChallengeData({ challengeId }: { challengeId: number }) {
  const [voters, voteCounts, savers, notes, completions, comments] = await Promise.all([
    getAllVotersForChallenge(challengeId),
    getVoteCountForChallenge(challengeId),
    getAllChallengeSavers(challengeId),
    getAllNotesForChallenge(challengeId),
    getAllCompletionsForChallenge(challengeId),
    getCommentsForChallenge(challengeId),
  ]);

  const upvoters = voters.filter((v) => v.vote_type === 1);
  const downvoters = voters.filter((v) => v.vote_type === -1);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Challenge Activity</h2>

      {/* Votes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Votes
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({voteCounts.upvotes} up, {voteCounts.downvotes} down)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {voters.length === 0 ? (
            <p className="text-sm text-muted-foreground">No votes yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-green-600 mb-2">Upvotes ({upvoters.length})</p>
                <div className="space-y-1.5">
                  {upvoters.map((v) => (
                    <UserAvatar key={v.user_id} profile={v.profiles} />
                  ))}
                  {upvoters.length === 0 && <p className="text-sm text-muted-foreground">None</p>}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-red-600 mb-2">Downvotes ({downvoters.length})</p>
                <div className="space-y-1.5">
                  {downvoters.map((v) => (
                    <UserAvatar key={v.user_id} profile={v.profiles} />
                  ))}
                  {downvoters.length === 0 && <p className="text-sm text-muted-foreground">None</p>}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Savers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Saved By
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({savers.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {savers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one has saved this challenge</p>
          ) : (
            <div className="space-y-1.5">
              {savers.map((s) => (
                <div key={s.user_id} className="flex items-center justify-between">
                  <UserAvatar profile={s.profiles} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(s.added_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Completions
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({completions.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completions yet</p>
          ) : (
            <div className="space-y-3">
              {completions.map((c) => (
                <div key={c.user_id} className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <UserAvatar profile={c.profiles} />
                    {c.completion_note && (
                      <p className="text-xs text-muted-foreground ml-7 italic">&ldquo;{c.completion_note}&rdquo;</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={c.status} />
                    {c.completed_at && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.completed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Notes
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({notes.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet</p>
          ) : (
            <div className="space-y-3">
              {notes.map((n) => (
                <div key={n.user_id} className="space-y-1">
                  <UserAvatar profile={n.profiles} />
                  <p className="text-sm text-muted-foreground ml-7">{n.note_text}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Comments
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({comments.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No comments yet</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <UserAvatar profile={c.profiles} />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{c.upvotes} up / {c.downvotes} down</span>
                      <span>{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground ml-7">{c.comment_text}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

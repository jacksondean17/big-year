import { notFound } from "next/navigation";
import Link from "next/link";
import { getChallengeById } from "@/lib/challenges";
import { updateChallenge } from "@/app/actions/admin-challenges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteChallengeButton } from "@/components/delete-challenge-button";
import { ArchiveChallengeButton } from "@/components/archive-challenge-button";

export default async function EditChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const challenge = await getChallengeById(Number(id), { includeArchived: true });

  if (!challenge) notFound();

  const updateWithId = updateChallenge.bind(null, challenge.id);

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin"
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Back to challenges
        </Link>
      </div>

      {challenge.archived && (
        <div className="max-w-2xl mb-6 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-400">
          This challenge is archived. It is hidden from public view but all data is preserved.
        </div>
      )}

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Edit Challenge #{challenge.id}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateWithId} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="title"
                name="title"
                defaultValue={challenge.title}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                name="description"
                defaultValue={challenge.description}
                rows={3}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="category" className="text-sm font-medium">
                Category
              </label>
              <Input
                id="category"
                name="category"
                defaultValue={challenge.category}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="depth" className="text-sm font-medium">
                  Depth <span className="text-muted-foreground">(1-10)</span>
                </label>
                <Input id="depth" name="depth" type="number" min="1" max="10" defaultValue={challenge.depth ?? ""} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="courage" className="text-sm font-medium">
                  Courage <span className="text-muted-foreground">(1-10)</span>
                </label>
                <Input id="courage" name="courage" type="number" min="1" max="10" defaultValue={challenge.courage ?? ""} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="story_power" className="text-sm font-medium">
                  Story Power <span className="text-muted-foreground">(1-10)</span>
                </label>
                <Input id="story_power" name="story_power" type="number" min="1" max="10" defaultValue={challenge.story_power ?? ""} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="commitment" className="text-sm font-medium">
                  Commitment <span className="text-muted-foreground">(1-10)</span>
                </label>
                <Input id="commitment" name="commitment" type="number" min="1" max="10" defaultValue={challenge.commitment ?? ""} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="estimated_time" className="text-sm font-medium">
                Estimated Time
              </label>
              <Input
                id="estimated_time"
                name="estimated_time"
                defaultValue={challenge.estimated_time}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="completion_criteria"
                className="text-sm font-medium"
              >
                Completion Criteria
              </label>
              <Textarea
                id="completion_criteria"
                name="completion_criteria"
                defaultValue={challenge.completion_criteria}
                rows={3}
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Save Changes</Button>
              <Button variant="outline" asChild>
                <Link href="/admin">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="max-w-2xl mt-12 border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {challenge.archived ? "Unarchive this challenge" : "Archive this challenge"}
              </p>
              <p className="text-sm text-muted-foreground">
                {challenge.archived
                  ? "Make this challenge visible again on the home page and user lists."
                  : "Hide from public view. All data is preserved and leaderboard points still count."}
              </p>
            </div>
            <ArchiveChallengeButton
              challengeId={challenge.id}
              challengeTitle={challenge.title}
              isArchived={challenge.archived}
            />
          </div>

          <div className="border-t pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete this challenge</p>
              <p className="text-sm text-muted-foreground">
                Once deleted, there is no going back. All saves, completions, votes, notes, and comments will be removed.
              </p>
            </div>
            <DeleteChallengeButton
              challengeId={challenge.id}
              challengeTitle={challenge.title}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

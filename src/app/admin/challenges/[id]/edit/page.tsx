import { notFound } from "next/navigation";
import Link from "next/link";
import { getChallengeById } from "@/lib/challenges";
import { updateChallenge } from "@/app/actions/admin-challenges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EditChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const challenge = await getChallengeById(Number(id));

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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="difficulty" className="text-sm font-medium">
                  Difficulty
                </label>
                <select
                  id="difficulty"
                  name="difficulty"
                  defaultValue={challenge.difficulty}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
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

            <div className="space-y-1.5">
              <label htmlFor="points" className="text-sm font-medium">
                Points{" "}
                <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="points"
                name="points"
                type="number"
                min="0"
                defaultValue={challenge.points ?? ""}
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
    </div>
  );
}

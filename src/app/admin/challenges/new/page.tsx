import Link from "next/link";
import { createChallenge } from "@/app/actions/admin-challenges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewChallengePage() {
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
          <CardTitle>New Challenge</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createChallenge} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input id="title" name="title" required />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea id="description" name="description" rows={3} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="difficulty" className="text-sm font-medium">
                  Difficulty
                </label>
                <select
                  id="difficulty"
                  name="difficulty"
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
                <Input id="category" name="category" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="estimated_time" className="text-sm font-medium">
                Estimated Time
              </label>
              <Input
                id="estimated_time"
                name="estimated_time"
                placeholder="e.g. 1-2 hours"
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
                rows={3}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="points" className="text-sm font-medium">
                Points{" "}
                <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input id="points" name="points" type="number" min="0" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">Create Challenge</Button>
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

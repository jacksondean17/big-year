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

            <div className="space-y-1.5">
              <label htmlFor="category" className="text-sm font-medium">
                Category
              </label>
              <Input id="category" name="category" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="depth" className="text-sm font-medium">
                  Depth <span className="text-muted-foreground">(1-10)</span>
                </label>
                <Input id="depth" name="depth" type="number" min="1" max="10" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="courage" className="text-sm font-medium">
                  Courage <span className="text-muted-foreground">(1-10)</span>
                </label>
                <Input id="courage" name="courage" type="number" min="1" max="10" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="story_power" className="text-sm font-medium">
                  Story Power <span className="text-muted-foreground">(1-10)</span>
                </label>
                <Input id="story_power" name="story_power" type="number" min="1" max="10" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="commitment" className="text-sm font-medium">
                  Commitment <span className="text-muted-foreground">(1-10)</span>
                </label>
                <Input id="commitment" name="commitment" type="number" min="1" max="10" />
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

import Link from "next/link";
import { getChallenges } from "@/lib/challenges";
import { Button } from "@/components/ui/button";

export default async function AdminPage() {
  const challenges = await getChallenges();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {challenges.length} challenges
        </p>
        <Button asChild size="sm">
          <Link href="/admin/challenges/new">Add Challenge</Link>
        </Button>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Points</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {challenges.map((challenge, i) => (
              <tr
                key={challenge.id}
                className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}
              >
                <td className="px-4 py-3 text-muted-foreground">
                  {challenge.id}
                </td>
                <td className="px-4 py-3 font-medium">{challenge.title}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {challenge.category}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {challenge.points ?? "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/challenges/${challenge.id}/edit`}
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

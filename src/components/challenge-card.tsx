import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Challenge } from "@/lib/types";

const difficultyColor: Record<string, string> = {
  Easy: "difficulty-easy",
  Medium: "difficulty-medium",
  Hard: "difficulty-hard",
};

export function ChallengeCard({ challenge }: { challenge: Challenge }) {
  return (
    <Link href={`/challenges/${challenge.id}`}>
      <Card className="h-full transition-all hover:-translate-y-0.5">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight">
              {challenge.title}
            </CardTitle>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge variant="outline" className="text-xs">
              {challenge.category}
            </Badge>
            <Badge
              className={`text-xs ${difficultyColor[challenge.difficulty] || ""}`}
              variant="secondary"
            >
              {challenge.difficulty}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="line-clamp-2">
            {challenge.description}
          </CardDescription>
          <p className="mt-2 text-xs text-muted-foreground">
            {challenge.estimated_time}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

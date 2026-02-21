import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Target } from "lucide-react";
import { getDisplayName, type ChallengeCompleter, type CompletionStatus } from "@/lib/types";

interface CompletersListProps {
  completers: ChallengeCompleter[];
  completionCount: number;
}

const statusIcon: Record<CompletionStatus, typeof CheckCircle> = {
  completed: CheckCircle,
  in_progress: Clock,
  planned: Target,
};

const statusLabel: Record<CompletionStatus, string> = {
  completed: "Completed",
  in_progress: "In Progress",
  planned: "Planned",
};

export function CompletersList({ completers, completionCount }: CompletersListProps) {
  if (completers.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle className="size-4" />
          {completionCount} {completionCount === 1 ? "person has" : "people have"}{" "}
          completed this challenge
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {completers.map((completer) => {
            const Icon = statusIcon[completer.status];
            return (
              <div
                key={completer.user_id}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${
                  completer.isCurrentUser ? "bg-primary/10" : "bg-muted"
                }`}
              >
                <Avatar className="size-6">
                  {completer.profiles.avatar_url && (
                    <AvatarImage
                      src={completer.profiles.avatar_url}
                      alt={
                        completer.isCurrentUser
                          ? "You"
                          : getDisplayName(completer.profiles)
                      }
                    />
                  )}
                  <AvatarFallback className="text-xs">
                    {completer.isCurrentUser
                      ? "Y"
                      : getDisplayName(completer.profiles).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={`text-sm ${completer.isCurrentUser ? "font-medium" : ""}`}
                >
                  {completer.isCurrentUser ? "You" : getDisplayName(completer.profiles)}
                </span>
                {completer.status !== "completed" && (
                  <Badge variant="outline" className="ml-1 gap-1 text-xs">
                    <Icon className="size-3" />
                    {statusLabel[completer.status]}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

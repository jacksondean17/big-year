import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import type { ChallengeSaver } from "@/lib/types";

interface SaversListProps {
  savers: ChallengeSaver[];
  count: number;
}

export function SaversList({ savers, count }: SaversListProps) {
  if (count === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4" />
          {count} {count === 1 ? "person has" : "people have"} saved this
          challenge
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {savers.map((saver) => (
            <div
              key={saver.user_id}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${saver.isCurrentUser ? "bg-primary/10" : "bg-muted"}`}
            >
              <Avatar className="size-6">
                {saver.profiles.avatar_url && (
                  <AvatarImage
                    src={saver.profiles.avatar_url}
                    alt={saver.isCurrentUser ? "You" : saver.profiles.display_name}
                  />
                )}
                <AvatarFallback className="text-xs">
                  {saver.isCurrentUser ? "Y" : saver.profiles.display_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className={`text-sm ${saver.isCurrentUser ? "font-medium" : ""}`}>
                {saver.isCurrentUser ? "You" : saver.profiles.display_name}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

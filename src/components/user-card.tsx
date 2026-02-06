import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bookmark } from "lucide-react";
import type { UserWithSaveCount } from "@/lib/types";

interface UserCardProps {
  user: UserWithSaveCount;
  isCurrentUser?: boolean;
}

export function UserCard({ user, isCurrentUser }: UserCardProps) {
  return (
    <Link href={`/users/${user.id}`}>
      <Card className="h-full transition-all hover:-translate-y-0.5">
        <CardContent className="flex items-center gap-4 p-4">
          <Avatar className="size-12">
            {user.avatar_url && (
              <AvatarImage
                src={user.avatar_url}
                alt={user.display_name}
              />
            )}
            <AvatarFallback className="text-lg">
              {user.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">
                {user.display_name}
              </span>
              {isCurrentUser && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  You
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <Bookmark className="size-3.5" />
              <span>
                {user.save_count} {user.save_count === 1 ? "challenge" : "challenges"} saved
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

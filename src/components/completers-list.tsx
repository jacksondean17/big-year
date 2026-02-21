"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Target, ExternalLink } from "lucide-react";
import { getDisplayName, type ChallengeCompleter, type CompletionStatus } from "@/lib/types";
import { ImagePreview, useImagePreview } from "@/components/image-preview";

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const preview = useImagePreview();

  if (completers.length === 0) {
    return null;
  }

  const toggle = (userId: string) => {
    setExpandedId((prev) => (prev === userId ? null : userId));
  };

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
            const isExpanded = expandedId === completer.user_id;
            const hasDetails = completer.completion_note || completer.media.length > 0 || completer.external_url;

            return (
              <div key={completer.user_id} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => toggle(completer.user_id)}
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors ${
                    isExpanded
                      ? "ring-2 ring-primary"
                      : hasDetails
                        ? "hover:bg-accent cursor-pointer"
                        : ""
                  } ${completer.isCurrentUser ? "bg-primary/10" : "bg-muted"}`}
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
                </button>

                {isExpanded && (
                  <div className="mt-2 rounded-md border bg-muted/50 p-3 text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <Icon className="size-3" />
                        {statusLabel[completer.status]}
                      </Badge>
                      {completer.completed_at && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(completer.completed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {completer.completion_note && (
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {completer.completion_note}
                      </p>
                    )}

                    {completer.media.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {completer.media.map((m) => (
                          <div key={m.id} className="overflow-hidden rounded-md">
                            {m.file_type.startsWith("image/") ? (
                              <img
                                src={m.public_url}
                                alt="Proof"
                                className="h-32 w-full cursor-pointer object-cover transition-opacity hover:opacity-80"
                                onClick={() => preview.open(m.public_url)}
                              />
                            ) : (
                              <video
                                src={m.public_url}
                                className="h-32 w-full object-cover"
                                controls
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {completer.external_url && (
                      <a
                        href={completer.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="size-3" />
                        View external proof
                      </a>
                    )}

                    {!completer.completion_note && completer.media.length === 0 && !completer.external_url && (
                      <p className="text-muted-foreground italic">No note or proof added.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
      <ImagePreview src={preview.previewSrc} onClose={preview.close} />
    </Card>
  );
}

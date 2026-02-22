"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle, Clock, Target } from "lucide-react";
import { CompletionDialog } from "@/components/completion-dialog";
import type { Completion, CompletionMedia, CompletionStatus } from "@/lib/types";

interface CompletionButtonProps {
  challengeId: number;
  initialCompletion: Completion | null;
  initialMedia: CompletionMedia[];
  isLoggedIn: boolean;
}

const statusConfig: Record<
  CompletionStatus,
  { label: string; icon: typeof CheckCircle; variant: "default" | "outline" | "secondary" }
> = {
  completed: { label: "Completed", icon: CheckCircle, variant: "default" },
  in_progress: { label: "In Progress", icon: Clock, variant: "secondary" },
  planned: { label: "Planned", icon: Target, variant: "outline" },
};

export function CompletionButton({
  challengeId,
  initialCompletion,
  initialMedia,
  isLoggedIn,
}: CompletionButtonProps) {
  const [open, setOpen] = useState(false);
  const [completion, setCompletion] = useState<Completion | null>(initialCompletion);

  if (!isLoggedIn) return null;

  const status = completion?.status;
  const config = status ? statusConfig[status] : null;
  const Icon = config?.icon ?? Circle;

  return (
    <>
      <Button
        variant={config?.variant ?? "outline"}
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Icon className={`size-4 ${status === "completed" ? "fill-current" : ""}`} />
        {config?.label ?? "Mark Progress"}
      </Button>

      <CompletionDialog
        open={open}
        onOpenChange={setOpen}
        challengeId={challengeId}
        completion={completion}
        initialMedia={initialMedia}
        onUpdate={setCompletion}
      />
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { archiveChallenge, unarchiveChallenge } from "@/app/actions/admin-challenges";

export function ArchiveChallengeButton({
  challengeId,
  challengeTitle,
  isArchived,
}: {
  challengeId: number;
  challengeTitle: string;
  isArchived: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(() => {
      if (isArchived) {
        unarchiveChallenge(challengeId);
      } else {
        archiveChallenge(challengeId);
      }
    });
  };

  return (
    <>
      <Button
        variant={isArchived ? "outline" : "destructive"}
        onClick={() => setOpen(true)}
      >
        {isArchived ? "Unarchive this challenge" : "Archive this challenge"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isArchived ? "Unarchive" : "Archive"} &ldquo;{challengeTitle}&rdquo;?
            </DialogTitle>
            <DialogDescription>
              {isArchived
                ? "This will make the challenge visible again on the home page, user lists, and filters."
                : "This will hide the challenge from the home page, user lists, and filters. All existing data (saves, completions, votes, notes) will be preserved and leaderboard points will still count."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={isArchived ? "default" : "destructive"}
              disabled={isPending}
              onClick={handleConfirm}
            >
              {isPending
                ? (isArchived ? "Unarchiving..." : "Archiving...")
                : (isArchived ? "Yes, unarchive" : "Yes, archive it")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

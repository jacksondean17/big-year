"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getChallengeStats, deleteChallenge } from "@/app/actions/admin-challenges";

type Stats = {
  saves: number;
  completions: number;
  votes: number;
  notes: number;
  comments: number;
};

export function DeleteChallengeButton({
  challengeId,
  challengeTitle,
}: {
  challengeId: number;
  challengeTitle: string;
}) {
  const [step, setStep] = useState<"idle" | "confirm" | "typing" | "final">("idle");
  const [stats, setStats] = useState<Stats | null>(null);
  const [typedName, setTypedName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loadingStats, setLoadingStats] = useState(false);

  const handleInitialClick = async () => {
    setLoadingStats(true);
    const s = await getChallengeStats(challengeId);
    setStats(s);
    setLoadingStats(false);
    setStep("confirm");
  };

  const handleConfirmFirst = () => {
    setStep("typing");
  };

  const handleTypingConfirm = () => {
    setStep("final");
  };

  const handleFinalDelete = () => {
    startTransition(() => {
      deleteChallenge(challengeId);
    });
  };

  const handleClose = () => {
    setStep("idle");
    setTypedName("");
    setStats(null);
  };

  const nameMatches = typedName === challengeTitle;

  return (
    <>
      <Button
        variant="destructive"
        onClick={handleInitialClick}
        disabled={loadingStats}
      >
        {loadingStats ? "Loading..." : "Delete this challenge"}
      </Button>

      {/* Step 1: Warning with stats */}
      <Dialog open={step === "confirm"} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Are you sure you want to delete this challenge?
            </DialogTitle>
            <DialogDescription>
              This action <strong className="text-foreground">cannot be undone</strong>. This will permanently delete the
              challenge <strong className="text-foreground">&ldquo;{challengeTitle}&rdquo;</strong> and
              all associated data.
            </DialogDescription>
          </DialogHeader>

          {stats && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm space-y-1">
              <p className="font-semibold text-destructive mb-2">This will also delete:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>{stats.saves} user save{stats.saves !== 1 ? "s" : ""}</li>
                <li>{stats.completions} completion{stats.completions !== 1 ? "s" : ""}</li>
                <li>{stats.votes} vote{stats.votes !== 1 ? "s" : ""}</li>
                <li>{stats.notes} note{stats.notes !== 1 ? "s" : ""}</li>
                <li>{stats.comments} comment{stats.comments !== 1 ? "s" : ""}</li>
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmFirst}>
              I understand, continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Step 2: Type the challenge name */}
      <Dialog open={step === "typing"} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Confirm deletion
            </DialogTitle>
            <DialogDescription>
              To confirm, type the full challenge name below:
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono select-all">
            {challengeTitle}
          </div>

          <Input
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Type the challenge name here"
            autoFocus
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!nameMatches}
              onClick={handleTypingConfirm}
            >
              Delete this challenge
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Step 3: Final "are you REALLY sure" */}
      <Dialog open={step === "final"} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Last chance. For real this time.
            </DialogTitle>
            <DialogDescription>
              You are about to permanently delete <strong className="text-foreground">&ldquo;{challengeTitle}&rdquo;</strong>.
              There is no undo button. No recycle bin. It&apos;s gone forever.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleClose}>
              Nevermind, keep it
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={handleFinalDelete}
            >
              {isPending ? "Deleting..." : "Yes, delete it forever"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

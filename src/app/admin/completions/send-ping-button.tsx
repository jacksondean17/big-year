"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { sendCompletionPing } from "@/app/actions/admin-completions";

export function SendPingButton({
  userId,
  challengeId,
}: {
  userId: string;
  challengeId: number;
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function handleClick() {
    setState("sending");
    const result = await sendCompletionPing(userId, challengeId);
    setState(result.success ? "sent" : "error");
  }

  if (state === "sent") {
    return (
      <span className="text-xs text-green-600 dark:text-green-400">Sent</span>
    );
  }

  if (state === "error") {
    return (
      <span className="text-xs text-red-600 dark:text-red-400">Failed</span>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      disabled={state === "sending"}
    >
      {state === "sending" ? "Sending..." : "Send Ping"}
    </Button>
  );
}

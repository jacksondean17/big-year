"use client";

import type { ChallengeVerification } from "@/lib/types";
import { useState } from "react";
import { ChallengeVerificationForm } from "./challenge-verification-form";
import { VerificationItem } from "./verification-item";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface UserVerificationsProps {
  challengeId: number;
  userVerifications: ChallengeVerification[];
  userId: string;
}

export function UserVerifications({
  challengeId,
  userVerifications,
  userId,
}: UserVerificationsProps) {
  const [showForm, setShowForm] = useState(false);

  // Convert ChallengeVerification to VerificationWithProfile for display
  const verificationsWithProfile = userVerifications.map((v) => ({
    ...v,
    profiles: {
      id: userId,
      display_name: "You",
      avatar_url: null,
      guild_nickname: null,
    },
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-bold text-slate-900">
          Your Verifications
        </h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-md bg-amber-200 px-3 py-1.5 text-sm font-medium text-slate-900 transition-colors hover:bg-amber-300"
          >
            <Plus className="size-4" />
            Add Verification
          </button>
        )}
      </div>

      {showForm && (
        <ChallengeVerificationForm
          challengeId={challengeId}
          onCancel={() => setShowForm(false)}
        />
      )}

      {userVerifications.length === 0 && !showForm ? (
        <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-600">
            You haven&apos;t added any verifications yet.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-amber-200 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-amber-300"
          >
            <Plus className="size-4" />
            Add Your First Verification
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {verificationsWithProfile.map((verification) => (
            <VerificationItem
              key={verification.id}
              verification={verification}
              currentUserId={userId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

import type { VerificationWithProfile } from "@/lib/types";
import { VerificationItem } from "./verification-item";
import { createClient } from "@/lib/supabase/server";
import { CheckCircle } from "lucide-react";

interface VerificationsListProps {
  verifications: VerificationWithProfile[];
  count: number;
}

export async function VerificationsList({
  verifications,
  count,
}: VerificationsListProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (count === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
        <CheckCircle className="mx-auto mb-2 size-8 text-slate-400" />
        <p className="text-sm text-slate-600">
          No verifications yet. Be the first to verify this challenge!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-bold text-slate-900">
          Community Verifications
        </h3>
        <span className="text-sm text-slate-600">
          {count} {count === 1 ? "verification" : "verifications"}
        </span>
      </div>

      <div className="space-y-4">
        {verifications.map((verification) => (
          <VerificationItem
            key={verification.id}
            verification={verification}
            currentUserId={user?.id}
          />
        ))}
      </div>
    </div>
  );
}

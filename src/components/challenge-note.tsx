"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Check, Loader2 } from "lucide-react";

interface ChallengeNoteProps {
  challengeId: number;
  initialNote: string | null;
}

export function ChallengeNote({
  challengeId,
  initialNote,
}: ChallengeNoteProps) {
  const [note, setNote] = useState(initialNote ?? "");
  const [savedNote, setSavedNote] = useState(initialNote ?? "");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const supabase = createClient();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, [supabase]);

  const saveNote = useCallback(
    async (text: string) => {
      setSaveStatus("saving");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaveStatus("idle");
        return;
      }

      const trimmed = text.trim();

      if (trimmed === "") {
        await supabase
          .from("challenge_notes")
          .delete()
          .eq("user_id", user.id)
          .eq("challenge_id", challengeId);
      } else {
        await supabase.from("challenge_notes").upsert(
          {
            user_id: user.id,
            challenge_id: challengeId,
            note_text: trimmed,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,challenge_id" }
        );
      }

      setSavedNote(trimmed);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
    [supabase, challengeId]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNote(value);
    setSaveStatus("idle");

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (value.trim() !== savedNote) {
        saveNote(value);
      }
    }, 1000);
  };

  const handleBlur = () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (note.trim() !== savedNote) {
      saveNote(note);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  if (isLoggedIn === null || !isLoggedIn) return null;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <StickyNote className="size-4" />
          Private Notes
        </h2>
        <span className="text-xs text-muted-foreground">
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1">
              <Loader2 className="size-3 animate-spin" />
              Saving...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-green-600">
              <Check className="size-3" />
              Saved
            </span>
          )}
        </span>
      </div>
      <Textarea
        placeholder="Add your private notes for this challenge..."
        value={note}
        onChange={handleChange}
        onBlur={handleBlur}
        rows={4}
        maxLength={2000}
        className="resize-y"
      />
      <p className="mt-1 text-xs text-muted-foreground">
        {note.length}/2000 &middot; Only visible to you
      </p>
    </div>
  );
}

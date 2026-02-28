"use client";

import { useState, useTransition } from "react";
import { updateAppSetting } from "@/app/actions/settings";

export function TemperatureControl({ initialValue }: { initialValue: number }) {
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(true);
  const [isPending, startTransition] = useTransition();

  const handleChange = (newValue: number) => {
    setValue(newValue);
    setSaved(false);
  };

  const handleSave = () => {
    startTransition(async () => {
      await updateAppSetting("ranking_temperature", value.toString());
      setSaved(true);
    });
  };

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold">Pair Selection Temperature</h3>
          <p className="text-xs text-muted-foreground">
            Controls how often close-ranked challenges are paired together.
            Lower = more close matchups, higher = more random.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-lg font-bold tabular-nums w-12 text-right">
            {value.toFixed(1)}
          </span>
          {!saved && (
            <button
              onClick={handleSave}
              disabled={isPending}
              className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
          )}
          {saved && !isPending && (
            <span className="text-xs text-muted-foreground">Saved</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Close matches</span>
        <input
          type="range"
          min="0.1"
          max="10"
          step="0.1"
          value={value}
          onChange={(e) => handleChange(parseFloat(e.target.value))}
          className="w-full accent-amber-600"
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">Uniform random</span>
      </div>
    </section>
  );
}

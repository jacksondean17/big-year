"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CATEGORY_OPTIONS } from "@/lib/types";

interface CategorySelectorProps {
  name: string;
  defaultValue?: string[];
}

export function CategorySelector({ name, defaultValue = [] }: CategorySelectorProps) {
  const [selected, setSelected] = useState<string[]>(defaultValue);

  const toggle = (cat: string) => {
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_OPTIONS.map((cat) => {
          const active = selected.includes(cat);
          return (
            <Button
              key={cat}
              type="button"
              variant={active ? "default" : "outline"}
              size="sm"
              onClick={() => toggle(cat)}
            >
              {cat}
            </Button>
          );
        })}
      </div>
      <input type="hidden" name={name} value={selected.join(", ")} />
    </>
  );
}

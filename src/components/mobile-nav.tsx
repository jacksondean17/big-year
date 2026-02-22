"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AuthButton } from "@/components/auth-button";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          <Menu className="size-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <nav className="flex flex-col gap-4 mt-8">
          <a
            href="https://docs.google.com/document/d/143Nhx7JKWc2l0QVy8OtCkHPzdZ82VM8NJQ61VgzJtJ4/edit?tab=t.0"
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setOpen(false)}
          >
            Guide
          </a>
          <Link
            href="/schedule"
            className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setOpen(false)}
          >
            Schedule
          </Link>
          <Link
            href="/users"
            className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setOpen(false)}
          >
            Users
          </Link>
          <Link
            href="/leaderboard"
            className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setOpen(false)}
          >
            Leaderboard
          </Link>
          <div className="border-t border-border pt-4 mt-2">
            <AuthButton />
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

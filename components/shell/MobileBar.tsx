"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav, UserBlock, Wordmark } from "@/components/shell/Sidebar";

export function MobileBar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-sidebar px-4 lg:hidden">
      <Wordmark />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open menu">
            <Menu aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 gap-0 p-0 sm:max-w-xs">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Site navigation and account</SheetDescription>
          <div className="flex h-14 items-center px-5">
            <Wordmark />
          </div>
          <div className="flex-1 px-3 py-2">
            <SidebarNav onNavigate={() => setOpen(false)} />
          </div>
          <UserBlock />
        </SheetContent>
      </Sheet>
    </header>
  );
}

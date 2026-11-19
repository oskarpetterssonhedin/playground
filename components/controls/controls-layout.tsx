"use client";

import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

import { ControlPanel } from "./control-panel";
import type { ControlSchema } from "./types";
import type { Controls } from "./use-controls";

type Props<S extends ControlSchema> = {
  controls: Controls<S>;
  children: React.ReactNode;
  className?: string;
};

/**
 * Wraps the prototype's subject. Desktop (md+): a fixed-width panel beside the
 * subject, never on top of it. Mobile: a floating button opens a bottom sheet.
 * The subject area is a flex column that fills the remaining space.
 */
export function ControlsLayout<S extends ControlSchema>({ controls, children, className }: Props<S>) {
  return (
    <div className="flex min-h-0 flex-1">
      <div className={cn("relative flex min-w-0 flex-1 flex-col", className)}>{children}</div>

      <aside data-chrome className="hidden w-72 shrink-0 border-l md:block">
        <div className="sticky top-0 max-h-dvh overflow-y-auto p-4">
          <h2 className="mb-4 text-sm font-medium">Controls</h2>
          <ControlPanel controls={controls} />
        </div>
      </aside>

      <Drawer modal={false}>
        <DrawerTrigger asChild>
          <Button
            data-chrome
            size="icon"
            variant="secondary"
            aria-label="Controls"
            className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 size-12 rounded-full border shadow-md md:hidden"
          >
            <SlidersHorizontal />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[55dvh] md:hidden">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Controls</DrawerTitle>
            <DrawerDescription>Adjust the prototype parameters</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <ControlPanel controls={controls} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

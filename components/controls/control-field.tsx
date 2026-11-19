"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

import { ColorSwatches } from "./color-swatches";
import { formatNumber, optionLabel, optionValue, paletteOf } from "./logic";
import type { ColorToken, Control } from "./types";

type Props = {
  id: string;
  control: Control;
  value: unknown;
  onChange: (value: unknown) => void;
};

/** Renders one control from the schema. Every interactive target is ≥ 44px tall. */
export function ControlField({ id, control, value, onChange }: Props) {
  switch (control.type) {
    case "slider":
      return (
        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <Label htmlFor={id}>{control.label}</Label>
            <span className="text-muted-foreground tabular-nums">
              {formatNumber(value as number, control.step)}
              {control.unit}
            </span>
          </div>
          <Slider
            id={id}
            className="h-11"
            min={control.min}
            max={control.max}
            step={control.step ?? (control.max - control.min) / 100}
            value={[value as number]}
            onValueChange={([v]) => onChange(v)}
            aria-label={control.label}
          />
        </div>
      );

    case "number":
      return (
        <div className="space-y-2">
          <Label htmlFor={id}>{control.label}</Label>
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            className="h-11"
            min={control.min}
            max={control.max}
            step={control.step}
            value={String(value)}
            onChange={(e) => {
              const n = e.target.valueAsNumber;
              if (!Number.isFinite(n)) return;
              const min = control.min ?? -Infinity;
              const max = control.max ?? Infinity;
              onChange(Math.min(max, Math.max(min, n)));
            }}
          />
        </div>
      );

    case "toggle":
      return (
        <Label htmlFor={id} className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
          {control.label}
          <Switch id={id} checked={value as boolean} onCheckedChange={onChange} />
        </Label>
      );

    case "select":
      return (
        <div className="space-y-2">
          <Label htmlFor={id}>{control.label}</Label>
          <Select value={value as string} onValueChange={onChange}>
            <SelectTrigger id={id} className="h-11! w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {control.options.map((o) => (
                <SelectItem key={optionValue(o)} value={optionValue(o)} className="min-h-11">
                  {optionLabel(o)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "color":
      return (
        <div className="space-y-2">
          <span className="text-sm leading-none font-medium">{control.label}</span>
          <ColorSwatches
            label={control.label}
            palette={paletteOf(control)}
            value={value as ColorToken}
            onChange={onChange}
          />
        </div>
      );
  }
}

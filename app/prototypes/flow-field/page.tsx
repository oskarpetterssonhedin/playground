"use client";

import { ControlsLayout, useControls } from "@/components/controls";

import { controlSchema, SLUG } from "./data";
import { ParticleCanvas } from "./particle-canvas";

export default function FlowFieldPage() {
  const controls = useControls(SLUG, controlSchema);
  return (
    <ControlsLayout controls={controls}>
      <ParticleCanvas settings={controls.values} />
    </ControlsLayout>
  );
}

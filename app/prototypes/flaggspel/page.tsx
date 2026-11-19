"use client";

import dynamic from "next/dynamic";

// The game is browser-only (speech, audio, map camera), so skip SSR.
const Game = dynamic(() => import("./Game"), {
  ssr: false,
  loading: () => <div className="flex-1 bg-background" />,
});

export default function FlaggspelPage() {
  return <Game />;
}

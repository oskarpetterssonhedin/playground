import { Gallery } from "@/components/gallery/gallery";
import { ThemeToggle } from "@/components/theme-toggle";
import { getPrototypes } from "@/lib/prototypes";

export default function HomePage() {
  const prototypes = getPrototypes();
  return (
    <main className="mx-auto max-w-6xl px-4 pt-4 pb-16 sm:px-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Playground</h1>
        <ThemeToggle />
      </header>
      <Gallery prototypes={prototypes} />
    </main>
  );
}

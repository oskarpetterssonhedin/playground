import { PrivatePrototypeShell } from "@/components/private-prototype-shell";
import { getPrototypes } from "@/lib/prototypes";

export default function PrototypesLayout({ children }: LayoutProps<"/prototypes">) {
  const titles = Object.fromEntries(getPrototypes().map((p) => [p.slug, p.title]));
  return <PrivatePrototypeShell titles={titles}>{children}</PrivatePrototypeShell>;
}

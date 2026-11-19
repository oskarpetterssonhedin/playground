"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Global theme. Dark by default; "System" follows the OS preference.
 * Never hardcode a `dark` class on a page — this provider owns it.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
      storageKey="playground:theme"
    >
      {children}
    </NextThemesProvider>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Providers } from "./providers";
import "./styles.css";

export const metadata: Metadata = {
  title: "Orbit",
  description: "Project management for focused teams",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

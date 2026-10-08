import type { Metadata } from "next";
import "./globals.css";
import FontControls from "@/components/font-controls";

export const metadata: Metadata = {
  title: "Plateforme du professeur",
  description: "Espace privé de cours pour les élèves du professeur.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <FontControls />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import MobileContainer from "@/components/layout/MobileContainer";
import Providers from "@/app/providers";

export const metadata: Metadata = {
  title: "OMEGA World",
  description: "Hyper-local marketplace within a secure perimeter.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate/35 antialiased">
        <Providers>
          <MobileContainer>{children}</MobileContainer>
        </Providers>
      </body>
    </html>
  );
}

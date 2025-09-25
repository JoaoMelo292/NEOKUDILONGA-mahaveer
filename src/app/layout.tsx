
import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { CartProvider } from "@/context/cart-context";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { DataProvider } from "@/context/data-context";
import { LanguageProvider } from "@/context/language-context";

export const metadata: Metadata = {
  title: "Neokudilonga",
  description: "A sua fonte de livros e jogos escolares.",
};


// Providers moved to a client component
import Providers from "@/components/ui/providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning>
        <LanguageProvider>
          <DataProvider>
            <Providers>
              {children}
            </Providers>
          </DataProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

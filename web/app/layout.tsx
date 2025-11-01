import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "Генератор вайба — HH.ru",
  description:
    "PWA-сервис для погружения в атмосферу профессий: визуал, звуки, расписание и карьерный путь с данными hh.ru.",
  metadataBase: new URL("https://hh.ru"),
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "Генератор вайба — HH.ru",
    description:
      "Почувствуй вайб профессии изнутри: расписание дня, стек, карьерный путь и живая атмосфера.",
    type: "website",
    locale: "ru_RU",
  },
  twitter: {
    card: "summary_large_image",
    title: "Генератор вайба — HH.ru",
    description:
      "Почувствуй вайб профессии изнутри с визуалом, звуками и карьерным путём.",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF0000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" data-scroll-behavior="smooth">
      <body className="bg-hh-gray-50 text-text-primary font-body antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

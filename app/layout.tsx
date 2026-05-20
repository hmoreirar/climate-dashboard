import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Climate Monitor Dashboard",
  description: "Live temperature and humidity telemetry from your climate monitor.",
};

const themeScript = `
  (function() {
    var stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    }
  })()
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-canvas text-content">{children}</body>
    </html>
  );
}

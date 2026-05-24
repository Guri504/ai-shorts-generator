import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "AI Shorts Generator | Premium Vertical Video Creator",
  description: "Create viral vertical YouTube Shorts from a single topic using Gemini API, Edge TTS, and stock footage.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col antialiased`}>
        <div className="flex flex-col flex-grow">
          {children}
        </div>
      </body>
    </html>
  );
}

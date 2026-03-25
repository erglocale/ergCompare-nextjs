import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AppQueryProvider from "@/components/QueryProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ergCompare — EV vs ICE Fleet Comparison",
  description:
    "Compare Total Cost of Ownership, CO2 emissions, and financial returns between electric and conventional vehicle fleets.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/brand/ergCompare.png", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/brand/ergCompare.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <AppQueryProvider>{children}</AppQueryProvider>
      </body>
    </html>
  );
}

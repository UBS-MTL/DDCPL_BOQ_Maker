import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DDCPL Quotation - Professional Quotation Management",
  description: "Create, manage, and track professional quotations with ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

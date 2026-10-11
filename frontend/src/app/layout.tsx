import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from 'react-hot-toast';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CodePulse AI | Predict Software Problems",
  description: "AI-powered engineering intelligence platform for identifying technical debt, bug-prone modules, maintenance costs, and refactoring opportunities.",
};

import { AuthProvider } from '../lib/auth/AuthService';
import { DemoProvider } from '../contexts/DemoContext';
import { ThemeProvider } from '../contexts/ThemeContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <DemoProvider>
              <Toaster position="top-right" toastOptions={{
                style: { background: 'var(--color-bg-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-base)' }
              }} />
              {children}
            </DemoProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

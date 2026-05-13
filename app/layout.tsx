import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpinBot - Encuestas Conversacionales",
  description: "Plataforma de encuestas conversacionales inteligentes",
};

// NEXT_PUBLIC_ vars are public by design.
// Replit Secrets may have them swapped, so we detect and fix server-side,
// then pass the resolved values as props to the client AuthProvider.
const _v1 = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const _v2 = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const _isUrl = (v: string) => v.startsWith("https://") || v.startsWith("http://");

const RESOLVED_URL = _isUrl(_v1) ? _v1 : _isUrl(_v2) ? _v2 : "";
const RESOLVED_KEY = _isUrl(_v1) ? _v2 : _isUrl(_v2) ? _v1 : "";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <AuthProvider supabaseUrl={RESOLVED_URL} supabaseAnonKey={RESOLVED_KEY}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

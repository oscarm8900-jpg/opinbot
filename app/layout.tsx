import { Metadata } from "next";
import { AuthProvider } from "../contexts/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpinBot - Encuestas Conversacionales",
  description: "Plataforma de encuestas conversacionales inteligentes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Leer las variables de entorno del servidor
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Si no están configuradas, lanza un error claro
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return (
    <html lang="es">
      <body>
        <AuthProvider supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey}>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
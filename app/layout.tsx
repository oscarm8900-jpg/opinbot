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
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

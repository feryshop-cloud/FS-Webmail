import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Feryshop Webmail | Cek OTP",
  description: "Portal pengecekan OTP mandiri",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

  return (
    <html lang="id">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ENV = {
  NEXT_PUBLIC_SUPABASE_URL: ${JSON.stringify(supabaseUrl)},
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${JSON.stringify(supabaseAnonKey)}
};`,
          }}
        />
      </head>
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}

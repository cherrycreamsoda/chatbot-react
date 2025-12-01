import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Chatbot by 11Labs & N8N",
  description: "AI Chatbot made in Next.js, powered by 11Labs and N8N, providing seamless integration for advanced conversational AI experiences.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

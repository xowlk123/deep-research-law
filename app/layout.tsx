import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "庭长阅核软件",
  description: "智能辅助庭长审阅裁判文书草稿",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

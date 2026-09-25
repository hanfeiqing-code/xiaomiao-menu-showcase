import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "小猫宝宝小菜单｜今晚吃什么 · 互动作品演示",
  description: "一个把晚餐选择、菜品内容和双人晚餐回忆放在一起的微信小程序作品演示。",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

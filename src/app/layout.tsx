import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DivergenCIE Coaching",
  description: "World & Country Toppers. Prestige. Results.",
};

import { APP_CONFIG } from "@/lib/config";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth" className={inter.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('dc-theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
        {/* Workaround: Next.js 16 + Turbopack fires performance.measure before a
            server component finishes when it does an early redirect(), producing a
            negative timestamp. Swallow that specific error only.
            Tracked: https://github.com/vercel/next.js/issues/86060 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=window.performance;if(!p||p.__patched)return;var orig=p.measure.bind(p);p.measure=function(){try{return orig.apply(p,arguments);}catch(e){if(e&&(e.message||'').indexOf('negative time stamp')!==-1)return;throw e;}};p.__patched=true;}catch(_){}})();`,
          }}
        />
      </head>
      <body className={APP_CONFIG.PERFORMANCE_MODE ? "perf-mode" : ""} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SITE_URL } from "@/lib/siteSeo";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  // TKT-0285: lets every page build absolute canonical and share-card addresses.
  metadataBase: new URL(SITE_URL),
  title: "DivergenCIE Coaching - Best IGCSE & A Level, IELTS, SAT Country & World Topper Teachers",
  description: "DivergenCIE Coaching is a team of teachers, examiners and previous Cambridge A Level Country & World Toppers accepted at prestigious universities in the UK, including the University of Edinburgh, London School of Economics and Imperial College London.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "DivergenCIE Coaching",
    title: "DivergenCIE Coaching: IGCSE, A Level, IELTS and SAT coaching by country and world toppers",
    description: "Live coaching for Cambridge IGCSE and A Level, AP, IB, SAT and IELTS from teachers, examiners and past country and world toppers.",
    images: [{ url: "/assets/images/logo.jpg", alt: "DivergenCIE Coaching logo" }],
  },
  twitter: { card: "summary", title: "DivergenCIE Coaching", description: "Live coaching for Cambridge IGCSE and A Level, AP, IB, SAT and IELTS." },
  // TKT-0281: lets iPhone treat the home-screen icon as an app.
  appleWebApp: { capable: true, title: "DivergenCIE", statusBarStyle: "default" },
};

// TKT-0281: colours the browser bar / status bar of the installed app (see
// app/manifest.js).
export const viewport = { themeColor: "#1a3c5e" };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`}>
      <body className="min-h-full">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

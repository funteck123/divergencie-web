import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "DivergenCIE Coaching - Best IGCSE & A Level, IELTS, SAT Country & World Topper Teachers",
  description: "DivergenCIE marketing site and DC Portal (student/staff/management dashboards)",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`}>
      <body className="min-h-full">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

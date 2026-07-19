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
  description: "DivergenCIE Coaching is a team of teachers, examiners and previous Cambridge A Level Country & World Toppers accepted at prestigious universities in the UK, including the University of Edinburgh, London School of Economics and Imperial College London.",
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

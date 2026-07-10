import "./globals.css";

export const metadata = {
  title: "DC Portal",
  description: "Local learning-project build of the DCP1 system blueprint",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}

import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "retracted",
  description: "Two language models debate. Jev strikes out the sentences the evidence does not support.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <nav className="mx-auto flex w-full max-w-[1400px] items-baseline justify-between px-4 py-4 text-sm sm:px-6">
          <Link href="/" className="font-semibold tracking-wide">
            retracted
          </Link>
          <Link href="/leaderboard" className="text-muted hover:text-fg">
            Leaderboard
          </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}

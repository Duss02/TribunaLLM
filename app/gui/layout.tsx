import { Fredoka, Nunito } from "next/font/google";

const display = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fredoka",
});

const text = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
});

export default function GuiLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${display.variable} ${text.variable}`}>{children}</div>;
}

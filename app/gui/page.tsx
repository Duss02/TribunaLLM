import { Courtroom } from "@/components/gui/courtroom";
import { type Params, loadArenaProps } from "@/lib/arena-props";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "TribunaLLM · courtroom",
  description: "Two language models argue before Jev, who strikes out what the evidence does not support.",
};

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  return <Courtroom {...await loadArenaProps(await searchParams)} />;
}

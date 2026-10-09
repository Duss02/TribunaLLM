import { Arena } from "@/components/arena/arena";
import { type Params, loadArenaProps } from "@/lib/arena-props";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  return <Arena {...await loadArenaProps(await searchParams)} />;
}

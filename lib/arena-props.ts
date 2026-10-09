import type { ArenaProps } from "@/components/arena/use-arena";
import { listPacks } from "@/lib/debate/packs";
import { DEFAULT_JUDGE_MODEL, judgeModelId } from "@/lib/jev/judge";
import { isMockMode } from "@/lib/mock-mode";
import { pickerOptions } from "@/lib/model-search";
import { describeSetup } from "@/lib/setup";

export type Params = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function judgeLabel(model: string): string {
  const version = /^jev-(.+)$/.exec(model)?.[1];
  const label = version ? `Jev ${version}` : model;
  return model === DEFAULT_JUDGE_MODEL ? label : `${label} (not the validated ${DEFAULT_JUDGE_MODEL})`;
}

/** What every debate screen starts from: the packs, what the server can run, and the address's choices. */
export async function loadArenaProps(params: Params): Promise<ArenaProps> {
  const [packs, setup] = await Promise.all([listPacks(), describeSetup()]);
  const available = pickerOptions(setup);

  const pick = (wanted: string | undefined, options: { key: string }[], fallback: number) =>
    options.find((option) => option.key === wanted)?.key ?? options[fallback]?.key ?? options[0]?.key ?? "";
  const packOptions = packs.map((pack) => ({ key: pack.slug }));

  return {
    packs: packs.map(({ slug, title, motion }) => ({ slug, title, motion })),
    setup,
    judge: { label: judgeLabel(judgeModelId()), mock: isMockMode() },
    initial: {
      auto: first(params.auto) === "1",
      pack: pick(first(params.pack), packOptions, 0),
      pro: pick(first(params.pro), available, 0),
      con: pick(first(params.con), available, 1),
      wanted: { pro: first(params.pro), con: first(params.con) },
    },
  };
}

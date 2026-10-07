import { Arena } from "@/components/arena/arena";
import { listPacks } from "@/lib/debate/packs";
import { DEFAULT_JUDGE_MODEL, judgeModelId, judgeSetupProblem } from "@/lib/jev/judge";
import { isMockMode } from "@/lib/mock-mode";
import { NO_MODELS_HINT, availableModels } from "@/lib/models/pick";

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function judgeLabel(model: string): string {
  const version = /^jev-(.+)$/.exec(model)?.[1];
  const label = version ? `Jev ${version}` : model;
  return model === DEFAULT_JUDGE_MODEL ? label : `${label} (not the validated ${DEFAULT_JUDGE_MODEL})`;
}

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const [packs, available] = await Promise.all([listPacks(), availableModels()]);

  const models = available.map(({ entry }) => ({ key: entry.key, label: entry.label }));
  const problems = [
    judgeSetupProblem(),
    models.length < 2 ? `Need two available models, found ${models.length}. ${NO_MODELS_HINT}` : null,
  ].filter((problem): problem is string => problem !== null);

  const pick = (wanted: string | undefined, options: { key: string }[], fallback: number) =>
    options.find((option) => option.key === wanted)?.key ?? options[fallback]?.key ?? options[0]?.key ?? "";
  const packOptions = packs.map((pack) => ({ key: pack.slug }));

  return (
    <Arena
      packs={packs.map(({ slug, title, motion }) => ({ slug, title, motion }))}
      models={models}
      problems={problems}
      judge={{ label: judgeLabel(judgeModelId()), mock: isMockMode() }}
      initial={{
        auto: first(params.auto) === "1",
        pack: pick(first(params.pack), packOptions, 0),
        pro: pick(first(params.pro), models, 0),
        con: pick(first(params.con), models, 1),
      }}
    />
  );
}

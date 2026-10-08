import type { SetupStatus } from "./setup-status";

export interface PickerOption {
  key: string;
  label: string;
  /** The maker, or "Roster" for the curated models. */
  group: string;
  detail: string;
  /** Part of the roster the project checks, as opposed to the rest of a provider's list. */
  curated: boolean;
}

const squash = (text: string) => text.toLowerCase().replace(/[^a-z0-9.]/g, "");

/**
 * Finds options for what was typed. Every word must appear somewhere in the
 * label, key, maker or detail, and `gpt5` finds `GPT-5`. With nothing typed
 * only the roster is returned, so a long catalogue stays out of sight until
 * it is searched. Roster models rank first, then names that start with the query.
 */
export function searchOptions(
  options: readonly PickerOption[],
  query: string,
  limit: number,
): { shown: PickerOption[]; matched: number } {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    const roster = options.filter((option) => option.curated);
    return { shown: roster, matched: roster.length };
  }

  const wanted = squash(query);
  const matches = options
    .filter((option) => {
      const text = `${option.label} ${option.key} ${option.group} ${option.detail}`.toLowerCase();
      const squashed = squash(text);
      return words.every((word) => {
        const squashedWord = squash(word);
        return text.includes(word) || (squashedWord !== "" && squashed.includes(squashedWord));
      });
    })
    .map((option) => ({ option, prefix: squash(option.label).startsWith(wanted) }))
    .sort(
      (a, b) =>
        Number(b.option.curated) - Number(a.option.curated) ||
        Number(b.prefix) - Number(a.prefix) ||
        a.option.label.localeCompare(b.option.label),
    )
    .map(({ option }) => option);

  return { shown: matches.slice(0, limit), matched: matches.length };
}

const ROUTE_NAMES: Record<string, string> = {
  gateway: "AI Gateway",
  openrouter: "OpenRouter",
  direct: "the provider",
  scripted: "scripted debater",
};

/** The roster models the keys reach, then everything else they unlock. */
export function pickerOptions(setup: SetupStatus): PickerOption[] {
  const roster = setup.models
    .filter((model) => model.status === "available")
    .map((model) => ({
      key: model.key,
      label: model.label,
      group: "Roster",
      detail: `via ${ROUTE_NAMES[model.route ?? ""] ?? model.route}`,
      curated: true,
    }));
  const rest = setup.catalogue.map((model) => ({
    key: model.key,
    label: model.label,
    group: model.vendor,
    detail: model.detail ? `${model.via} · ${model.detail}` : model.via,
    curated: false,
  }));
  return [...roster, ...rest];
}

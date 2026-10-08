import { keyFor, modelList } from "./availability";
import { REGISTRY } from "./registry";
import { ListError, type ListedModel, allSources, targetsFor } from "./routes";

/** A model from a provider's full list, picked by its `channel:id` key. */
export interface CatalogueModel {
  key: string;
  label: string;
  vendor: string;
  /** The source it comes through, such as "AI Gateway" or "Anthropic". */
  via: string;
  detail: string;
}

export const modelKey = (channel: string, id: string) => `${channel}:${id}`;

function compact(tokens: number): string {
  return tokens >= 1_000_000 ? `${+(tokens / 1_000_000).toFixed(1)}M` : `${Math.round(tokens / 1000)}k`;
}

function detailOf(model: ListedModel): string {
  const parts: string[] = [];
  if (model.contextWindow) parts.push(`${compact(model.contextWindow)} context`);
  if (model.inputPrice !== undefined && model.outputPrice !== undefined) {
    parts.push(`$${+model.inputPrice.toFixed(2)} / $${+model.outputPrice.toFixed(2)} per 1M tokens`);
  }
  return parts.join(" · ");
}

/** Every route and id the roster already covers, so a model is not offered twice. */
function inRoster(): Set<string> {
  return new Set(REGISTRY.flatMap((entry) => targetsFor(entry).map((t) => modelKey(t.channel, t.id))));
}

/**
 * Every chat model the keys in scope unlock, beyond the roster. Embedding,
 * image and speech models are left out. A source whose key is missing is
 * skipped; one that fails is reported in `notes`.
 */
export async function buildCatalogue(): Promise<{ models: CatalogueModel[]; notes: string[] }> {
  const covered = inRoster();
  const notes: string[] = [];

  const perSource = await Promise.all(
    allSources().map(async (source) => {
      const apiKey = keyFor(source);
      if (!apiKey) return [];
      try {
        const { models } = await modelList(source, apiKey);
        return models
          .filter((model) => model.chat && !covered.has(modelKey(source.channel, model.id)))
          .map((model) => ({
            key: modelKey(source.channel, model.id),
            label: model.name,
            vendor: model.vendor,
            via: source.label,
            detail: detailOf(model),
          }));
      } catch (error) {
        if (!(error instanceof ListError)) throw error;
        notes.push(
          error.status === 401 || error.status === 403
            ? `${source.keyVariable} was rejected (HTTP ${error.status}).`
            : `Could not read the ${source.label} model list: ${error.message}.`,
        );
        return [];
      }
    }),
  );

  return { models: perSource.flat(), notes };
}

import { type ModelStatus, listAvailability } from "./availability";

export const NO_MODELS_HINT =
  "Add AI_GATEWAY_API_KEY (one key for the roster) or OPENROUTER_API_KEY on the Settings page or in .env.local, or run with JEV_MOCK=1. Run pnpm models to see what is available.";

export async function availableModels(): Promise<ModelStatus[]> {
  return (await listAvailability()).filter((status) => status.status === "available");
}

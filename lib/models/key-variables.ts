import { REGISTRY } from "./registry";
import { targetsFor } from "./routes";

export const JUDGE_KEY_VARIABLE = "TYPESAFE_API_KEY";

export function debaterKeyVariables(): string[] {
  return [...new Set(REGISTRY.flatMap((entry) => targetsFor(entry).map((target) => target.keyVariable)))];
}

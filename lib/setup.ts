import { judgeSetupProblem } from "@/lib/jev/judge";
import { listAvailability } from "@/lib/models/availability";
import { NO_MODELS_HINT } from "@/lib/models/pick";
import type { SetupStatus } from "./setup-status";

/** What the keys in scope, saved in the browser or set on the server, make possible. */
export async function describeSetup(): Promise<SetupStatus> {
  const models = (await listAvailability()).map(({ entry, status, route, detail }) => ({
    key: entry.key,
    label: entry.label,
    status,
    route,
    detail,
  }));
  const available = models.filter((model) => model.status === "available").length;
  const problems = [
    judgeSetupProblem(),
    available < 2 ? `Need two available models, found ${available}. ${NO_MODELS_HINT}` : null,
  ].filter((problem): problem is string => problem !== null);
  return { problems, models };
}

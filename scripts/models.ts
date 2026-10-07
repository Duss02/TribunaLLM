import { isMockMode } from "@/lib/mock-mode";
import { listAvailability } from "@/lib/models/availability";
import { JUDGE_KEY_VARIABLE, debaterKeyVariables } from "@/lib/models/key-variables";

const statuses = await listAvailability();

const rows = [
  ["key", "label", "status", "route", "detail"],
  ...statuses.map(({ entry, status, route, detail }) => [
    entry.key,
    entry.label,
    status,
    route ?? "-",
    detail,
  ]),
];
const widths = rows[0]!.map((_, column) => Math.max(...rows.map((row) => row[column]!.length)));
for (const row of rows) {
  console.log(
    row
      .map((cell, column) => cell.padEnd(widths[column]!))
      .join("  ")
      .trimEnd(),
  );
}

const isSet = (variable: string) => Boolean(process.env[variable]?.trim());
console.log("");
console.log(
  `${JUDGE_KEY_VARIABLE}: ${isSet(JUDGE_KEY_VARIABLE) ? "set" : "not set"}${isMockMode() ? " (JEV_MOCK=1, judge is fake)" : ""}`,
);
for (const variable of debaterKeyVariables())
  console.log(`${variable}: ${isSet(variable) ? "set" : "not set"}`);

const available = statuses.filter(({ status }) => status === "available").length;
console.log("");
console.log(`${available} of ${statuses.length} models available.`);
if (available === 0) {
  console.log(
    "Set AI_GATEWAY_API_KEY (one key for the roster) or OPENROUTER_API_KEY in .env.local, or run with JEV_MOCK=1.",
  );
}

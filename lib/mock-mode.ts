export function isMockMode(): boolean {
  return process.env.JEV_MOCK === "1";
}

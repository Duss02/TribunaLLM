import { readFile } from "node:fs/promises";
import path from "node:path";
import { LEADERBOARD_FILE } from "@/lib/bench/load";

export const dynamic = "force-static";

export async function GET(): Promise<Response> {
  const body = await readFile(path.join(process.cwd(), LEADERBOARD_FILE), "utf8").catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    },
  );
  if (body === null) return Response.json({ error: "No leaderboard has been built yet." }, { status: 404 });
  return new Response(body, {
    headers: {
      "content-type": "application/json",
      "content-disposition": 'attachment; filename="leaderboard.json"',
    },
  });
}

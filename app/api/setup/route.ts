import { z } from "zod";
import { withKeys } from "@/lib/credentials";
import { keysSchema } from "@/lib/keys";
import { describeSetup } from "@/lib/setup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const request = z.object({ keys: keysSchema.optional() });

export async function POST(incoming: Request): Promise<Response> {
  const parsed = request.safeParse(await incoming.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "The request body is not a valid set of keys." }, { status: 400 });

  const status = await withKeys(parsed.data.keys ?? {}, describeSetup);
  return Response.json(status, { headers: { "cache-control": "no-store" } });
}

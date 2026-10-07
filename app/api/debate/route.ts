import { z } from "zod";
import { encodeEvent } from "@/lib/debate/sse";
import { runDebate } from "@/lib/debate/orchestrator";
import { loadPack } from "@/lib/debate/packs";
import { judgeSetupProblem } from "@/lib/jev/judge";
import { resolveDebater } from "@/lib/models/debater";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const request = z.object({
  pack: z.string(),
  pro: z.string(),
  con: z.string(),
  rounds: z.number().int().min(1).max(5),
  maxWords: z.number().int().min(30).max(250),
  strictMode: z.boolean(),
});

const refuse = (message: string, status = 400) => Response.json({ error: message }, { status });

export async function POST(incoming: Request): Promise<Response> {
  const parsed = request.safeParse(await incoming.json().catch(() => null));
  if (!parsed.success) return refuse("The request body is not a valid debate configuration.");
  const { pack: slug, pro: proKey, con: conKey, rounds, maxWords, strictMode } = parsed.data;

  const problem = judgeSetupProblem();
  if (problem) return refuse(problem, 412);

  let config;
  try {
    const [pack, pro, con] = await Promise.all([
      loadPack(slug),
      resolveDebater(proKey, { paced: true }),
      resolveDebater(conKey, { paced: true }),
    ]);
    config = { pack, pro, con, rounds, maxWords, strictMode, seed: Math.floor(Math.random() * 2 ** 31) };
  } catch (error) {
    return refuse(error instanceof Error ? error.message : "Could not set up the debate.");
  }

  const stop = new AbortController();
  incoming.signal.addEventListener("abort", () => stop.abort());
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of runDebate({ ...config, signal: stop.signal })) {
          controller.enqueue(encoder.encode(encodeEvent(event)));
        }
      } catch (error) {
        if (!stop.signal.aborted) {
          const message = error instanceof Error ? error.message : "The debate stopped unexpectedly.";
          controller.enqueue(encoder.encode(encodeEvent({ type: "error", message })));
        }
      }
      controller.close();
    },
    cancel() {
      stop.abort();
    },
  });

  return new Response(body, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

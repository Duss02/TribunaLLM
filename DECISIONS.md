# Decisions

Choices the brief left open, and why. Where this repository departs from the brief it says so.

## Project

- The copyright holder in `LICENSE` is the git author of this repository (Michele Dussin). Change it if the repository moves.
- Versions are whatever `pnpm add` resolved on 2026-10-07: Next.js 16.4, React 19.3, AI SDK (`ai`) 7.0, TypeScript 7.0, Vitest 5, zod 4, Tailwind 4, `@typesafe-ai/sdk` 0.6. The AI SDK calls were written against the docs shipped inside `node_modules/ai/docs`, not from memory.
- Scripts load `.env.local` through Node's `--env-file-if-exists` flag instead of adding a dotenv dependency, so Node 22.9 or newer is required.
- Prettier is a dev dependency (`pnpm format`) so the whole repository has one formatting.
- Commit messages are one line with no trailers, as the brief asks.
- `pnpm build` on the author's machine prints a Turbopack warning about a `pnpm-lock.yaml` in the home directory. It comes from outside the repository and is ignored.
- The README has a commented placeholder for the retraction GIF, not an image link, because the file does not exist yet.

## Models

- The roster is 16 models, two per large vendor. Every id was checked against the Vercel AI Gateway and OpenRouter model lists on 2026-10-07. Some differ from what a memory of model names would suggest: xAI is `spacexai/` on the gateway and `x-ai/` on OpenRouter, and Qwen 3.8 Max is `qwen/qwen3.8-max-0902` on OpenRouter.
- `openWeights` is true where OpenRouter lists a Hugging Face repository for the model (DeepSeek V4 Pro and Flash, Kimi K3, Qwen 3.8 27B, Ministral 14B, Llama 4 Maverick). It is false otherwise.
- Route order is gateway, then OpenRouter, then direct. A route is used when its key is set and its model list contains the id.
- The model lists for direct providers are fetched too (their own `/models` endpoints, with the key in a header), so `unknown-id` works on every route. Direct ids are the gateway ids without the vendor prefix, except Anthropic, whose ids use hyphens as the AI SDK docs show. Mistral Large 4 has no direct id because it was released the day before this was written and its direct id could not be confirmed; Ministral 14B does.
- If a model list cannot be reached the entry stays `available` and the table says it was not verified. If a list answers 401 or 403 the key is reported as rejected and the entry is `missing-key`.
- OpenRouter and the OpenAI-compatible direct providers (DeepSeek, Moonshot, Mistral, xAI) go through `@ai-sdk/openai-compatible` rather than a provider package each, to keep the dependency list short. Anthropic, OpenAI and Google use their own packages.
- Every debater gets `reasoning: "low"` (the AI SDK's portable setting), temperature 0.7, a 2,000 token output limit, and a 45 second stall timeout. Claude Opus 5.5, Claude Sonnet 5.5 and Kimi K3 reject a temperature parameter according to the gateway's model metadata, so for them it is omitted (`fixedTemperature`). This is listed as a caveat on the leaderboard.
- The word cap is in the prompt. A model that ignores it is cut off at twice the cap and the turn is marked `truncated`, so one model cannot run up the judge bill.
- Token usage is read after a turn finishes. Providers do not report it for aborted streams, so tokens for a rewound or truncated attempt are missing from the totals.
- Under `JEV_MOCK=1`, a registry model with no usable route becomes `available` through a scripted debater that quotes the pack. Each scripted model has its own seed and its own tendency to alter a number, so a mock tournament has something to rank. The brief only asked for a mock judge, but a demo with no keys cannot have a real debater.

## Engine

- Rebuttal is asked and scored from round 2 on, for both sides. The brief skips it only for PRO in round 1, but debaters are told to answer the opponent "from round 2 on", so scoring CON's opening turn on rebuttal would score something it was not asked to do.
- Debaters see the opponent's turns as delivered, including sentences that were later retracted. The judge sees only what survived. Sentences dropped by a rewind are in neither.
- Strict mode, exactly: a retraction for a sentence in the turn still being generated aborts the generation. That sentence stays on screen, struck, and counts for points. Everything after it is dropped (a `rewind` event lists the ids), and the turn restarts with a system note quoting the sentence and the surviving text as context. Sentence ids are never reused after a rewind. A turn restarts at most twice, and only while the model is still generating, so a model that finishes before the first verdict arrives cannot be rewound.
- A turn whose sentences were all retracted gets no turn judgment.
- If one sentence's Jev call fails it is marked `unjudged`: it scores 0, is not counted as a claim, and is counted in the judge's error total. A rejected or missing key, or a final judgment that fails, stops the debate instead. In a tournament that debate is recorded as failed.
- `J` is 0 for both sides when `tie` is the most likely verdict, which is how "0 on tie" is read. Otherwise it is `3 × (p_side − p_other)`.
- The probability-weighted `E` weights each sentence by `is_claim` and uses `+1 × supported`, `−2 × contradicts` and `−1 × (1 − supported)(1 − contradicts)`. It is stored, never ranked on.
- Judge requests: 15 second timeout per attempt, SDK default retries, at most 8 in flight. Latency is the time inside the request including retries. Cost is input tokens times $0.042 per million.
- The seed that shuffles the judge's evidence is random in the arena and derived from the run id, pack and models in a tournament.
- Sentence splitting waits for one character after a boundary before confirming it, so a streamed sentence is judged a few tokens after it ends. It skips titles, initials, dotted acronyms, `No.` before a digit and a period before a lowercase word, and keeps a `[P07]` that follows the period with its sentence.
- Packs: passages are paragraphs, at most 120 words, at most 200 per pack, at most 24,000 tokens (characters divided by four). The shipped packs are checked by test to have 14 to 26 passages and mostly numeric content.

## Tournament and leaderboard

- A result line is `ok` or `failed`. `--resume` skips only `ok` lines, so failures are retried. The run id names the file; without `--run` it is derived from the start time, and `--resume` alone continues the most recently modified file.
- Mock-mode runs write to `bench/results-mock/` (ignored by git) so fake numbers cannot reach the committed leaderboard. If mock results are aggregated anyway, the leaderboard carries `mock: true` and the page says so.
- The builder refuses to rank results from more than one judge model or rules version unless `--judge` and `--rules` pick one.
- Rating: Bradley-Terry by minorisation-maximisation with a quarter-draw prior against every other model, 500 bootstrap resamples, 95 percent interval. A pack-level best and worst model needs at least 10 claims.
- The dry-run cost estimate assumes 22 words per sentence and a fixed overhead for the question text. It is labelled an estimate.
- The chart uses the eight validated categorical slots of the data-visualisation palette for eight vendors, in both modes. xAI, the ninth, and any unknown vendor share a neutral grey. The bars are also labelled with the model name and the table above carries every value, because three of the light-mode colours are below 3:1 against the page.

## Interface

- One system typeface, one accent colour and the three verdict colours (green, amber, red). Dark and light follow the system setting; there is no toggle.
- On narrow screens the judge panel comes first and the debaters stack below it.
- The only query parameters are `auto`, `pack`, `pro` and `con`, as the brief lists. Demo mode is a checkbox.

## Evidence packs

The ten packs were written by research agents that were told to verify each figure against a primary or reputable source on the web and to leave out anything they could not confirm. They are summaries released as CC0-1.0, and their `source` field lists what was used. No domain expert has reviewed them. What the agents reported, so a reviewer knows where to look first:

- **Weakest sourcing** (taken from search summaries rather than the primary text): in `remote-work`, Ding and Ma's 137 firms; in `four-day-week`, the Belgian 9.5-hour days, the wording of the Rowley letter, the Estevao and Sa abstract and the Utah audit's "just over $500,000"; in `crewed-spaceflight`, the IPCC medians, the Apollo 17 rover distance and EVA hours, the Hubble servicing dates, the Perseverance and Mars Exploration Rover costs and the date Spirit got stuck, all confirmed only through Wikipedia; the original 3.3 billion euro Flamanville estimate in `nuclear-power` has no price year.
- **Sources disagreed, choice made:** Ford's five-day week date (only the year 1926 is used); the Gibbs et al. productivity fall (8 to 19 percent from the 2023 version, not about 20 percent from the 2021 draft); Emanuel, Harrington and Pallais coding feedback (18.3 percent from the June 2026 revision, not 22 percent); the Trip.com quit rate (33 percent from Nature, not 35 percent); New York's first-year entry drop (the MTA's 11.7 percent, not the governor's 11 percent); the Stockholm referendum (53 percent); the Rent Guidelines Board vote (25 June); the House vote on H.R. 139 (the Clerk's 14 July 2026 tally of 308 to 117); the OpenResearch results (the August 2026 NBER revision, not the 2024 version); the Philadelphia beverage tax (the JAMA abstract's 51.0 percent fall and 24.4 percent cross-border offset, not the press release's net 38 percent); Allcott et al. suspensions (15 percent from the September 2026 revision); the cost of Germany's nuclear phase-out (the published 3 to 8 billion euros a year, not the working paper's 12 billion dollars); Flamanville's cost (the Cour des comptes' 23.7 billion euros in 2023 euros, not EDF's 22.6 billion); Apollo's cost (the Planetary Society's 25.8 billion dollars, attributed in the passage, not NASA's 1973 figure of 25.4 billion).
- **Left out because they could not be verified:** among others the Singapore scheme figures, the Sims 2007 Massachusetts study, Beland and Murphy's school counts, WHO's country count for sugar taxes, the Wales care-leaver outcomes, Poland's 2025 clock-change proposal, the cost and status of Mars Sample Return and China's crewed lunar target date.
- Several agents ran out of web-search budget part way through and verified the rest by fetching papers and abstracts directly.

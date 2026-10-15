# Decisions

Choices that were not obvious, and why.

## Project

- The project was renamed from `retracted` to TribunaLLM on 2026-10-08. The browser storage key for saved API keys stays `retracted.keys`, so keys saved before the rename keep working.
- Scripts load `.env.local` through Node's `--env-file-if-exists` flag instead of adding a dotenv dependency, so Node 22.9 or newer is required.

## Models

- The roster is 16 models, two per large vendor. Every id was checked against the Vercel AI Gateway and OpenRouter model lists on 2026-10-07. Some differ from what a memory of model names would suggest: xAI is `spacexai/` on the gateway and `x-ai/` on OpenRouter, and Qwen 3.8 Max is `qwen/qwen3.8-max-0902` on OpenRouter.
- `openWeights` is true where OpenRouter lists a Hugging Face repository for the model (DeepSeek V4 Pro and Flash, Kimi K3, Qwen 3.8 27B, Ministral 14B, Llama 4 Maverick). It is false otherwise.
- Route order is gateway, then OpenRouter, then direct. A route is used when its key is set and its model list contains the id.
- DeepSeek's direct model list (2026-10-09) has `deepseek-v4-pro` and `deepseek-flash`, so the direct id of DeepSeek V4 Flash is `deepseek-flash`. It is assumed to be the same model OpenRouter lists as `deepseek/deepseek-v4-flash`; the id actually used is recorded in each result's provenance.
- The model lists for direct providers are fetched too (their own `/models` endpoints, with the key in a header), so `unknown-id` works on every route. Direct ids are the gateway ids without the vendor prefix, except Anthropic, whose ids use hyphens as the AI SDK docs show. Mistral Large 4 has no direct id because it was released the day before this was written and its direct id could not be confirmed; Ministral 14B does.
- If a model list cannot be reached the entry stays `available` and the table says it was not verified. If a list answers 401 or 403 the key is reported as rejected and the entry is `missing-key`.
- OpenRouter and the OpenAI-compatible direct providers (DeepSeek, Moonshot, Mistral, xAI) go through `@ai-sdk/openai-compatible` rather than a provider package each, to keep the dependency list short. Anthropic, OpenAI and Google use their own packages.
- Every debater gets `reasoning: "low"` (the AI SDK's portable setting), temperature 0.7, a 2,000 token output limit, and a 45 second stall timeout. Claude Opus 5.5, Claude Sonnet 5.5 and Kimi K3 reject a temperature parameter according to the gateway's model metadata, so for them it is omitted (`fixedTemperature`). This is listed as a caveat on the leaderboard.
- The word cap is in the prompt. A model that ignores it is cut off at twice the cap and the turn is marked `truncated`, so one model cannot run up the judge bill.
- Token usage is read after a turn finishes. Providers do not report it for aborted streams, so tokens for a rewound or truncated attempt are missing from the totals.
- Under `JEV_MOCK=1`, a registry model with no usable route becomes `available` through a scripted debater that quotes the pack. Each scripted model has its own seed and its own tendency to alter a number, so a mock tournament has something to rank. A mock judge alone is not enough: a demo with no keys cannot have a real debater.

## Engine

- Rebuttal is asked and scored from round 2 on, for both sides. Debaters are told to answer the opponent "from round 2 on", so scoring CON's opening turn on rebuttal would score something it was not asked to do.
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

- Every result line written since 2026-10-09 carries the full `transcript` (each turn's sentences with the verdict, the judge's three probabilities, the best passage and the ids of the passages the judge read) and a `provenance` block (route and model id per side, word cap, a hash of the prompt, question and rules source files, a hash of the pack file, and the library's build date and size). Without the transcript a retraction cannot be audited and the judge cannot be asked again about the same sentence; without the provenance a line cannot be traced to the prompts and evidence that produced it. Older lines without either still load.
- The debaters' output budget is 4,000 tokens, up from 2,000. DeepSeek V4 Pro at `low` reasoning spent up to 1,100 reasoning tokens on one turn, and a turn whose whole budget went to reasoning came back empty and failed the debate. A turn that comes back empty is now asked for once more (`attempts: 2` in the record) before the debate fails; in the first blind pilot this fired once in 180 debates.
- The leaderboard builder refuses to mix debates of different lengths unless `--rounds` picks one, because points per debate grow with the number of turns.
- `pnpm spend` prices the tokens in the result files with the list prices in `lib/bench/prices.ts` (from OpenRouter's public list on 2026-10-09) and sums them per model and vendor, so a run can be kept under a budget. Jev cost is measured, not priced.

- A result line is `ok` or `failed`. `--resume` skips only `ok` lines, so failures are retried. The run id names the file; without `--run` it is derived from the start time, and `--resume` alone continues the most recently modified file.
- Mock-mode runs write to `bench/results-mock/` (ignored by git) so fake numbers cannot reach the committed leaderboard. If mock results are aggregated anyway, the leaderboard carries `mock: true` and the page says so.
- The builder refuses to rank results from more than one judge model or rules version unless `--judge` and `--rules` pick one.
- Rating: Bradley-Terry by minorisation-maximisation with a quarter-draw prior against every other model, 500 bootstrap resamples, 95 percent interval. A pack-level best and worst model needs at least 10 claims.
- The dry-run cost estimate assumes 22 words per sentence and a fixed overhead for the question text. It is labelled an estimate.

## Validation scripts

The scripts in `scripts/analysis/` check the judge rather than the debaters. They read the transcripts in `bench/results/` and write Markdown reports and JSONL to `bench/analysis/`. The findings of the first run are in `bench/analysis/REPORT.md`.

- `analysis:sweep` recomputes verdicts and winners under other thresholds from the stored probabilities. No network.
- `analysis:perturb` alters one number in sentences the judge called supported and asks again; `analysis:perturb-variants` asks the same pairs with other question designs (sharper description of `contradicts`, evidence narrowed to the best-matching passages, a direct yes/no question). Jev only.
- `analysis:rejudge` judges every claim of a run again with the sharp question over the top three passages, to show what the contradiction counts would be under that design. Jev only.
- `analysis:recall` has a cheap model write one claim per sampled library passage and measures whether BM25 ranks the source passage in the top 20. Debater route only.
- `analysis:judge2` asks a language model the judge's questions on a stratified sample and reports agreement with Jev (Cohen's κ). Debater route only.
- `analysis:position` asks the final verdict with PRO listed first and with CON listed first. Jev only.
- `analysis:review` writes a sheet of sentences with the passages that match them best, for a reader to mark RIGHT, WRONG or UNCLEAR. No network. `hand-review-pilot-blind-a.md` is one such sheet filled in by a language model, not by a person, and says so.

## DebateCheck

- The pairs are mined from the blind transcripts: every `supported` sentence with a number outside a citation, altered once with a fixed seed (years by 3 to 7, percentages by a factor, other figures roughly doubled), the replacement rejected if it occurs anywhere in the evidence. Numbers only, because a number is the one edit whose effect on the label is certain. The unchanged side is the debate judge's verdict, not a human label, so false-alarm rates are upper bounds.
- The split is by motion (four train, two held out), never by pair, so a criterion text or threshold fitted on the training motions is tested on subjects it never saw.
- Seven ways of asking Jev the same thing are kept apart on purpose, because they move different things: the wording of the `contradicts` option moves ranking and scale, the evidence selection moves the scale, the threshold is an offset, and the framing (Autorubric's task sentence, criterion-as-statement and MET/UNMET definitions, reproduced verbatim from the library's source) moves all of them. The framed form is the one the arena should adopt.
- The optimisation loop changes only the text of one option, keeps the form and the other options fixed, scores candidates by AUROC on a 400-pair training sample, and measures the winner once on the held-out motions. It is the decision-model counterpart of Autorubric's `held_out` strategy, which the library offers for LLM judges only.
- Autorubric is used as released (1.6.1, in a virtual environment outside the repository) to validate the held-out split with its own `DecisionModelConfig`, metrics, bootstrap and `calibrate_escalation`, so the headline number does not depend on this repository's client. Dataset descriptions are opaque item numbers; the library sends only the prompt, the submission and the questions, which was checked in its source.
- The paper's tables and number macros are generated (`pnpm debatecheck:paper`) from the JSON the analysis writes; nothing in `paper/tables` or `paper/data` is typed by hand. The LaTeX is compiled on Overleaf.

## Interface

- `/gui` stages the same debate as an isometric 3D courtroom (three.js, no external models). It runs on the arena's hook (`components/arena/use-arena.ts`), so it cannot drift from the arena's rules. The scene's colours are hex in `components/gui/scene/palette.ts` because three.js cannot read CSS variables; with `prefers-reduced-motion` the characters change place without walking. Nameplates are fixed on the floor beside the tables so they never cover a character.

## Models beyond the roster

The roster is the 16 models whose ids, open-weights status and quirks were checked by hand. It used to be the only choice in the menus. The menus now also reach every chat model the keys in scope unlock, found by searching.

- The catalogue is built from the model lists the availability check already fetches, so it costs no extra request: the gateway's list, OpenRouter's, and each direct provider's. A source is read only when its key is in scope.
- Models are left out when the list says they are not chat models (the gateway's `type`, OpenRouter's output modalities, Google's generation methods), when they are OpenRouter `:batch` endpoints, and when the roster already covers that route and id. OpenAI, DeepSeek, Moonshot, Mistral and xAI lists carry no type, so ids that name another job (`embed`, `whisper`, `tts`, `dall-e`, `image` and a few more) are filtered by a pattern. It is a heuristic and can hide a chat model whose id happens to match.
- The same model reached by two routes appears twice, once per route, with the route shown. The roster entry is chosen by route priority, but in the catalogue the route changes price and behaviour, so the choice is the reader's.
- A catalogue model is named `channel:id`, where the channel is `gateway`, `openrouter` or a provider. The key splits at the first colon, so OpenRouter ids such as `...:free` survive. These entries are made on the spot (`lib/models/dynamic.ts`): `vendor` is `unknown` and `openWeights` is false, which is a placeholder, not a claim, and is never shown.
- Temperature: a catalogue model is sent 0.7 only when its list says it accepts a temperature (the gateway's `temperature` flag, OpenRouter's `supported_parameters`). Otherwise the parameter is omitted and the provider's default is used, because a request a model rejects is worse than a different temperature. The direct providers' lists say nothing, so those models always run at the provider's default.
- The tournament accepts roster keys only. A leaderboard row needs the maker, open-weights status and temperature handling to be known and true, and a model picked from a list has none of those verified.
- The menu shows only the roster until something is typed, then at most 40 results, roster first and then names that start with the query. Matching ignores punctuation, so `gpt5` finds `GPT-5`.
- The "Ready" message and the two-model minimum count catalogue models, so a visitor with one provider key is not told they lack models.

## Settings page

Keys were first read on the server only and never written to disk. A page that remembers a visitor's keys has to put them somewhere, so this is a deliberate change. The options were: write them to `.env.local` from the page, hold them in the server's memory, or keep them in the browser.

- Keys are kept in the browser's `localStorage` under one entry and sent in the body of each `/api/debate` and `/api/setup` request, never in a URL. This keeps the "nothing secret on the server's disk" property, works for a hosted instance where every visitor brings their own keys, and survives a restart of the server. Writing `.env.local` from a web page would make any request to the app able to overwrite credentials on disk, and server memory would be shared by everyone who reaches the server and lost on restart.
- On the server a request's keys travel in an `AsyncLocalStorage` scope (`lib/credentials.ts`). `getKey` returns the request's key first and the environment's second, per variable. Nothing is assigned to `process.env`, so concurrent requests cannot see each other's keys; tests run 40 interleaved calls and two simultaneous debates to check it.
- Model lists that sit behind a key (the direct providers) are cached per key, so one visitor's accepted key cannot vouch for another's rejected one. Gateway and OpenRouter lists are public and cached once.
- The Settings page shows only the last four characters of a saved key, never the whole value, and `/api/setup` returns availability, never keys.
- The command-line tools do not read the browser, so they still need `.env.local`.
- If the browser blocks storage the page says so and the app works from `.env.local`.

## Debate modes and reference libraries

- Blind mode is the default in the arena, the courtroom, the CLI and the tournament. A curated pack forces every model to argue from the same few hundred words, which measures how faithfully it uses sources, not how much it knows or how well it argues. In blind mode the debaters get no evidence at all and the evidence becomes the judge's: the curated pack plus a reference library for the motion. Evidence mode is kept (`--mode evidence`, or the Mode menu) because faithfulness to a given source is still worth measuring.
- A claim the judge's evidence neither supports nor contradicts is `unverified` in blind mode: not struck and worth 0 points, because the debater never saw the library and silence there says nothing about the claim. A contradicted claim is still struck and costs −2, a supported one still earns +1. The same rule applies to the probability-weighted `E`. Blind results are tagged `rules-blind-v2`, so the leaderboard never mixes them with evidence-mode results.
- The cost of this rule: a false claim on something the library does not cover goes unpunished. The libraries are made large to keep that rare: 14 to 18 whole English Wikipedia articles per motion, from about 700 to about 1,700 passages and 50,000 to 120,000 words each. The article lists are in `packs/library/sources.json`; `pnpm library:build` fetches the current revisions, drops reference and link sections, joins stray fragments and cuts the prose into passages of at most 110 words at sentence ends. Each library records the article titles, URLs and revision ids it was built from. Wikipedia text is CC BY-SA 4.0, unlike the packs.
- A library is far too large to send whole with every question, so for each sentence the judge gets the 20 passages that best match it (Okapi BM25 over the pack and the library together, `lib/debate/retrieve.ts`), and 30 for a whole turn, shuffled from the debate seed like the pack. If the right passage is not among them, the claim comes back unverified rather than wrong, which is the safe direction.
- In blind mode the debaters are told how they are judged: a claim shown false is struck and costs them, a confirmed one earns credit, an unchecked one counts for nothing. Without that, a model has no reason to prefer a specific, checkable fact over a vague one.
- The per-turn `evidence_use` question becomes "how well is the turn built on specific, checkable facts that the evidence confirms", and the final verdict asks for "the stronger and more factually sound case", since neither side was given the evidence to use.

## Evidence packs

Every figure in the ten packs was checked against a primary or reputable source on the web, and anything that could not be confirmed was left out. They are summaries released as CC0-1.0, and their `source` field lists what was used. No domain expert has reviewed them. Where a reviewer should look first:

- **Weakest sourcing** (taken from search summaries rather than the primary text): in `remote-work`, Ding and Ma's 137 firms; in `four-day-week`, the Belgian 9.5-hour days, the wording of the Rowley letter, the Estevao and Sa abstract and the Utah audit's "just over $500,000"; in `crewed-spaceflight`, the IPCC medians, the Apollo 17 rover distance and EVA hours, the Hubble servicing dates, the Perseverance and Mars Exploration Rover costs and the date Spirit got stuck, all confirmed only through Wikipedia; the original 3.3 billion euro Flamanville estimate in `nuclear-power` has no price year.
- **Sources disagreed, choice made:** Ford's five-day week date (only the year 1926 is used); the Gibbs et al. productivity fall (8 to 19 percent from the 2023 version, not about 20 percent from the 2021 draft); Emanuel, Harrington and Pallais coding feedback (18.3 percent from the June 2026 revision, not 22 percent); the Trip.com quit rate (33 percent from Nature, not 35 percent); New York's first-year entry drop (the MTA's 11.7 percent, not the governor's 11 percent); the Stockholm referendum (53 percent); the Rent Guidelines Board vote (25 June); the House vote on H.R. 139 (the Clerk's 14 July 2026 tally of 308 to 117); the OpenResearch results (the August 2026 NBER revision, not the 2024 version); the Philadelphia beverage tax (the JAMA abstract's 51.0 percent fall and 24.4 percent cross-border offset, not the press release's net 38 percent); Allcott et al. suspensions (15 percent from the September 2026 revision); the cost of Germany's nuclear phase-out (the published 3 to 8 billion euros a year, not the working paper's 12 billion dollars); Flamanville's cost (the Cour des comptes' 23.7 billion euros in 2023 euros, not EDF's 22.6 billion); Apollo's cost (the Planetary Society's 25.8 billion dollars, attributed in the passage, not NASA's 1973 figure of 25.4 billion).
- **Left out because they could not be verified:** among others the Singapore scheme figures, the Sims 2007 Massachusetts study, Beland and Murphy's school counts, WHO's country count for sugar taxes, the Wales care-leaver outcomes, Poland's 2025 clock-change proposal, the cost and status of Mars Sample Return and China's crewed lunar target date.
- Some figures were verified by reading the papers and abstracts directly rather than through search results.

## Study 2: judge error correlation

- The follow-up to DebateCheck was pre-registered (`docs/preregistration-judge-correlation.md`) before any new API call: five hypotheses with their support criteria, the item construction rules, the judges and conditions, the measures, a stopping rule per provider (1.5 times the estimate) and the rule that the held-out motions stay closed until every judge has finished on them. Deviations are appended to the same file as they happen. A study about whether judges share errors is itself exposed to a shared bias (picking the comparison after seeing it), and a written plan is the cheap defence.
- The question is posed identically to every judge: the framed criterion over the same evidence text, as a predicate for the two decision models, as a JSON verdict for the chat judges, as premise and hypothesis for the NLI classifier. The pilot's chat-judge files asked the relation question and are kept as pilot data; `judge-llm.ts --framing sharp` reproduces them.
- GPT-6 Luna through the Decisions API is the second decision model because it is the only one of a different maker that returns a probability for a typed question; the chat judges are three families at reasoning "low"; HHEM is a judge of a third kind that costs nothing to run. Claude Sonnet 5.5 is the expensive judge and was limited to a seeded 400-pair sample of the held-out motions plus the primary panel.
- New perturbation types follow the numeric rule (original token in the evidence the judge reads, replacement nowhere in it, one edit per sentence) with one amendment recorded before any judge ran: direction words are too common for the whole-evidence rule, so polarity applies it to the passages that state the sentence's fact.
- Subjective panels come from the Autorubric authors' own material (CHARM-100 from the library's examples, HealthBench-100 built with the library's scripts from OpenAI's public files), so the comparison with their finding is on their ground; ordinal criteria are read as MET in the upper half of the scale, the nominal length criterion and not-applicable labels are left out.
- Spending is tracked from the tokens the output files carry (`debatecheck:study-spend`) at list prices; Autorubric's own estimate, which credits prompt caching, is reported beside it when it differs, and the stopping rule is applied to the conservative figure.
- The human validation (300 items, two people, blind sheets with the three best-matching passages plus the passages that carry the original token) is prepared with the study and reported when collected; until then the construction labels stand alone and the paper says so.
- Leaderboard v2 does not re-run debates: it re-judges the stored claims with the certified question (`scripts/leaderboard-v2.ts`), reports both the 0.5 rule and the confident rule (the high threshold of the guaranteed-risk region fitted on DebateCheck's training motions), keeps the pilot's match outcomes unchanged beside the new counts, and lists the confident strikes for review, because a strike means "the library says otherwise", not "false".

## Judge rules v2

- The strike now comes from the framed contradiction criterion (`lib/jev/criterion.ts`), asked in a second Jev call in parallel with the relation set; the relation question keeps answering support, best passage, claim and relevance. One question per decision: DebateCheck showed the relation question's `contradicts` could not see a wrong number (5 percent at 0.7) and the framed criterion can (90 percent on numbers, 4.6 percent false alarms at the same threshold on held-out motions), so the threshold stays 0.7, chosen before the data, and only the probability behind it changes.
- The criterion text lives in `lib/jev/criterion.ts` and `scripts/debatecheck/lib.ts` imports it, so the benchmark and the arena cannot drift apart.
- The rules version is bumped (`rules-v2`, `rules-blind-v2`); pilot results stay readable (`contradicted` defaults to 0 in old transcripts) and never mix with v2 results in a leaderboard, which `selectComparable` enforces.
- Two calls per sentence double the judge cost per sentence (about 0.03 cents at twenty passages) and do not change latency, since the slower call sets it.

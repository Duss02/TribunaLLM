# Contributing

## Run it

```bash
pnpm install
cp .env.example .env.local   # fill in the keys you have
pnpm dev                     # http://localhost:3000
pnpm test                    # no network, no keys
pnpm typecheck
pnpm build
pnpm format                  # Prettier, run before committing
```

`JEV_MOCK=1` swaps Jev for a deterministic fake and any model without a key for a scripted debater that quotes the evidence pack. It exists so the app, the CLI and the tournament run without credentials. Its verdicts are not measurements and results produced with it go to `bench/results-mock/`, which is not committed.

Useful commands:

```bash
pnpm models                                  # which registry entries are usable, and why not
pnpm debate:cli --pack four-day-week --strict
pnpm debate:cli --list-packs
pnpm tournament --dry-run                    # the schedule and a Jev cost estimate
```

## Add an evidence pack

A pack is one file, `packs/<slug>.md`. The slug is lowercase letters, digits and hyphens.

```markdown
---
title: Four-day work week
motion: Companies should move to a four-day work week.
source: Publisher, Title, year; Publisher, Title, year
license: CC0-1.0
---

First passage, one paragraph.

Second passage, one paragraph.
```

The body is passages separated by blank lines. They become `P01`, `P02` and so on. The loader refuses a pack with a passage over 120 words, more than 200 passages, or more than about 24,000 tokens, and says which.

What makes a pack work:

- Every passage states checkable facts: numbers, dates, names, the year of a statistic. A debater that invents a figure is only caught if the real one is in the pack.
- Each passage stands alone. Do not write "as above" or "the study" without naming it.
- Keep it balanced. Roughly half the passages should help each side, with a few that carry the limits of the evidence (sample size, no control group, self-selection). A pack that only one side can use produces one-sided debates.
- Verify every figure against the source before it goes in, and list the sources in `source`. The judge treats the pack as ground truth, so a wrong number in the pack punishes the model that got it right.
- 14 to 26 passages is the range the tests accept. Short packs keep the Jev bill low: the whole pack is sent with every sentence.

Check it with `pnpm test packs`, then `pnpm debate:cli --pack <slug>`.

## Add a model

Add one object to `REGISTRY` in `lib/models/registry.ts`:

```ts
{
  key: "gemini-3.8-flash",
  label: "Gemini 3.8 Flash",
  vendor: "google",
  family: "gemini",
  openWeights: false,
  routes: {
    gateway: "google/gemini-3.8-flash",
    openrouter: "google/gemini-3.8-flash",
    direct: { provider: "google", id: "gemini-3.8-flash" },
  },
},
```

Give it at least one route. Do not type ids from memory: `pnpm models` fetches each route's model list and marks the entry `available`, `missing-key` or `unknown-id`. A new vendor needs an entry in `VENDORS` and, for the leaderboard chart, a name in `components/leaderboard/vendor.ts`.

Set `fixedTemperature: true` if the provider rejects a temperature parameter. Set `openWeights` from the model's own release, not from a guess; the shipped values come from OpenRouter's `hugging_face_id` field.

## Submit tournament results

Results are the raw JSONL files in `bench/results/`. A leaderboard is only comparable if every file in it used the same judge model and rules version, and the builder refuses to mix them.

```bash
pnpm tournament --run <your-run-id> --models a,b,c,d --packs all --rounds 3
pnpm leaderboard:build
```

In a pull request, include:

- the `bench/results/<run-id>.jsonl` file, unedited, and the rebuilt `bench/leaderboard.json`
- the Jev model id and rules version (both are in every line of the file)
- the route you used (gateway, OpenRouter or direct) and the date
- any debates that failed, and whether you retried them with `--resume`

Do not commit results produced with `JEV_MOCK=1`.

## Style

Comment only what the code cannot say: a threshold's origin, a provider quirk, an API limit. Name things for what they are. Do not add an abstraction until the third use. Tests use hand-written cases that a reader can check in their head, and do not mock this repository's own modules.

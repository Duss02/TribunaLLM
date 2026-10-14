# Blind pilot, 9 October 2026: what the judge can and cannot see

This is the write-up of the first tournament run against the live APIs, and of the tests that were run on
the judge afterwards. Everything here can be recomputed from `bench/results/pilot-blind-*.jsonl` and the
scripts in `scripts/analysis/`; the numbers below are copied from the reports those scripts wrote into this
folder. The hand reviews were done by Claude (Fable 5.1), a language model, not by a person, and are labelled
as such wherever they are used.

## Summary

- **The headline metric does not work as the judge is asked today.** In 3,357 claims from 180 blind debates, Jev struck 20 sentences as contradicted (0.6%), of which 7 hold up on review; in the first 1,169 claims it struck 3. A perturbation test, which alters one number in sentences Jev had called supported and asks again, got a detection rate of 0 out of 78: not one altered sentence was called contradicted, and 38% stayed "supported" ("in January 5,945 Mexico introduced a tax" was supported at 0.93).
- **The cause is the question design, not retrieval and not Jev as such.** BM25 puts the source passage in the judge's top 20 for 96% of model-written claims. Asking the same Jev the same relation question with a sharper description of "contradicts" and only the three best-matching passages raises detection of altered numbers from 2.6% to 33% at the 0.7 threshold, with 1.3% false alarms on unchanged sentences. A direct yes/no question reaches 56% but with 10% false alarms.
- **The sharper question is not a drop-in fix.** Judging all 1,169 claims again with it flags 58 sentences. On hand review 13 are real errors (wrong year, wrong journal, mixed-up figures), 15 are unclear and 30 are false alarms. Half the false alarms are sentences that quote an older edition of a source correctly (Lazard 2023 or 2024) while the pack carries the 2026 edition.
- **A language-model judge sees what Jev misses, and nitpicks.** GPT-6.1 Sol, given the same evidence, agrees with Jev on 66% of a stratified sample (Cohen's κ 0.48), confirms 1 of Jev's 3 contradictions, and finds 8 of its own, several of them genuine (5.5% where the study says 6%; 50 g CO₂/kWh where the passage says 85).
- **The final verdict carries a position effect in the opposite direction from the one documented.** Listing a side first lowers its probability by 0.059 on average (standard error 0.004); the leading side changes in 8% of debates. The schedule plays both sides, so it cancels in the ranking, but a single debate's verdict is biased.
- **Costs are small.** The 180 debates cost 3.10 USD of Anthropic credit, 0.61 OpenAI, 0.46 DeepSeek and 1.10 Jev. All judge tests together cost under 0.15 USD of Jev. The full 16-model, 10-pack round robin would cost 50 to 90 USD at list prices.

## What was run

Six models, those the available keys reach, in blind mode, 3 rounds, 110 words per turn, every pair on both
sides of every pack, one repeat, judge `jev-1.13.0`, rules `rules-blind-v1`. Reasoning effort `low` for every
debater; temperature 0.7 except for the Claude models, which reject it.

| run | packs | debates | failed | wall time |
|---|---|---:|---:|---|
| `pilot-blind-a` | nuclear-power, sugar-tax | 60 | 0 | 15.7 min at concurrency 3 |
| `pilot-blind-b` | congestion-pricing, crewed-spaceflight, four-day-week, rent-control | 120 | 0 | 30.2 min at concurrency 3 |

Debater output budget was raised from 2,000 to 4,000 tokens before the run, after an earlier evidence-mode
debate failed because DeepSeek V4 Pro spent the whole budget on reasoning; a turn that comes back empty is now
retried once, which happened once in stage 1 (DeepSeek V4 Flash) and saved that debate.

## What the debates produced

Stage 1, 60 debates:

| model | claims | supported | contradicted | unverified | opinions | win rate |
|---|---:|---:|---:|---:|---:|---:|
| claude-opus-5.5 | 244 | 127 | 0 | 117 | 191 | 78% |
| claude-sonnet-5.5 | 217 | 123 | 0 | 94 | 206 | 72% |
| gpt-6.1-sol | 151 | 98 | 0 | 53 | 205 | 65% |
| deepseek-v4-pro | 203 | 102 | 1 | 100 | 139 | 38% |
| deepseek-v4-flash | 234 | 116 | 2 | 116 | 153 | 35% |
| gpt-6-luna | 120 | 70 | 0 | 50 | 176 | 13% |

Half of all sentences are opinions by the judge's threshold; of the claims, 55% are supported and 45%
unverified. The ranking by win rate is driven by the final verdict (J) and the argument points (A), not by
retractions, since there are almost none. Of the three retractions, one is right (the library does report
health effects of sugar taxes), one is wrong (the sentence that Mexico's tax cut purchases most among
low-income households is exactly what P04 says) and one is arguable (`hand-review-pilot-blind-a.md`).

### Leaderboard after both stages (`bench/leaderboard.json`, 180 debates)

| model | rating (95% interval) | win rate | claims | contradicted | rate (95% interval) |
|---|---|---:|---:|---:|---|
| claude-opus-5.5 | 1640 (1567–1734) | 71.7% | 728 | 1 | 0.1% (0.0%–0.8%) |
| gpt-6.1-sol | 1584 (1522–1660) | 63.3% | 455 | 0 | 0.0% (0.0%–0.8%) |
| claude-sonnet-5.5 | 1574 (1503–1650) | 61.7% | 590 | 0 | 0.0% (0.0%–0.6%) |
| deepseek-v4-flash | 1459 (1372–1546) | 43.3% | 667 | 5 | 0.7% (0.3%–1.7%) |
| deepseek-v4-pro | 1400 (1321–1471) | 34.2% | 580 | 13 | 2.2% (1.3%–3.8%) |
| gpt-6-luna | 1342 (1241–1416) | 25.8% | 337 | 1 | 0.3% (0.1%–1.7%) |

The rating is Bradley-Terry on wins and draws; the three top intervals overlap each other and the three bottom ones overlap each other, so the pilot separates two tiers, not six models. Across the 180 debates the judge struck 20 of 3,357 claims (0.6%). On hand review (`hand-review-pilot-blind-b.md`) 7 of the 20 are real contradictions, 5 unclear and 8 false alarms. DeepSeek V4 Pro carries 13 of the 20, and nine of those are rebuttals that deny an opponent's point which the library supports ("your claim that low-income workers get discounts is not true", when New York gives them a 50% discount). That is partly a debating habit the judge punishes and partly real error, and the retraction column cannot tell them apart.

Stage 2 repeated the position test on 120 more debates: the side listed first loses 0.056 in probability (standard error 0.003) and the leading side changes in 9 of 120 debates.

## Checks on the judge

### Retrieval recall (`retrieval-recall.md`)

For 30 library passages per pack, DeepSeek V4 Flash wrote one claim in its own words; BM25 over pack plus
library put the source passage in the top 5 for 92.0% of them, the top 20 for 96.3% and the top 30 for 97.7%.
The verbatim first sentence of a passage is found at rank 1 every time. Retrieval is not what hides errors.

### Perturbation (`perturb-pilot-blind-a.md`)

78 sentences Jev had called supported, each with one number changed (years by 3 to 7, percentages by a
factor, other figures roughly doubled), judged again with the same 20 passages and the same questions as
in the debate.

| judged again | unchanged | number altered |
|---|---:|---:|
| supported | 75 (96%) | 30 (38%) |
| contradicted | 0 | 0 |
| unverified | 3 (4%) | 48 (62%) |

Mean p(contradicts) on altered sentences: 0.15 for years, 0.30 for percentages, 0.11 for other numbers. The
threshold is 0.7. No threshold rescues this: at 0.5 the sweep finds 12 contradictions in the whole run.

### Question variants (`perturb-variants-pilot-blind-a.md`)

The same 78 pairs, asked in other ways. "Sharp" describes `contradicts` as "a passage gives a different
number, date, name, place or outcome for the same thing the sentence describes, or states the opposite".

| variant | altered: mean p | detection ≥0.7 | detection ≥0.5 | unchanged: false alarm ≥0.7 | ≥0.5 |
|---|---:|---:|---:|---:|---:|
| loose, all 20 (as in the debate) | 0.18 | 2.6% | 10.3% | 0.0% | 0.0% |
| sharp, all 20 | 0.38 | 20.5% | 35.9% | 0.0% | 0.0% |
| sharp, top 3 by BM25 | 0.49 | 33.3% | 46.2% | 1.3% | 2.6% |
| sharp, top 1 by BM25 | 0.46 | 35.9% | 46.2% | 5.1% | 10.3% |
| direct yes/no, top 3 | 0.69 | 56.4% | 76.9% | 10.3% | 26.9% |

Wording alone moves detection from 3% to 21%; narrowing the evidence to the passages that match the
sentence adds another 13 points. Years are the easiest to catch (48% at 0.5 under sharp top 3), other
figures the hardest (38%).

### Every claim judged again with the sharp question (`rejudge-pilot-blind-a.md`, `hand-review-rejudge-pilot-blind-a.md`)

| model | claims | contradicted in the debate | ≥0.7 under sharp top 3 | rate (95% CI) | real errors on review |
|---|---:|---:|---:|---|---:|
| claude-opus-5.5 | 244 | 0 | 14 | 5.7% (3.4–9.4) | 3 |
| claude-sonnet-5.5 | 217 | 0 | 7 | 3.2% (1.6–6.5) | 3 |
| deepseek-v4-flash | 234 | 2 | 19 | 8.1% (5.3–12.3) | 4 |
| deepseek-v4-pro | 203 | 1 | 11 | 5.4% (3.1–9.4) | 1 |
| gpt-6-luna | 120 | 0 | 4 | 3.3% (1.3–8.3) | 2 |
| gpt-6.1-sol | 151 | 0 | 3 | 2.0% (0.7–5.7) | 0 |

Of the 58 flagged sentences, 13 are real errors, 15 unclear, 30 false alarms. Twelve false alarms are the
same thing: a model quotes Lazard's 2023 or 2024 cost ranges correctly, the pack holds the 2026 edition, and
"a different number for the same thing" is exactly what the sharp question asks for. Three more are Our
World in Data's current 0.03 deaths per TWh against the pack's 2022 figure of 0.07. DeepSeek V4 Flash's
8.1% is mostly this: it cites Lazard 2024 in nearly every nuclear debate. A ranking on the sharp question
would measure which model quotes editions the pack does not have.

The real errors are what a benchmark wants: a wrong year for a study, a figure attributed to the wrong
journal, in-city and net declines mixed up, a claim the library refutes outright.

### Two second judges (`second-judge-pilot-blind-a-gpt-6.1-sol.md`, `second-judge-pilot-blind-a-deepseek-v4-pro.md`)

GPT-6.1 Sol (reasoning low, temperature 0) was given the motion, the sentence and the same 20 passages, and
asked for `is_claim`, the relation and the passage it relied on, as JSON.

| | agreement with Jev | κ |
|---|---:|---:|
| all 103 sampled sentences, 4 labels | 66.0% | 0.48 |
| the 82 both call claims, 3 relations | 72.0% | 0.50 |

It confirms 1 of Jev's 3 contradictions (the health-effects one), calls the Mexico low-income sentence
supported (correctly), and flags 8 contradictions of its own, of which Jev had 1. Some are pedantry ("$30
billion, not exceeding $30 billion"); others are the kind of error Jev's loose question misses: 5.5% where the
study says 6%, a 38% decline where the passage says 46%, 50 g CO₂/kWh where the passage says 85, a 2014
repeal the passage dates to 2013.

DeepSeek V4 Pro (reasoning medium, temperature 0) on a larger sample of 153, of which 123 came back as parseable JSON (the rest ran out of output budget while reasoning):

| | agreement with Jev | κ |
|---|---:|---:|
| all 123 parsed sentences, 4 labels | 64.2% | 0.46 |
| the 95 both call claims, 3 relations | 75.8% | 0.57 |

It confirms 2 of Jev's 3 contradictions, also rejects the Mexico low-income one, and flags 11 of its own, of which Jev had 2. Its new contradictions overlap with GPT-6.1 Sol's (5.5% versus 6%, Denmark's 2013 versus 2014, Philadelphia's 38% versus 46%) and include the Lazard-edition case, which it reads as a contradiction too. Two reasoning models agree with each other more than either agrees with Jev, and both read "a different figure in the evidence" as a contradiction whether or not the sentence names a different edition.

On Jev's "opinion" label both models disagree most: GPT calls 11 of 20 Jev opinions claims or unverifiable, DeepSeek 21 of 28. The is_claim threshold moves the denominators of every rate, as the README already warns.

### Position bias in the final verdict (`position-bias-pilot-blind-a.md`)

Same surviving transcripts, the verdict question asked with PRO listed first (as in the tournament) and with
CON listed first.

| | mean p(PRO) |
|---|---:|
| PRO listed first | 0.376 |
| CON listed first | 0.434 |

Mean shift −0.059 (sd 0.033, standard error 0.004): the option listed first loses probability, the reverse of
the "slight first-option bias" the Jev documentation describes. The leading side changes in 5 of 60 debates.
Asking the same question twice in the same order drifts by 0.018 on average, so the shift is real.

### Thresholds (`threshold-sweep-pilot-blind-a.md`)

With the stored probabilities, moving one threshold at a time: the contradiction count is 12 at 0.5, 3 at
0.7, 0 at 0.9. The win ranking is stable for the `contradicted` threshold (no winner changes) and changes
little for `supported` below 0.7; it moves for `claim` (9 to 13 winners change at 0.3 or 0.4) because the
claim threshold sets how many sentences score at all. The distribution of p(contradicts) is the finding: 1,864
of 2,239 judged sentences are below 0.1 and 5 are at or above 0.7.

### Hand review of the debate's own verdicts (`hand-review-pilot-blind-a.md`)

30 sampled "supported" sentences: 22 right, 1 wrong, 7 unclear. The wrong one and three of the unclear ones
are one pattern, a figure (7.6%) that appears in no passage, accepted because the passages support the
surrounding claim. The judge's "supported" is lenient about numbers in both directions.

## What this means

1. The benchmark's promise, a leaderboard of which model is retracted least, is not yet measurable. The
   current question design produces almost no retractions and does not react to wrong numbers. The result
   files are still useful: every sentence is stored with its probabilities and evidence, so the judge can be
   re-asked offline for a few cents.
2. The fix is in the judge's question, and it is a trade. A sharp question over the best-matching passages
   catches a third of wrong numbers but flags correct quotations of other editions. Two things would help:
   evidence that records the edition and year of each figure, so "Lazard 2024" can be checked against Lazard
   2024, and a two-step verdict (does a passage speak about the same thing; if so, does it give a different
   figure) rather than one choice question. Both can be tested on the stored transcripts before any new
   debate is paid for.
3. A reasoning model as judge finds errors Jev's loose question misses, at 10 to 100 times the price per
   sentence (GPT-6.1 Sol: 0.54 USD for 103 sentences; DeepSeek V4 Pro: 0.16 USD for 153; Jev: 0.0005 USD
   each) and at 20 to 60 seconds a sentence instead of 0.3, which rules it out for the live arena but not
   for the tournament. A sensible design uses Jev's
   `says_nothing` to skip sentences no passage addresses and sends the rest to a stronger judge, or to Jev
   with the narrowed question.
4. Nothing here is a human measurement. The hand reviews and the second judge are language models reading
   evidence. Before any leaderboard is published, a person should label the 58 flagged sentences and the
   30 supported ones; the sheets are written for that.

## Budget

List prices on 2026-10-09 (OpenRouter's public list; the direct providers charge the same). Jev is measured.

| | Anthropic | OpenAI | DeepSeek | Jev |
|---|---:|---:|---:|---:|
| stage 1, 60 debates | 1.08 | 0.20 | 0.15 | 0.35 |
| stage 2, 120 debates | 2.02 | 0.37 | 0.29 | 0.71 |
| judge tests (perturb, variants, rejudge, position, recall, second judges) | 0 | 0.54 | 0.17 | 0.11 |

Per debate at `low` reasoning: Claude Opus 5.5 0.041 USD, Sonnet 5.5 0.013, GPT-6.1 Sol 0.009, DeepSeek V4
Flash 0.006, DeepSeek V4 Pro 0.002, GPT-6 Luna 0.001, Jev 0.006. The 16-model round robin (2,400 debates)
comes to 50 to 90 USD at these rates.

## Reproduce

```bash
pnpm tournament --mode blind --models claude-opus-5.5,claude-sonnet-5.5,gpt-6.1-sol,gpt-6-luna,deepseek-v4-pro,deepseek-v4-flash --packs nuclear-power,sugar-tax --run pilot-blind-a --concurrency 3
pnpm analysis:sweep --run pilot-blind-a
pnpm analysis:perturb --run pilot-blind-a --n 150
pnpm analysis:perturb-variants
pnpm analysis:rejudge --run pilot-blind-a
pnpm analysis:recall --per-pack 30
pnpm analysis:judge2 --run pilot-blind-a --judge gpt-6.1-sol --reasoning low --supported 40 --unverified 40 --opinion 20
pnpm analysis:position --run pilot-blind-a
pnpm analysis:review --run pilot-blind-a --verdict contradicted
pnpm spend
```

Jev is not deterministic: the same question asked twice drifts by about 0.02 in probability, so counts at
a threshold can differ by one or two between runs.

## Follow-up

The perturbation finding became a benchmark of the judge, DebateCheck (1,164 contrastive pairs from these 180 debates), on which the same Jev reaches 94% accuracy on held-out motions once the criterion is posed in Autorubric's binary framing. See `bench/debatecheck/REPORT.md` and the paper in `paper/`.

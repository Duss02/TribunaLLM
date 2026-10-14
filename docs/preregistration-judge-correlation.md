# Pre-registration: where judges err together

Status: written before any new API call for this study. Date: 2026-10-10. Everything below is fixed
before data collection; departures will be listed in a "Deviations" section of the final report.

## Question

Rao and Callison-Burch (arXiv:2609.29769) found that Jev and three LLM judges are "wrong in the same
places" on rubric panels with human labels, and attributed the shared shortfall to conventions the
criterion text does not state. Our pilot (bench/debatecheck) found much weaker error overlap between Jev
and an LLM on an evidence-verification task whose labels are known by construction. We ask what drives
error overlap between judges: the task, the evidence and the question, or the kind and family of the
judge.

## Hypotheses and predictions (fixed)

- H1, task objectivity. For the same pair of judges under the same evidence policy, the correlation of
  errors (phi between error indicators) is lower on DebateCheck than on a subjective rubric panel with
  human labels. Prediction: lower for every judge pair; support requires the DebateCheck value to be
  below the subjective value for at least 80 percent of pairs, with bootstrap intervals not overlapping
  for at least half of them.
- H2, kind of judge. On DebateCheck, with identical evidence, error correlation is ordered: two LLMs
  (highest) > decision model with LLM > two decision models of different makers (Jev, GPT-6 Luna
  Decisions). Prediction stated before seeing any Luna Decisions data; the pilot has no decision-model
  pair. Support requires the ordering to hold with non-overlapping intervals between the extremes.
- H3, error type. Jev's recall on altered entities, attributions, polarity and units is lower than on
  altered numbers; the LLM judges' recall falls less; hence the items where an LLM is right and Jev wrong
  concentrate in identifiable types. Prediction: Jev recall drops by at least 15 points from numbers to
  the mean of the other types; GPT-6 Luna's by less than 10.
- H4, difficulty. After stratifying items by a leave-one-judge-out difficulty estimate, Jev-LLM error
  correlation stays below LLM-LLM correlation within each stratum.
- H5, framing replicates. The framed criterion's advantage over the relation question (pilot: AUROC
  0.85 to 0.96 for Jev) replicates for GPT-6 Luna Decisions in direction, with an AUROC gain of at least
  0.05.

We will report every result whether or not it supports these predictions.

## Items

1. DebateCheck-numbers: the existing 1,164 pairs (bench/debatecheck/pairs.jsonl), unchanged.
2. New perturbation types, built from the same supported sentences with fixed seed 2026 and the same
   rule as numbers: the original token must occur in the evidence the judge read, the replacement must
   occur nowhere in it, one edit per sentence, at least 300 pairs per type where the material allows.
   - entity: a country or city named in the sentence and in the evidence, replaced by one from a fixed
     list of the same kind (countries with countries, cities with cities) that is absent from the
     evidence and the sentence; every occurrence in the sentence is replaced.
   - attribution: the source named for a fact (journal, agency, report, author) replaced by another of
     the same kind absent from the evidence.
   - polarity: a direction word (rose/fell, increase/decrease, more/fewer, higher/lower, reduced/raised and
     the like) flipped. Direction words are too common for the whole-evidence rule, so for this type the
     rule applies to the passages that state the sentence's fact, those containing the sentence's first
     number: the original direction word must occur there and the flipped one must not. (Amended
     2026-10-10, after the first dry build and before any judge was run on these pairs; the first build
     under the whole-evidence rule yielded 125 polarity pairs, 17 on held-out motions.)
   - unit: percent/percentage points, million/billion, per year/per month, dollars/euros, where the
     original unit is in the evidence and the replacement is not.
   Candidate edits are proposed by rules and, for entities and attributions, by GPT-6 Luna (chat) with
   the constraints in the prompt; every candidate is checked by code against the constraints and
   discarded otherwise. Rejected candidates and their reasons are logged.
3. Split by motion, unchanged: train = nuclear-power, sugar-tax, congestion-pricing, four-day-week;
   held-out = crewed-spaceflight, rent-control. Thresholds and rules are fitted on train only.
4. Subjective panels for H1, both obtained on 2026-10-10 before any judge was run on them: CHARM-100
   (primary; `examples/data/charm100.json` in the Autorubric repository, 100 conversations with reference
   labels on six criteria, of which the binary and ordinal ones are used as MET/UNMET at the labelled
   midpoint) and HealthBench-100 test (secondary; 100 items with physician majority labels per criterion,
   built with the Autorubric scripts from OpenAI's public HealthBench files). The NLI judge (HHEM) is run
   only on criteria about factual consistency, since it answers no other question; the other judges run
   on every criterion. Error correlations on the subjective panels are computed on items both judges
   answered, exactly as on DebateCheck.

Build log (2026-10-10, before any judge was run on these pairs): polarity 269 (50 held-out), entity 741 (147 held-out), attribution 305 (106 held-out), unit 342 (97 held-out); file bench/debatecheck/pairs-types.jsonl, seed 2026.

## Judges and evidence (fixed)

Every judge answers the same framed criterion ("A passage in the evidence gives a different number, date,
name, place or outcome for the same thing the sentence describes, or states the opposite") over the same
evidence text, two conditions: the twenty passages the arena read, and the three of them that best match
the sentence by BM25.

| judge | kind | maker | conditions | items |
|---|---|---|---|---|
| Jev 1.13.0 (TypeSafe) | decision model | TypeSafe | 20, top-3 | all |
| GPT-6 Luna Decisions API | decision model | OpenAI | 20, top-3 | all |
| GPT-6 Luna, chat, reasoning low, JSON | LLM | OpenAI | top-3 | all |
| DeepSeek V4 Pro, chat, reasoning low, JSON | LLM | DeepSeek | top-3 | all |
| Claude Sonnet 5.5, chat, reasoning low, JSON | LLM | Anthropic | top-3 | 400 held-out items + 400 subjective |
| HHEM-2.1-Open (Vectara) | NLI classifier | Vectara | top-3 | all |

Decision models decide at p >= 0.5. LLM judges decide by their JSON label; an unparsable answer is an
abstention, excluded and counted in coverage. HHEM decides at 1 - consistency >= 0.5, with the threshold
also fitted on train and reported. Temperature 0 where accepted, none otherwise. Prompts and question
texts are the files in scripts/debatecheck at the commit that precedes the first run.

## Measures (fixed)

Per judge: accuracy, recall on altered items, false-alarm rate on unchanged items, AUROC where a score
exists, with 95 percent bootstrap intervals resampling pairs (1,000 resamples), on all items and by type.
Per pair of judges, on the items both answered: the 2x2 table of error indicators, phi, Cohen's kappa,
P(B wrong | A wrong) against B's base rate, and effective independent votes k / (1 + (k-1) * mean phi).
Difficulty: for each pair (A, B), items are split by whether a third judge C (DeepSeek V4 Pro by default,
Claude for pairs involving Pro) was right; correlations are reported within strata. Coverage at guaranteed
risk: for each judge and pair, the share of held-out items accepted under a threshold calibrated on train
so that the Clopper-Pearson 95 percent upper bound on the error among accepted items is at most 0.05.
Everything in the reporting checklist of Rao and Callison-Burch (arXiv:2606.00093): scale, abstention
rule, coverage, both positive rates, resampling unit.

## Human validation

300 items, stratified: 100 numeric pairs' unchanged sides, 100 unchanged sides of the new types, 100
altered sides of the new types, labelled independently by two people with the sentence and the evidence,
blind to every judge. Agreement between the two is reported. Construction labels are compared with the
human labels; if more than 10 percent of altered items of a type are judged not contradicted by both
people, that type's results are flagged and reported separately.

## Costs and stopping

Expected API cost: OpenAI about 6 USD, TypeSafe about 3, DeepSeek about 4, Anthropic about 5. If a
provider's spend reaches 1.5 times its estimate the run stops and the partial result is reported. No
analysis is run on held-out items until every judge has finished on them.

## Deviations

None yet.

## Clarifications recorded before the first run

Written on 2026-10-10 after the sections above and before any judge was run for this study.

- LLM judges (GPT-6 Luna chat, DeepSeek V4 Pro, Claude Sonnet 5.5) answer the framed criterion through
  `scripts/debatecheck/judge-llm.ts --framing framed`: the system message carries Autorubric's task
  instruction, the criterion and the MET/UNMET definitions; the user message is the same text the Decisions
  API judge receives (motion, the passages as "id| text", the sentence as the submission); the answer is
  the JSON `{"verdict": "MET"|"UNMET"}` and anything else is an abstention. The pilot's LLM files
  (`llm-gpt-6-luna.jsonl`, `llm-deepseek-v4-flash.jsonl`) asked the relation question and remain pilot
  data; Luna chat is rerun on the numeric pairs under the framed criterion. Study files are named
  `llm-<judge>-framed.jsonl` (numeric pairs) and `llm-<judge>-framed-types.jsonl` (new types).
- Claude's "400 held-out items" are 400 pairs: 200 numeric held-out pairs and 50 held-out pairs per new
  type, drawn with seed 2026 into `bench/debatecheck/claude-sample.jsonl` (numeric: 128 year, 17 percent,
  55 other). Its subjective items are the 100 CHARM-100 conversations and the 100 HealthBench-100 test
  items (200 items, 805 criterion judgements), not 400: the table above counted the HealthBench validation
  half, which is not used.
- Decisions API on the subjective panels (`judge_decisions_dataset.py`): binary criteria as predicates
  with the MET/UNMET definitions; multi-choice criteria as choice questions whose options are the rubric's
  labels (sent as values o0..oN with the label as description); the chosen label is mapped to MET/UNMET at
  the labelled midpoint exactly as for the other judges.
- HHEM on the subjective panels: no criterion of CHARM-100 or HealthBench-100 compares the submission with
  a given source text (CHARM's `factual_accuracy` asks about accuracy in general), so HHEM is not run on
  them; H1 is tested on the other five judges.
- Human validation evidence: each item shows the three passages that best match the sentence by BM25 (the
  top-3 condition) plus, when not among them, the passages among the twenty that contain the pair's
  original token (at most two), the same for both sides of a pair. Items carry opaque numbers in a seeded
  random order, with a separate key; the sheet shows no judge output.
- The working tree is uncommitted, so instead of a commit the SHA-256 fingerprints of the scripts at the
  time of the first run are recorded here:
  - c0d7f2d5d85753ac scripts/debatecheck/analyze.ts
  - 83ee72cbf852fea8 scripts/debatecheck/build-types.ts
  - 76bd9942d01da0ca scripts/debatecheck/build.ts
  - 83bde38af98472e3 scripts/debatecheck/export-autorubric.ts
  - aba3b38f9e945b3a scripts/debatecheck/judge-decisions.ts
  - 118c55d0317e3c1e scripts/debatecheck/judge-jev.ts
  - 4a592d7d9626d89f scripts/debatecheck/judge-llm.ts
  - 829c0de2cebb05df scripts/debatecheck/lib.ts
  - 1ed832406bfe47b8 scripts/debatecheck/optimize.ts
  - 0a54c6000211c663 scripts/debatecheck/paper-tables.ts
  - 75c63769a515a8cb scripts/debatecheck/autorubric_validate.py
  - 57355712378b123b scripts/debatecheck/judge_decisions_dataset.py
  - 85efe86cae74c7ae scripts/debatecheck/judge_hhem.py

## Deviations

Recorded as they happened, each before the held-out motions were analysed.

1. H5 needs GPT-6 Luna Decisions under the relation question, which the judges table above omitted.
   After the framed Decisions runs had finished and before any analysis, Luna Decisions was run with the
   arena's loose relation question (a choice over supports / contradicts / says nothing, same input text)
   on the numeric pairs in both evidence conditions (`decisions-gpt-6-luna-loose.jsonl`, 0.66 USD).
2. Claude Sonnet 5.5 on HealthBench-100 test was not run. Claude's CHARM-100 run through Autorubric used
   about 22,700 prompt tokens per item (the library grades criterion by criterion with a long instruction),
   which at list price is 5.28 USD; with the 400 pairs (2.91 USD) the Anthropic spend reached the
   stopping rule (1.5 x 5 USD). Autorubric's own cost estimate for the same run, which credits prompt
   caching, is 1.70 USD. The account balance afterwards (2.23 USD left of 6.84) shows the charge was 1.70 USD, so the actual Anthropic spend was 4.61 USD, under the stopping threshold; the decision to skip HealthBench was taken on the list-price figure available at the time and is kept as recorded. Claude therefore appears on CHARM-100 only.
3. The study's LLM judges on the panels answer Autorubric's own grading prompt (the library's), not the
   DebateCheck framed prompt; this is what "through the library" means and is noted here for clarity.
4. The human validation is prepared (bench/debatecheck/human: two blind sheets, key, instructions) but the
   labels were not collected before the judge analysis; the construction labels are therefore reported
   without the human check, and the check will be added when both labellers have finished.
5. DeepSeek V4 Pro has no results on the subjective panels. Autorubric grades through LiteLLM with a
   JSON-schema `response_format`, which DeepSeek's API rejected on 2026-10-10 ("This response_format type is
   unavailable now") for every request, with the schema and with a plain `json_object` format passed through
   `extra_params`; the 100 CHARM items errored at no cost. H1 is therefore tested on Jev, Luna Decisions,
   Luna chat and Claude (CHARM-100) and on Jev, Luna Decisions and Luna chat (HealthBench-100 test).

After the runs, the scripts were reformatted with Prettier (whitespace only) and analysis scripts were added; fingerprints at the time of the analysis:
  - f1117d896e1557bb scripts/debatecheck/analyze-study.ts
  - c0d7f2d5d85753ac scripts/debatecheck/analyze.ts
  - 83ee72cbf852fea8 scripts/debatecheck/build-types.ts
  - 76bd9942d01da0ca scripts/debatecheck/build.ts
  - 83bde38af98472e3 scripts/debatecheck/export-autorubric.ts
  - 4e36efd177ae6c0c scripts/debatecheck/human-sheet.ts
  - 2235f3e553c79179 scripts/debatecheck/judge-decisions.ts
  - 118c55d0317e3c1e scripts/debatecheck/judge-jev.ts
  - d31cd824b132ab15 scripts/debatecheck/judge-llm.ts
  - 829c0de2cebb05df scripts/debatecheck/lib.ts
  - 1ed832406bfe47b8 scripts/debatecheck/optimize.ts
  - 0a54c6000211c663 scripts/debatecheck/paper-tables.ts
  - 84a9cf67a0867954 scripts/debatecheck/study-lib.ts
  - 92d1ccae94c35dbc scripts/debatecheck/study-spend.ts
  - 26d375ea95d658cb scripts/debatecheck/study-tables.ts
  - c3055e32a9f66d41 scripts/debatecheck/autorubric_validate.py
  - 57355712378b123b scripts/debatecheck/judge_decisions_dataset.py
  - 85efe86cae74c7ae scripts/debatecheck/judge_hhem.py
  - e4d858cc9f825349 scripts/debatecheck/panel_items.py
6. The DeepSeek V4 Pro run on the typed pairs stopped after 1,181 of 1,657 pairs: DeepSeek lowers the
   allowed request concurrency as the balance falls and refused the sixth parallel request. The run was
   resumed on the remaining pairs at concurrency 3; the script is resumable per pair and nothing was
   re-judged.
   The second resumption failed the same way at concurrency 3 (the limit had fallen to five requests), so
   `judge-llm.ts` gained a wait-and-retry on rate-limit errors (no change to prompts or parsing) and the run
   continued at concurrency 2.
7. DeepSeek V4 Pro stopped with "Insufficient Balance" after 1,262 of the 1,657 typed pairs (all numeric
   pairs are judged). The provider's charge exceeded the list-price estimate the spend tally uses; the
   loaded 6.43 USD ran out. The study reports DeepSeek on the pairs it answered (coverage is shown per
   judge), and the run can be resumed with a small top-up since the script is resumable per pair.

## Results

Held-out report: bench/debatecheck/STUDY.md (study.json); training motions: STUDY-train.md. Verdicts: H1
not supported (DebateCheck phi lower for 4 of 6 pairs on CHARM-100, 1 of 3 on HealthBench-100; lower for
pairs with a decision model, higher for the LLM pair); H2 supported (mean phi LLM-LLM 0.72, decision-LLM
0.46, decision-decision 0.41, disjoint intervals between the extremes); H3 supported (Jev recall drop 24
points top-3, 28 over twenty; Luna Decisions 5 and 11); H4 partly supported (ordering survives
stratification against the Luna-DeepSeek pair, not against Luna-Claude); H5 not supported and reversed
(Luna Decisions: relation question AUROC 0.935 vs framed 0.811 over twenty passages). One exploratory,
labelled analysis was added after the pre-registered ones: splitting held-out items by whether the fact
passage is among the three passages read.

After the study, the framed criterion text was moved from `scripts/debatecheck/lib.ts` to `lib/jev/criterion.ts` (the arena's judge now asks it, rules v2); `lib.ts` re-exports it unchanged, so its fingerprint differs from the one recorded above while the question text does not.

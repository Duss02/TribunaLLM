# Hand review of the 58 sentences the sharp question flagged (p(contradicts) ≥ 0.7)

Reviewer: Claude (Fable 5.1), not a person; see `hand-review-pilot-blind-a.md` for the same caveat. Source:
`rejudge-pilot-blind-a.md`. RIGHT means the sentence really conflicts with the evidence (a wrong figure, date,
attribution or statement). WRONG means the sentence is consistent with the evidence or with the source it
names, so the flag is a false alarm. UNCLEAR means the evidence is mixed, the sentence is a generalisation,
or the pack's edition of a source differs from the one the sentence cites.

| # | model | review | why |
|---|---|---|---|
| 1 | opus | WRONG | "regardless of weather": a heat-wave caveat (W0216) does not contradict the general claim. |
| 2 | flash | UNCLEAR | "above 90% capacity factor": true for the US (92%), not the world average (83% in P07). |
| 3 | flash | RIGHT | "no study links taxes to reduced obesity": W0017 and P06 report health effects. |
| 4 | ds-pro | WRONG | flagged against France's 1988 capacity factor; the world average today is 83 to 89%. |
| 5 | ds-pro | UNCLEAR | as 2. |
| 6 | flash | WRONG | Lazard 2024 (v17) did give 142 to 222 and 29 to 92; the pack holds the 2026 edition (175 to 255, 40 to 98). Edition mismatch. |
| 7 | flash | WRONG | as 6. |
| 8 | ds-pro | UNCLEAR | "most expensive low-carbon option": Lazard supports it for new builds, W0075 says the opposite for lifetime extension. |
| 9 | ds-pro | UNCLEAR | "health gains have not materialised": P06 reports one; the rest is argument. |
| 10 | ds-pro | UNCLEAR | as 2. |
| 11 | sol | WRONG | 38% net after cross-border shopping is what the 2019 JAMA study reports (51% × (1 − 0.244)); W0018 describes a different study (46%, 22%). |
| 12 | flash | WRONG | as 6. |
| 13 | sonnet | WRONG | as 11. |
| 14 | sonnet | RIGHT | "offset about half": P13 says 24.4% of the decrease, and the sentence attributes it to that study. |
| 15 | ds-pro | UNCLEAR | "not a global norm": Flamanville and Olkiluoto argue otherwise, but it is a judgment. |
| 16 | flash | WRONG | as 6. |
| 17 | flash | WRONG | as 6. |
| 18 | luna | WRONG | Barakah unit 1 did enter commercial operation in 2021; the pack only mentions unit 4 (2024). |
| 19 | opus | WRONG | as 18. |
| 20 | ds-pro | WRONG | as 6. |
| 21 | flash | WRONG | as 6 (solar plus storage low end). |
| 22 | flash | WRONG | as 6. |
| 23 | flash | WRONG | as 6. |
| 24 | flash | WRONG | the evidence supports the sentence (P04, W0038). Same error as in the debate. |
| 25 | flash | WRONG | as 11. |
| 26 | sonnet | WRONG | modelling studies do project fewer cases; W0039 says the long-term effect is undetermined, not the opposite. |
| 27 | luna | WRONG | as 6. |
| 28 | sonnet | WRONG | net volume did fall (38%); the passages shown are unrelated. |
| 29 | ds-pro | WRONG | WHO's 2016 recommendation was a price rise of at least 20%; the pack has the 2025 call for 50%. |
| 30 | ds-pro | UNCLEAR | as 2. |
| 31 | sonnet | WRONG | "U.S. capacity factors above 90 percent" is true (W0068, W0003); flagged against France. |
| 32 | opus | RIGHT | Denmark also abolished its soft drink tax (W0027). |
| 33 | opus | WRONG | Lazard 2023 (v16) did give 141 to 221 and 24 to 75. Edition mismatch. |
| 34 | flash | WRONG | vague, not contradicted. |
| 35 | sol | WRONG | both attributions are right (P19 for Berkeley). |
| 36 | opus | WRONG | as 29. |
| 37 | sol | WRONG | as 18. |
| 38 | ds-pro | WRONG | a 22% net decline is what W0018 reports. |
| 39 | flash | UNCLEAR | "nuclear a minor share" of the IEA net zero path (about 8%) is a judgment; W1169 says the IEA wants it doubled. |
| 40 | opus | UNCLEAR | Our World in Data now gives 0.03 deaths per TWh; the pack's 2022 version says 0.07. Edition mismatch. |
| 41 | flash | UNCLEAR | the 15.6% figure could not be placed; the rest is mixed. |
| 42 | opus | RIGHT | mixes the numbers: 51% in-city drop, 24.4% of it offset, about 38% net; not "38% drop, 24.4% rise, 22% net". |
| 43 | sonnet | RIGHT | in-city volume fell 51% (P09); 38% is the net figure. |
| 44 | opus | UNCLEAR | as 40. |
| 45 | flash | RIGHT | Roberto's study found 38% net; 22% belongs to a different study. |
| 46 | ds-pro | RIGHT | the 2016 BMJ study covered 2014 only; 9.7% in 2015 is from a 2017 paper. |
| 47 | flash | RIGHT | the PLOS Medicine study is from January 2023, not 2024 (P06). |
| 48 | sonnet | RIGHT | as 32. |
| 49 | opus | RIGHT | 51% in-city drop and 24.4% offset (P09, P13), not 38% and half. |
| 50 | opus | UNCLEAR | Lazard's LCOE+ does report firming costs; P21 says intermittency is mostly not considered. |
| 51 | flash | UNCLEAR | depends on which follow-up; W0062 reports a 63% rise in water intake in Berkeley. |
| 52 | luna | RIGHT | as 32. |
| 53 | opus | WRONG | a description of the opponent's argument, not a factual claim. |
| 54 | opus | WRONG | as 33. |
| 55 | opus | UNCLEAR | as 40. |
| 56 | opus | UNCLEAR | P05 gives 46% (sugar per 100 ml) and 34.3% (total sugar sold); "roughly 29 percent" is not in the evidence. |
| 57 | luna | RIGHT | as 46 (5.5% and 9.7% are from the 2017 paper, not the 2016 BMJ study). |
| 58 | flash | RIGHT | the 189,300 figure is from a 2016 PLOS Medicine study (W0040), not JAMA Network Open 2019. |

## Tally

| review | count | share |
|---|---:|---:|
| RIGHT (real error) | 13 | 22% |
| UNCLEAR | 15 | 26% |
| WRONG (false alarm) | 30 | 52% |

Real errors by model: deepseek-v4-flash 4 (of 234 claims), claude-opus-5.5 3 (of 244), claude-sonnet-5.5 3 (of 217),
gpt-6-luna 2 (of 120), deepseek-v4-pro 1 (of 203), gpt-6.1-sol 0 (of 151). These are only the errors the sharp
question surfaced; the perturbation test says it finds about a third of altered numbers, so the true counts are
higher and unknown.

## What the false alarms have in common

- **Edition mismatch** (12 of 30): the sentence quotes Lazard 2023 or 2024 correctly, the pack carries Lazard 2026, and the judge reads the different range as a contradiction. The same happens with Our World in Data's 0.03 versus the pack's 0.07 (3 cases, counted as unclear).
- **A different study of the same thing** (5): Philadelphia's 38% net decline (JAMA 2019) against a library passage describing another study's 46% and 22%.
- **A fact the evidence does not cover but a related passage seems to** (3): Barakah unit 1's 2021 start, when the pack only dates unit 4.
- **General claims flagged by one counter-example** (4): "runs regardless of weather", "above 90% capacity factor", against passages about heat waves or France in 1988.

The real errors are of a kind a benchmark wants to catch: a wrong year (47), a wrong journal or study (46, 57, 58),
mixed-up figures (42, 43, 45, 49), a claim the library refutes outright (3, 32, 48, 52).

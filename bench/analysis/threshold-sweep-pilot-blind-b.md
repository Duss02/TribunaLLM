# Threshold sweep (120 blind debates, 6 models)

Baseline thresholds: claim 0.5, contradicted 0.7, supported 0.7.

| model | claims | contradicted | rate | supported | win rate |
|---|---:|---:|---:|---:|---:|
| claude-opus-5.5 | 484 | 1 |   0.2% | 293 |  68.8% |
| claude-sonnet-5.5 | 373 | 0 |   0.0% | 221 |  56.3% |
| deepseek-v4-flash | 433 | 3 |   0.7% | 233 |  47.5% |
| deepseek-v4-pro | 377 | 12 |   3.2% | 160 |  32.5% |
| gpt-6-luna | 217 | 1 |   0.5% | 158 |  32.5% |
| gpt-6.1-sol | 304 | 0 |   0.0% | 219 |  62.5% |

## Moving one threshold at a time

Spearman ρ compares the ranking by contradiction rate (and by win rate) with the baseline ranking. 1 means identical order.

| threshold | value | total contradicted | total claims | ρ contradiction rank | ρ win rank | winners changed |
|---|---:|---:|---:|---:|---:|---:|
| claim | 0.3 | 18 | 2850 | 1.00 | 0.89 | 19 / 120 |
| claim | 0.4 | 18 | 2498 | 1.00 | 0.94 | 7 / 120 |
| claim | 0.5 | 17 | 2188 | 1.00 | 1.00 | 0 / 120 |
| claim | 0.6 | 16 | 1886 | 1.00 | 0.89 | 14 / 120 |
| claim | 0.7 | 13 | 1595 | 0.94 | 0.89 | 17 / 120 |
| contradicted | 0.5 | 38 | 2188 | 0.60 | 0.94 | 4 / 120 |
| contradicted | 0.6 | 26 | 2188 | 0.83 | 1.00 | 0 / 120 |
| contradicted | 0.7 | 17 | 2188 | 1.00 | 1.00 | 0 / 120 |
| contradicted | 0.8 | 4 | 2188 | 0.49 | 0.94 | 3 / 120 |
| contradicted | 0.9 | 0 | 2188 | 0.14 | 0.94 | 3 / 120 |
| supported | 0.5 | 17 | 2188 | 1.00 | 0.89 | 21 / 120 |
| supported | 0.6 | 17 | 2188 | 1.00 | 0.94 | 12 / 120 |
| supported | 0.7 | 17 | 2188 | 1.00 | 1.00 | 0 / 120 |
| supported | 0.8 | 17 | 2188 | 1.00 | 0.89 | 15 / 120 |
| supported | 0.9 | 17 | 2188 | 1.00 | 0.89 | 27 / 120 |

## Distribution of the judge's probabilities

```
bins        0.0   0.1   0.2   0.3   0.4   0.5   0.6   0.7   0.8   0.9
is_claim      747   596   438   352   310   302   291   292   402   901
supported      78   242   394   437   465   557   547   597   735   579
contradicts  3905   416   143    67    28    25    20    18     8     1
```

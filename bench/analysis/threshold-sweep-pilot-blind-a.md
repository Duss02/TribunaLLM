# Threshold sweep (60 blind debates, 6 models)

Baseline thresholds: claim 0.5, contradicted 0.7, supported 0.7.

| model | claims | contradicted | rate | supported | win rate |
|---|---:|---:|---:|---:|---:|
| claude-opus-5.5 | 244 | 0 |   0.0% | 127 |  77.5% |
| claude-sonnet-5.5 | 217 | 0 |   0.0% | 123 |  72.5% |
| deepseek-v4-flash | 234 | 2 |   0.9% | 116 |  35.0% |
| deepseek-v4-pro | 203 | 1 |   0.5% | 102 |  37.5% |
| gpt-6-luna | 120 | 0 |   0.0% | 70 |  12.5% |
| gpt-6.1-sol | 151 | 0 |   0.0% | 98 |  65.0% |

## Moving one threshold at a time

Spearman ρ compares the ranking by contradiction rate (and by win rate) with the baseline ranking. 1 means identical order.

| threshold | value | total contradicted | total claims | ρ contradiction rank | ρ win rank | winners changed |
|---|---:|---:|---:|---:|---:|---:|
| claim | 0.3 | 3 | 1515 | 1.00 | 0.54 | 13 / 60 |
| claim | 0.4 | 3 | 1327 | 1.00 | 0.77 | 9 / 60 |
| claim | 0.5 | 3 | 1169 | 1.00 | 1.00 | 0 / 60 |
| claim | 0.6 | 2 | 1034 | 0.83 | 0.83 | 7 / 60 |
| claim | 0.7 | 2 | 877 | 0.83 | 0.77 | 11 / 60 |
| contradicted | 0.5 | 12 | 1169 | 0.31 | 1.00 | 0 / 60 |
| contradicted | 0.6 | 8 | 1169 | 0.43 | 1.00 | 0 / 60 |
| contradicted | 0.7 | 3 | 1169 | 1.00 | 1.00 | 0 / 60 |
| contradicted | 0.8 | 1 | 1169 | 0.83 | 1.00 | 0 / 60 |
| contradicted | 0.9 | 0 | 1169 | 0.49 | 1.00 | 0 / 60 |
| supported | 0.5 | 3 | 1169 | 1.00 | 1.00 | 9 / 60 |
| supported | 0.6 | 3 | 1169 | 1.00 | 1.00 | 6 / 60 |
| supported | 0.7 | 3 | 1169 | 1.00 | 1.00 | 0 / 60 |
| supported | 0.8 | 3 | 1169 | 1.00 | 0.71 | 15 / 60 |
| supported | 0.9 | 3 | 1169 | 1.00 | 0.77 | 20 / 60 |

## Distribution of the judge's probabilities

```
bins        0.0   0.1   0.2   0.3   0.4   0.5   0.6   0.7   0.8   0.9
is_claim      282   231   211   188   158   135   157   158   237   482
supported      22    91   145   168   238   260   304   355   333   323
contradicts  1864   228    66    44    13    10     9     3     1     1
```

# Where judges err together: study report

Generated 2026-10-10 by `scripts/debatecheck/analyze-study.ts`. Pre-registration: docs/preregistration-judge-correlation.md.

Split analysed: **training motions only (the held-out motions stay closed until every judge has finished)**. Thresholds and selective rules are fitted on the training motions. Intervals are 95 percent percentile bootstraps resampling pairs (1,000 resamples).

## 1. Items

| type | items in split | pairs |
|---|---|---|
| number | 1514 | 757 |
| polarity | 438 | 219 |
| entity | 1188 | 594 |
| attribution | 398 | 199 |
| unit | 490 | 245 |

## 2. Judges

| judge | kind | maker | evidence | scale | items answered in split | coverage |
|---|---|---|---|---|---|---|
| Jev 1.13.0, framed, 20 passages | decision model | TypeSafe | 20 passages | probability, decides at 0.5 | 4028 | 100.0% |
| Jev 1.13.0, framed, top-3 | decision model | TypeSafe | top-3 | probability, decides at 0.5 | 4028 | 100.0% |
| GPT-6 Luna Decisions, framed, 20 passages | decision model | OpenAI | 20 passages | probability, decides at 0.5 | 4028 | 100.0% |
| GPT-6 Luna Decisions, framed, top-3 | decision model | OpenAI | top-3 | probability, decides at 0.5 | 4028 | 100.0% |
| GPT-6 Luna chat, framed, top-3 | LLM | OpenAI | top-3 | MET / UNMET label | 4028 | 100.0% |
| DeepSeek V4 Pro chat, framed, top-3 | LLM | DeepSeek | top-3 | MET / UNMET label | 3472 | 86.2% |
| Claude Sonnet 5.5 chat, framed, top-3 | LLM | Anthropic | top-3 | MET / UNMET label | 0 | 0.0% |
| HHEM-2.1-Open, top-3 | NLI classifier | Vectara | top-3 | probability, decides at 0.5 | 4028 | 100.0% |
| Jev 1.13.0, framed, top-3, threshold 0.60 | decision model | TypeSafe | top-3 | probability, decides at 0.60 (fitted on train) | 4028 | 100.0% |
| GPT-6 Luna Decisions, framed, top-3, threshold 0.84 | decision model | OpenAI | top-3 | probability, decides at 0.84 (fitted on train) | 4028 | 100.0% |
| HHEM-2.1-Open, top-3, threshold 0.68 | NLI classifier | Vectara | top-3 | probability, decides at 0.68 (fitted on train) | 4028 | 100.0% |
| Jev 1.13.0, framed, 20 passages, threshold 0.56 | decision model | TypeSafe | 20 passages | probability, decides at 0.56 (fitted on train) | 4028 | 100.0% |
| GPT-6 Luna Decisions, framed, 20 passages, threshold 0.78 | decision model | OpenAI | 20 passages | probability, decides at 0.78 (fitted on train) | 4028 | 100.0% |

Abstention rule: an LLM answer that is not the JSON verdict is excluded and counted in coverage; decision models and HHEM always answer. Claude Sonnet 5.5 was run on 400 held-out pairs only (200 numeric, 50 per new type).

## 3. Judge accuracy

### 3.1 All types

| judge | n | judge positive | label positive | accuracy | recall (altered) | false alarm (unchanged) | AUROC |
|---|---|---|---|---|---|---|---|
| Jev 1.13.0, framed, 20 passages | 4028 | 51.3% | 50.0% | 77.4% [76.3%, 78.6%] | 78.7% [77.0%, 80.4%] | 23.8% [21.8%, 25.7%] | 0.863 [0.854, 0.873] |
| Jev 1.13.0, framed, top-3 | 4028 | 46.9% | 50.0% | 73.6% [72.3%, 74.7%] | 70.5% [68.4%, 72.3%] | 23.3% [21.5%, 25.2%] | 0.825 [0.813, 0.836] |
| GPT-6 Luna Decisions, framed, 20 passages | 4028 | 56.5% | 50.0% | 67.8% [66.3%, 69.0%] | 74.3% [72.3%, 76.2%] | 38.8% [36.7%, 41.0%] | 0.764 [0.749, 0.777] |
| GPT-6 Luna Decisions, framed, top-3 | 4028 | 50.9% | 50.0% | 63.4% [62.1%, 64.7%] | 64.3% [62.4%, 66.5%] | 37.5% [35.5%, 39.5%] | 0.697 [0.682, 0.712] |
| GPT-6 Luna chat, framed, top-3 | 4028 | 51.0% | 50.0% | 76.7% [75.5%, 77.9%] | 77.7% [75.8%, 79.4%] | 24.3% [22.3%, 26.2%] | - |
| DeepSeek V4 Pro chat, framed, top-3 | 3472 | 53.4% | 50.3% | 78.3% [77.1%, 79.5%] | 81.5% [79.8%, 83.3%] | 25.0% [22.9%, 27.1%] | - |
| Claude Sonnet 5.5 chat, framed, top-3 | 0 | 0.0% | 0.0% | - | - | - | - |
| HHEM-2.1-Open, top-3 | 4028 | 61.2% | 50.0% | 68.9% [67.9%, 70.0%] | 80.1% [78.4%, 81.9%] | 42.3% [40.4%, 44.6%] | 0.743 [0.733, 0.755] |
| Jev 1.13.0, framed, top-3, threshold 0.60 | 4028 | 40.3% | 50.0% | 74.3% [73.0%, 75.3%] | 64.6% [62.5%, 66.6%] | 16.1% [14.5%, 17.8%] | 0.825 [0.813, 0.836] |
| GPT-6 Luna Decisions, framed, top-3, threshold 0.84 | 4028 | 36.0% | 50.0% | 65.2% [63.8%, 66.4%] | 51.2% [49.0%, 53.3%] | 20.9% [19.2%, 22.7%] | 0.697 [0.682, 0.712] |
| HHEM-2.1-Open, top-3, threshold 0.68 | 4028 | 52.4% | 50.0% | 69.4% [68.3%, 70.5%] | 71.8% [70.0%, 73.8%] | 33.0% [31.1%, 35.1%] | 0.743 [0.733, 0.755] |
| Jev 1.13.0, framed, 20 passages, threshold 0.56 | 4028 | 46.2% | 50.0% | 78.7% [77.5%, 79.8%] | 74.8% [72.9%, 76.6%] | 17.5% [15.8%, 19.2%] | 0.863 [0.854, 0.873] |
| GPT-6 Luna Decisions, framed, 20 passages, threshold 0.78 | 4028 | 43.4% | 50.0% | 70.0% [68.6%, 71.3%] | 63.4% [61.2%, 65.5%] | 23.4% [21.6%, 25.3%] | 0.764 [0.749, 0.777] |

### 3.2 Accuracy by type

| judge | number (n) | polarity (n) | entity (n) | attribution (n) | unit (n) |
|---|---|---|---|---|---|
| Jev 1.13.0, framed, 20 passages | 83.6% [81.7%, 85.2%] (1514) | 77.6% [74.4%, 81.1%] (438) | 77.8% [75.7%, 80.0%] (1188) | 76.6% [73.1%, 79.9%] (398) | 58.2% [55.7%, 60.8%] (490) |
| Jev 1.13.0, framed, top-3 | 78.2% [76.3%, 80.1%] (1514) | 75.3% [72.1%, 78.8%] (438) | 72.5% [70.2%, 74.6%] (1188) | 73.9% [70.1%, 77.9%] (398) | 60.2% [57.3%, 63.1%] (490) |
| GPT-6 Luna Decisions, framed, 20 passages | 71.9% [69.6%, 73.8%] (1514) | 66.9% [63.0%, 71.0%] (438) | 65.2% [62.6%, 67.7%] (1188) | 69.3% [65.3%, 73.6%] (398) | 60.8% [56.9%, 64.7%] (490) |
| GPT-6 Luna Decisions, framed, top-3 | 65.5% [63.3%, 67.8%] (1514) | 65.3% [61.4%, 69.4%] (438) | 61.1% [58.4%, 63.5%] (1188) | 63.1% [58.8%, 67.3%] (398) | 61.2% [58.0%, 64.7%] (490) |
| GPT-6 Luna chat, framed, top-3 | 77.7% [75.7%, 79.6%] (1514) | 80.6% [77.4%, 84.0%] (438) | 75.0% [72.6%, 77.1%] (1188) | 74.6% [71.1%, 78.4%] (398) | 75.7% [72.2%, 79.2%] (490) |
| DeepSeek V4 Pro chat, framed, top-3 | 80.8% [79.1%, 82.7%] (1464) | 81.6% [78.0%, 84.9%] (347) | 75.3% [72.7%, 77.9%] (939) | 77.8% [73.6%, 82.0%] (361) | 73.1% [69.0%, 77.0%] (361) |
| Claude Sonnet 5.5 chat, framed, top-3 | - | - | - | - | - |
| HHEM-2.1-Open, top-3 | 75.2% [73.4%, 76.9%] (1514) | 54.1% [52.1%, 56.6%] (438) | 73.1% [70.9%, 75.1%] (1188) | 66.3% [63.1%, 69.8%] (398) | 54.7% [52.2%, 57.3%] (490) |
| Jev 1.13.0, framed, top-3, threshold 0.60 | 79.1% [77.2%, 81.0%] (1514) | 76.5% [73.1%, 79.9%] (438) | 73.7% [71.5%, 75.8%] (1188) | 74.6% [70.9%, 78.4%] (398) | 58.2% [55.5%, 61.0%] (490) |
| GPT-6 Luna Decisions, framed, top-3, threshold 0.84 | 67.4% [65.3%, 69.4%] (1514) | 67.8% [63.7%, 71.9%] (438) | 64.6% [62.0%, 66.8%] (1188) | 61.8% [57.8%, 65.8%] (398) | 60.0% [56.7%, 63.5%] (490) |
| HHEM-2.1-Open, top-3, threshold 0.68 | 76.0% [74.0%, 77.7%] (1514) | 52.7% [50.7%, 55.0%] (438) | 74.9% [72.8%, 77.0%] (1188) | 65.6% [62.6%, 68.8%] (398) | 53.9% [51.8%, 56.1%] (490) |
| Jev 1.13.0, framed, 20 passages, threshold 0.56 | 85.7% [83.9%, 87.4%] (1514) | 79.0% [75.8%, 82.6%] (438) | 78.4% [76.3%, 80.4%] (1188) | 77.1% [73.6%, 80.4%] (398) | 58.6% [55.9%, 61.2%] (490) |
| GPT-6 Luna Decisions, framed, 20 passages, threshold 0.78 | 74.9% [72.7%, 77.1%] (1514) | 72.4% [68.7%, 76.7%] (438) | 68.2% [65.6%, 70.7%] (1188) | 67.6% [63.6%, 71.6%] (398) | 59.0% [55.5%, 62.4%] (490) |

### 3.3 Recall on altered sentences by type

| judge | number (n) | polarity (n) | entity (n) | attribution (n) | unit (n) |
|---|---|---|---|---|---|
| Jev 1.13.0, framed, 20 passages | 91.7% [89.6%, 93.7%] (1514) | 81.3% [75.8%, 86.8%] (438) | 77.1% [73.9%, 80.3%] (1188) | 77.4% [71.4%, 82.9%] (398) | 41.2% [35.5%, 46.9%] (490) |
| Jev 1.13.0, framed, top-3 | 79.5% [76.6%, 82.2%] (1514) | 78.1% [72.1%, 83.6%] (438) | 66.5% [63.1%, 70.4%] (1188) | 71.9% [65.8%, 77.9%] (398) | 44.5% [38.4%, 50.6%] (490) |
| GPT-6 Luna Decisions, framed, 20 passages | 83.2% [80.4%, 85.7%] (1514) | 79.0% [73.5%, 84.5%] (438) | 67.7% [64.0%, 71.2%] (1188) | 71.4% [65.3%, 77.4%] (398) | 60.8% [54.7%, 66.9%] (490) |
| GPT-6 Luna Decisions, framed, top-3 | 70.0% [66.7%, 73.1%] (1514) | 73.5% [67.6%, 79.0%] (438) | 56.6% [52.7%, 60.3%] (1188) | 61.8% [54.8%, 68.8%] (398) | 59.6% [54.3%, 65.7%] (490) |
| GPT-6 Luna chat, framed, top-3 | 80.3% [77.5%, 83.1%] (1514) | 85.8% [80.8%, 90.4%] (438) | 72.9% [69.2%, 76.1%] (1188) | 76.4% [70.4%, 82.4%] (398) | 74.7% [69.4%, 80.4%] (490) |
| DeepSeek V4 Pro chat, framed, top-3 | 84.5% [81.9%, 87.2%] (1464) | 86.4% [81.3%, 91.0%] (347) | 77.8% [73.9%, 81.5%] (939) | 83.7% [78.4%, 88.7%] (361) | 72.0% [65.0%, 78.9%] (361) |
| Claude Sonnet 5.5 chat, framed, top-3 | - | - | - | - | - |
| HHEM-2.1-Open, top-3 | 93.0% [91.1%, 94.7%] (1514) | 40.6% [34.2%, 47.0%] (438) | 95.3% [93.6%, 96.8%] (1188) | 71.4% [64.8%, 77.9%] (398) | 45.7% [39.6%, 51.8%] (490) |
| Jev 1.13.0, framed, top-3, threshold 0.60 | 74.4% [71.1%, 77.1%] (1514) | 72.6% [66.7%, 79.0%] (438) | 61.3% [57.4%, 65.2%] (1188) | 65.3% [58.8%, 71.4%] (398) | 34.7% [29.4%, 41.2%] (490) |
| GPT-6 Luna Decisions, framed, top-3, threshold 0.84 | 57.1% [53.6%, 60.4%] (1514) | 58.4% [52.1%, 65.3%] (438) | 48.1% [44.1%, 52.0%] (1188) | 43.7% [36.7%, 50.8%] (398) | 40.0% [34.3%, 46.1%] (490) |
| HHEM-2.1-Open, top-3, threshold 0.68 | 84.9% [82.4%, 87.5%] (1514) | 29.7% [23.7%, 36.1%] (438) | 90.9% [88.6%, 93.3%] (1188) | 59.8% [52.8%, 66.8%] (398) | 32.7% [26.9%, 38.8%] (490) |
| Jev 1.13.0, framed, 20 passages, threshold 0.56 | 89.0% [86.7%, 91.3%] (1514) | 77.6% [72.1%, 83.1%] (438) | 71.9% [68.4%, 75.3%] (1188) | 73.9% [67.8%, 79.9%] (398) | 36.3% [30.2%, 42.0%] (490) |
| GPT-6 Luna Decisions, framed, 20 passages, threshold 0.78 | 74.6% [71.5%, 77.7%] (1514) | 68.0% [62.1%, 74.4%] (438) | 59.6% [55.6%, 63.5%] (1188) | 56.3% [49.2%, 63.3%] (398) | 39.6% [33.5%, 45.3%] (490) |

### 3.4 False alarms on unchanged sentences by type

| judge | number (n) | polarity (n) | entity (n) | attribution (n) | unit (n) |
|---|---|---|---|---|---|
| Jev 1.13.0, framed, 20 passages | 24.6% [21.4%, 27.7%] (1514) | 26.0% [20.5%, 31.5%] (438) | 21.5% [18.4%, 24.9%] (1188) | 24.1% [18.1%, 30.2%] (398) | 24.9% [19.6%, 30.6%] (490) |
| Jev 1.13.0, framed, top-3 | 23.1% [20.1%, 26.3%] (1514) | 27.4% [21.5%, 33.3%] (438) | 21.5% [18.5%, 24.9%] (1188) | 24.1% [18.6%, 30.2%] (398) | 24.1% [18.8%, 29.4%] (490) |
| GPT-6 Luna Decisions, framed, 20 passages | 39.5% [36.3%, 42.9%] (1514) | 45.2% [38.8%, 51.6%] (438) | 37.4% [33.7%, 41.1%] (1188) | 32.7% [26.6%, 38.7%] (398) | 39.2% [33.1%, 45.3%] (490) |
| GPT-6 Luna Decisions, framed, top-3 | 39.0% [35.5%, 42.7%] (1514) | 42.9% [36.1%, 49.3%] (438) | 34.3% [30.5%, 38.0%] (1188) | 35.7% [28.6%, 42.7%] (398) | 37.1% [31.4%, 42.9%] (490) |
| GPT-6 Luna chat, framed, top-3 | 25.0% [21.9%, 28.1%] (1514) | 24.7% [19.2%, 30.1%] (438) | 22.9% [19.5%, 26.3%] (1188) | 27.1% [21.1%, 33.2%] (398) | 23.3% [18.4%, 28.6%] (490) |
| DeepSeek V4 Pro chat, framed, top-3 | 22.9% [19.9%, 26.0%] (1464) | 23.4% [17.3%, 29.7%] (347) | 27.3% [23.4%, 31.4%] (939) | 28.2% [21.0%, 35.2%] (361) | 25.8% [19.7%, 31.9%] (361) |
| Claude Sonnet 5.5 chat, framed, top-3 | - | - | - | - | - |
| HHEM-2.1-Open, top-3 | 42.7% [39.4%, 46.0%] (1514) | 32.4% [26.0%, 39.3%] (438) | 49.0% [45.1%, 53.2%] (1188) | 38.7% [32.2%, 44.7%] (398) | 36.3% [30.2%, 42.4%] (490) |
| Jev 1.13.0, framed, top-3, threshold 0.60 | 16.1% [13.6%, 18.8%] (1514) | 19.6% [14.2%, 24.7%] (438) | 13.8% [11.1%, 16.8%] (1188) | 16.1% [11.1%, 21.6%] (398) | 18.4% [13.9%, 23.3%] (490) |
| GPT-6 Luna Decisions, framed, top-3, threshold 0.84 | 22.3% [19.6%, 25.4%] (1514) | 22.8% [17.4%, 28.8%] (438) | 18.9% [15.7%, 22.2%] (1188) | 20.1% [14.6%, 25.1%] (398) | 20.0% [15.1%, 25.3%] (490) |
| HHEM-2.1-Open, top-3, threshold 0.68 | 33.0% [29.9%, 36.6%] (1514) | 24.2% [18.7%, 30.1%] (438) | 41.1% [37.2%, 44.8%] (1188) | 28.6% [22.6%, 34.7%] (398) | 24.9% [19.6%, 30.2%] (490) |
| Jev 1.13.0, framed, 20 passages, threshold 0.56 | 17.6% [14.7%, 20.3%] (1514) | 19.6% [14.2%, 24.7%] (438) | 15.2% [12.5%, 18.4%] (1188) | 19.6% [14.1%, 25.1%] (398) | 19.2% [14.3%, 24.1%] (490) |
| GPT-6 Luna Decisions, framed, 20 passages, threshold 0.78 | 24.8% [21.9%, 27.9%] (1514) | 23.3% [17.8%, 28.8%] (438) | 23.2% [19.9%, 26.6%] (1188) | 21.1% [15.6%, 26.6%] (398) | 21.6% [16.7%, 26.9%] (490) |

### 3.5 AUROC by type (scored judges)

| judge | number | polarity | entity | attribution | unit |
|---|---|---|---|---|---|
| Jev 1.13.0, framed, 20 passages | 0.942 [0.932, 0.952] | 0.865 [0.836, 0.896] | 0.862 [0.845, 0.879] | 0.833 [0.804, 0.862] | 0.646 [0.617, 0.676] |
| Jev 1.13.0, framed, top-3 | 0.878 [0.862, 0.892] | 0.855 [0.829, 0.885] | 0.815 [0.793, 0.836] | 0.812 [0.778, 0.848] | 0.662 [0.630, 0.694] |
| GPT-6 Luna Decisions, framed, 20 passages | 0.825 [0.802, 0.845] | 0.784 [0.744, 0.825] | 0.728 [0.700, 0.754] | 0.756 [0.714, 0.800] | 0.654 [0.614, 0.694] |
| GPT-6 Luna Decisions, framed, top-3 | 0.731 [0.708, 0.754] | 0.739 [0.699, 0.781] | 0.659 [0.631, 0.685] | 0.683 [0.640, 0.726] | 0.658 [0.621, 0.693] |
| HHEM-2.1-Open, top-3 | 0.814 [0.795, 0.831] | 0.573 [0.552, 0.595] | 0.807 [0.788, 0.826] | 0.720 [0.690, 0.752] | 0.560 [0.536, 0.585] |

## 4. H3: error type

Prediction: Jev's recall drops by at least 15 points from numbers to the mean of the other types; GPT-6 Luna's by less than 10.

| judge | recall on numbers | mean recall on other types | drop |
|---|---|---|---|
| Jev 1.13.0, framed, 20 passages | 91.7% | 69.2% | 22.4 pt |
| Jev 1.13.0, framed, top-3 | 79.5% | 65.2% | 14.3 pt |
| GPT-6 Luna Decisions, framed, 20 passages | 83.2% | 69.7% | 13.5 pt |
| GPT-6 Luna Decisions, framed, top-3 | 70.0% | 62.9% | 7.1 pt |
| GPT-6 Luna chat, framed, top-3 | 80.3% | 77.5% | 2.9 pt |
| DeepSeek V4 Pro chat, framed, top-3 | 84.5% | 80.0% | 4.5 pt |
| Claude Sonnet 5.5 chat, framed, top-3 | - | - | - |
| HHEM-2.1-Open, top-3 | 93.0% | 63.2% | 29.7 pt |

Verdict (top-3 condition): Jev drop 14.3 pt (predicted >= 15), Luna Decisions drop 7.1 pt (predicted < 10): half supported.

## 5. Error correlation between judges

For each pair of judges, on the items both answered: the 2x2 table of error indicators (both wrong / A only / B only / both right), phi, Cohen's kappa, P(B wrong | A wrong) against P(B wrong), and the lift.

### 5.1 Top-3 condition

| pair | n | both / A only / B only / neither wrong | phi | kappa | P(B wrong | A wrong) vs P(B wrong) | lift |
|---|---|---|---|---|---|---|
| Jev 1.13.0, framed, top-3 x GPT-6 Luna Decisions, framed, top-3 | 4028 | 737 / 327 / 736 / 2228 | 0.407 [0.375, 0.437] | 0.396 [0.364, 0.426] | 69.3% [66.5%, 72.1%] vs 36.6% | 1.894 |
| Jev 1.13.0, framed, top-3 x GPT-6 Luna chat, framed, top-3 | 4028 | 586 / 478 / 354 / 2610 | 0.450 [0.417, 0.478] | 0.448 [0.416, 0.477] | 55.1% [52.0%, 57.8%] vs 23.3% | 2.360 |
| Jev 1.13.0, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | 3472 | 505 / 367 / 249 / 2351 | 0.508 [0.472, 0.544] | 0.506 [0.470, 0.542] | 57.9% [54.6%, 61.2%] vs 21.7% | 2.667 |
| Jev 1.13.0, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 0 | 0 / 0 / 0 / 0 | - | - | - vs - | - |
| Jev 1.13.0, framed, top-3 x HHEM-2.1-Open, top-3 | 4028 | 382 / 682 / 870 / 2094 | 0.062 [0.027, 0.096] | 0.062 [0.027, 0.095] | 35.9% [33.1%, 38.5%] vs 31.1% | 1.155 |
| GPT-6 Luna Decisions, framed, top-3 x GPT-6 Luna chat, framed, top-3 | 4028 | 662 / 811 / 278 / 2277 | 0.388 [0.358, 0.420] | 0.369 [0.340, 0.401] | 44.9% [42.3%, 47.4%] vs 23.3% | 1.926 |
| GPT-6 Luna Decisions, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | 3472 | 522 / 723 / 232 / 1995 | 0.367 [0.332, 0.402] | 0.345 [0.313, 0.381] | 41.9% [39.1%, 44.9%] vs 21.7% | 1.931 |
| GPT-6 Luna Decisions, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 0 | 0 / 0 / 0 / 0 | - | - | - vs - | - |
| GPT-6 Luna Decisions, framed, top-3 x HHEM-2.1-Open, top-3 | 4028 | 448 / 1025 / 804 / 1751 | -0.011 [-0.044, 0.021] | -0.011 [-0.044, 0.021] | 30.4% [28.1%, 32.7%] vs 31.1% | 0.978 |
| GPT-6 Luna chat, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | 3472 | 584 / 203 / 170 / 2515 | 0.689 [0.659, 0.718] | 0.689 [0.659, 0.718] | 74.2% [71.0%, 77.2%] vs 21.7% | 3.417 |
| GPT-6 Luna chat, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 0 | 0 / 0 / 0 / 0 | - | - | - vs - | - |
| GPT-6 Luna chat, framed, top-3 x HHEM-2.1-Open, top-3 | 4028 | 285 / 655 / 967 / 2121 | -0.009 [-0.041, 0.025] | -0.009 [-0.041, 0.025] | 30.3% [27.3%, 33.4%] vs 31.1% | 0.975 |
| DeepSeek V4 Pro chat, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 0 | 0 / 0 / 0 / 0 | - | - | - vs - | - |
| DeepSeek V4 Pro chat, framed, top-3 x HHEM-2.1-Open, top-3 | 3472 | 249 / 505 / 816 / 1902 | 0.027 [-0.009, 0.062] | 0.026 [-0.009, 0.061] | 33.0% [29.7%, 36.2%] vs 30.7% | 1.077 |
| Claude Sonnet 5.5 chat, framed, top-3 x HHEM-2.1-Open, top-3 | 0 | 0 / 0 / 0 / 0 | - | - | - vs - | - |

### 5.2 Twenty-passage condition

| pair | n | both / A only / B only / neither wrong | phi | kappa | P(B wrong | A wrong) vs P(B wrong) | lift |
|---|---|---|---|---|---|---|
| Jev 1.13.0, framed, 20 passages x GPT-6 Luna Decisions, framed, 20 passages | 4028 | 555 / 354 / 744 / 2375 | 0.333 [0.302, 0.364] | 0.323 [0.292, 0.353] | 61.1% [57.9%, 64.0%] vs 32.2% | 1.893 |

### 5.3 H2: kind of judge

Prediction: two LLMs (highest) > decision model with LLM > two decision models of different makers, with non-overlapping intervals between the extremes.

| category | pairs | mean phi | phi range |
|---|---|---|---|
| LLM x LLM | luna-chat x deepseek-pro | 0.689 | 0.689 to 0.689 |
| decision x LLM | jev-3 x luna-chat, jev-3 x deepseek-pro, luna-dec-3 x luna-chat, luna-dec-3 x deepseek-pro | 0.428 | 0.367 to 0.508 |
| decision x decision | jev-3 x luna-dec-3 | 0.407 | 0.407 to 0.407 |
| with NLI classifier | jev-3 x hhem, luna-dec-3 x hhem, luna-chat x hhem, deepseek-pro x hhem | 0.017 | -0.011 to 0.062 |

Verdict: mean phi LLM x LLM 0.689, decision x LLM 0.428, decision x decision 0.407: **supported**.

### 5.4 Effective independent votes

k judges whose errors correlate with mean phi rho are worth k / (1 + (k - 1) rho) independent votes, computed on the items every judge of the set answered.

| set | k | items | mean phi | effective votes |
|---|---|---|---|---|
| Jev + Luna Decisions (top-3) | 2 | 4028 | 0.407 | 1.42 |
| Jev + Luna Decisions + Luna chat + DeepSeek Pro | 4 | 3472 | 0.473 | 1.65 |
| Luna chat + DeepSeek Pro | 2 | 3472 | 0.689 | 1.18 |

## 6. H4: difficulty strata

Items are split by whether a third judge was right (DeepSeek V4 Pro; Claude for pairs involving Pro, Luna chat when Claude has no items in the split). Prediction: Jev-LLM error correlation stays below LLM-LLM correlation within each stratum.

| pair | third judge | phi where third judge right | phi where third judge wrong |
|---|---|---|---|
| Jev 1.13.0, framed, top-3 x GPT-6 Luna Decisions, framed, top-3 | DeepSeek V4 Pro chat, framed, top-3 | 0.266 [0.226, 0.306] (n 2718) | 0.314 [0.245, 0.384] (n 754) |
| Jev 1.13.0, framed, top-3 x GPT-6 Luna chat, framed, top-3 | DeepSeek V4 Pro chat, framed, top-3 | 0.174 [0.124, 0.225] (n 2718) | 0.215 [0.141, 0.290] (n 754) |
| Jev 1.13.0, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | GPT-6 Luna chat, framed, top-3 | 0.255 [0.199, 0.309] (n 2685) | 0.343 [0.270, 0.412] (n 787) |
| Jev 1.13.0, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | DeepSeek V4 Pro chat, framed, top-3 | - (n 0) | - (n 0) |
| GPT-6 Luna Decisions, framed, top-3 x GPT-6 Luna chat, framed, top-3 | DeepSeek V4 Pro chat, framed, top-3 | 0.200 [0.155, 0.246] (n 2718) | 0.259 [0.176, 0.328] (n 754) |
| GPT-6 Luna Decisions, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | GPT-6 Luna chat, framed, top-3 | 0.128 [0.083, 0.173] (n 2685) | 0.174 [0.098, 0.245] (n 787) |
| GPT-6 Luna Decisions, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | DeepSeek V4 Pro chat, framed, top-3 | - (n 0) | - (n 0) |
| GPT-6 Luna chat, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | DeepSeek V4 Pro chat, framed, top-3 | - (n 0) | - (n 0) |
| DeepSeek V4 Pro chat, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | GPT-6 Luna chat, framed, top-3 | - (n 0) | - (n 0) |

## 6b. Exploratory (not pre-registered): is the fact passage among the three the judges read?

For each pair, whether one of the three passages selected for the altered sentence contains the pair's original token. Recall on altered sentences, false alarms and error correlation are split by this. The top-3 judges and HHEM read exactly these three passages; the twenty-passage judges are shown for contrast.

Share of train pairs whose altered sentence has its fact passage among the three: 75.9%.

| judge | recall, fact passage present (items) | recall, absent (items) | false alarm, present | false alarm, absent |
|---|---|---|---|---|
| Jev 1.13.0, framed, top-3 | 78.5% [76.4%, 80.4%] (3058) | 45.4% [41.2%, 49.9%] (970) | 21.8% [19.6%, 23.7%] | 28.2% [24.3%, 32.4%] |
| GPT-6 Luna Decisions, framed, top-3 | 72.5% [70.2%, 75.0%] (3058) | 38.6% [34.4%, 42.7%] (970) | 38.3% [36.0%, 40.7%] | 35.1% [30.7%, 39.6%] |
| GPT-6 Luna chat, framed, top-3 | 89.1% [87.6%, 90.6%] (3058) | 41.6% [37.3%, 46.0%] (970) | 24.7% [22.6%, 26.9%] | 23.1% [19.6%, 26.8%] |
| DeepSeek V4 Pro chat, framed, top-3 | 91.8% [90.3%, 93.3%] (2618) | 49.3% [44.8%, 54.1%] (854) | 24.9% [22.6%, 27.2%] | 25.2% [21.2%, 29.4%] |
| Claude Sonnet 5.5 chat, framed, top-3 | - (0) | - (0) | - | - |
| HHEM-2.1-Open, top-3 | 78.0% [75.9%, 80.1%] (3058) | 86.6% [83.7%, 89.5%] (970) | 34.4% [32.0%, 36.6%] | 67.0% [63.1%, 71.1%] |
| Jev 1.13.0, framed, 20 passages | 80.8% [78.8%, 82.9%] (3058) | 72.0% [68.0%, 75.9%] (970) | 22.3% [20.1%, 24.3%] | 28.7% [24.7%, 33.0%] |
| GPT-6 Luna Decisions, framed, 20 passages | 76.2% [73.9%, 78.4%] (3058) | 68.2% [63.9%, 72.4%] (970) | 37.8% [35.4%, 40.2%] | 41.9% [37.3%, 46.4%] |

| pair | phi, fact passage present | phi, absent |
|---|---|---|
| Jev 1.13.0, framed, top-3 x GPT-6 Luna Decisions, framed, top-3 | 0.342 [0.305, 0.382] (n 3058) | 0.515 [0.459, 0.570] (n 970) |
| Jev 1.13.0, framed, top-3 x GPT-6 Luna chat, framed, top-3 | 0.373 [0.336, 0.416] (n 3058) | 0.529 [0.472, 0.582] (n 970) |
| Jev 1.13.0, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | 0.442 [0.398, 0.487] (n 2618) | 0.572 [0.515, 0.631] (n 854) |
| Jev 1.13.0, framed, top-3 x HHEM-2.1-Open, top-3 | 0.137 [0.097, 0.177] (n 3058) | -0.186 [-0.250, -0.124] (n 970) |
| GPT-6 Luna Decisions, framed, top-3 x GPT-6 Luna chat, framed, top-3 | 0.307 [0.271, 0.344] (n 3058) | 0.518 [0.458, 0.579] (n 970) |
| GPT-6 Luna Decisions, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | 0.311 [0.268, 0.353] (n 2618) | 0.437 [0.372, 0.502] (n 854) |
| GPT-6 Luna Decisions, framed, top-3 x HHEM-2.1-Open, top-3 | 0.052 [0.016, 0.088] (n 3058) | -0.241 [-0.301, -0.174] (n 970) |
| GPT-6 Luna chat, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | 0.659 [0.617, 0.697] (n 2618) | 0.697 [0.642, 0.742] (n 854) |
| GPT-6 Luna chat, framed, top-3 x HHEM-2.1-Open, top-3 | 0.086 [0.049, 0.126] (n 3058) | -0.312 [-0.370, -0.252] (n 970) |
| DeepSeek V4 Pro chat, framed, top-3 x HHEM-2.1-Open, top-3 | 0.116 [0.074, 0.162] (n 2618) | -0.247 [-0.317, -0.181] (n 854) |

## 7. H5: the framing effect replicates for a second decision model

AUROC on numeric items of the loose relation question (the arena's wording, a choice over supports / contradicts / says nothing) against the framed criterion, same input text, GPT-6 Luna Decisions; Jev from the pilot for reference. Prediction: a gain of at least 0.05 for Luna Decisions.

| judge | AUROC, relation question | AUROC, framed criterion | gain |
|---|---|---|---|
| GPT-6 Luna Decisions, 20 passages | 0.919 [0.906, 0.932] | 0.825 [0.802, 0.845] | -0.094 |
| GPT-6 Luna Decisions, top-3 | 0.829 [0.809, 0.847] | 0.731 [0.708, 0.754] | -0.098 |
| Jev, 20 passages (pilot) | 0.889 [0.875, 0.904] | 0.942 [0.932, 0.952] | 0.054 |

Verdict: not supported.

## 8. Coverage at guaranteed risk

Accept an item when the judge's probability is at or above a high threshold (predict contradicted) or at or below a low one (predict not), thresholds chosen on the training motions as the widest region whose one-sided Clopper-Pearson 95 percent upper bound on the error is at most 5 percent; coverage and realised error on the training (same) items. Pairs: accept when both judges agree.

| judge | low / high threshold | train coverage | coverage | accepted | error among accepted | 95% upper bound |
|---|---|---|---|---|---|---|
| Jev 1.13.0, framed, 20 passages | 0.16 / 0.88 | 29.0% | 29.0% | 1167 | 3.5% | 4.5% |
| Jev 1.13.0, framed, top-3 | 0.10 / 0.92 | 21.0% | 21.0% | 845 | 3.7% | 4.9% |
| GPT-6 Luna Decisions, framed, 20 passages | - | none at 5% | - | - | - | - |
| GPT-6 Luna Decisions, framed, top-3 | - | none at 5% | - | - | - | - |
| HHEM-2.1-Open, top-3 | - | none at 5% | - | - | - | - |

| pair, agreement rule | coverage | accepted | error among accepted | 95% upper bound |
|---|---|---|---|---|
| Jev 1.13.0, framed, top-3 x GPT-6 Luna Decisions, framed, top-3 | 73.6% | 2965 | 24.9% | 26.2% |
| Jev 1.13.0, framed, top-3 x GPT-6 Luna chat, framed, top-3 | 79.3% | 3196 | 18.3% | 19.5% |
| Jev 1.13.0, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | 82.3% | 2856 | 17.7% | 18.9% |
| Jev 1.13.0, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 0.0% | 0 | - | - |
| Jev 1.13.0, framed, top-3 x HHEM-2.1-Open, top-3 | 61.5% | 2476 | 15.4% | 16.7% |
| GPT-6 Luna Decisions, framed, top-3 x GPT-6 Luna chat, framed, top-3 | 73.0% | 2939 | 22.5% | 23.8% |
| GPT-6 Luna Decisions, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | 72.5% | 2517 | 20.7% | 22.1% |
| GPT-6 Luna Decisions, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 0.0% | 0 | - | - |
| GPT-6 Luna Decisions, framed, top-3 x HHEM-2.1-Open, top-3 | 54.6% | 2199 | 20.4% | 21.8% |
| GPT-6 Luna chat, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | 89.3% | 3099 | 18.8% | 20.0% |
| GPT-6 Luna chat, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 0.0% | 0 | - | - |
| GPT-6 Luna chat, framed, top-3 x HHEM-2.1-Open, top-3 | 59.7% | 2406 | 11.8% | 13.0% |
| DeepSeek V4 Pro chat, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 0.0% | 0 | - | - |
| DeepSeek V4 Pro chat, framed, top-3 x HHEM-2.1-Open, top-3 | 62.0% | 2151 | 11.6% | 12.8% |
| Claude Sonnet 5.5 chat, framed, top-3 x HHEM-2.1-Open, top-3 | 0.0% | 0 | - | - |

## 9. Subjective panels and H1

CHARM-100 (primary) and HealthBench-100 test (secondary), judged through the Autorubric library (Jev under the noul_framed binary framing; LLM judges through LiteLLM at reasoning low) and the Decisions API. Ordinal criteria are MET in the upper half of their scale; the nominal response_length criterion and N/A labels are not used. Intervals resample items.

### 9.1 CHARM-100: 100 items, 491 criterion judgements with a human label

| judge | n | coverage | judge MET | label MET | accuracy | kappa |
|---|---|---|---|---|---|---|
| Jev (noul_framed) | 480 | 97.8% | 76.5% | 59.0% | 81.7% [77.3%, 85.8%] | 0.595 [0.495, 0.684] |
| Jev (choice framing) | 480 | 97.8% | 75.8% | 59.0% | 82.3% [77.9%, 86.3%] | 0.610 [0.512, 0.698] |
| GPT-6 Luna Decisions | 491 | 100.0% | 68.0% | 59.1% | 82.9% [79.0%, 86.6%] | 0.634 [0.545, 0.713] |
| GPT-6 Luna chat | 491 | 100.0% | 67.8% | 59.1% | 74.9% [70.5%, 79.3%] | 0.464 [0.364, 0.557] |
| Claude Sonnet 5.5 | 490 | 99.8% | 66.9% | 59.2% | 82.9% [78.9%, 86.5%] | 0.634 [0.550, 0.711] |

| pair | n | both / A only / B only / neither wrong | phi | kappa | P(B wrong | A wrong) vs P(B wrong) |
|---|---|---|---|---|---|
| Jev (noul_framed) x GPT-6 Luna Decisions | 480 | 58 / 30 / 22 / 370 | 0.626 [0.521, 0.731] | 0.625 [0.520, 0.727] | 65.9% [54.4%, 76.3%] vs 16.7% |
| Jev (noul_framed) x GPT-6 Luna chat | 480 | 64 / 24 / 55 / 337 | 0.526 [0.431, 0.616] | 0.516 [0.420, 0.608] | 72.7% [61.5%, 82.7%] vs 24.8% |
| Jev (noul_framed) x Claude Sonnet 5.5 | 480 | 55 / 33 / 25 / 367 | 0.583 [0.483, 0.682] | 0.582 [0.482, 0.681] | 62.5% [52.1%, 73.3%] vs 16.7% |
| GPT-6 Luna Decisions x GPT-6 Luna chat | 491 | 70 / 14 / 53 / 354 | 0.611 [0.534, 0.688] | 0.594 [0.509, 0.674] | 83.3% [74.6%, 91.3%] vs 25.1% |
| GPT-6 Luna Decisions x Claude Sonnet 5.5 | 490 | 54 / 29 / 30 / 377 | 0.574 [0.479, 0.662] | 0.574 [0.479, 0.661] | 65.1% [54.9%, 74.4%] vs 17.1% |
| GPT-6 Luna chat x Claude Sonnet 5.5 | 490 | 67 / 55 / 17 / 351 | 0.577 [0.502, 0.645] | 0.561 [0.484, 0.632] | 54.9% [46.8%, 62.5%] vs 17.1% |

### 9.2 HealthBench-100 test: 100 items, 205 criterion judgements with a human label

| judge | n | coverage | judge MET | label MET | accuracy | kappa |
|---|---|---|---|---|---|---|
| Jev (noul_framed) | 205 | 100.0% | 52.7% | 53.7% | 80.5% [75.2%, 86.0%] | 0.608 [0.501, 0.716] |
| Jev (choice framing) | 205 | 100.0% | 52.7% | 53.7% | 78.5% [72.6%, 83.8%] | 0.569 [0.451, 0.672] |
| GPT-6 Luna Decisions | 205 | 100.0% | 34.1% | 53.7% | 60.0% [52.0%, 67.4%] | 0.218 [0.076, 0.350] |
| GPT-6 Luna chat | 205 | 100.0% | 36.6% | 53.7% | 69.3% [62.2%, 76.5%] | 0.397 [0.269, 0.528] |

| pair | n | both / A only / B only / neither wrong | phi | kappa | P(B wrong | A wrong) vs P(B wrong) |
|---|---|---|---|---|---|
| Jev (noul_framed) x GPT-6 Luna Decisions | 205 | 24 / 16 / 58 / 107 | 0.201 [0.059, 0.344] | 0.178 [0.051, 0.306] | 60.0% [44.4%, 76.2%] vs 40.0% |
| Jev (noul_framed) x GPT-6 Luna chat | 205 | 23 / 17 / 40 / 125 | 0.286 [0.130, 0.443] | 0.273 [0.123, 0.428] | 57.5% [41.0%, 72.7%] vs 30.7% |
| GPT-6 Luna Decisions x GPT-6 Luna chat | 205 | 43 / 39 / 20 / 103 | 0.384 [0.268, 0.515] | 0.376 [0.259, 0.498] | 52.4% [41.5%, 63.5%] vs 30.7% |

### 9.3 H1: task objectivity

Prediction: for the same pair of judges, phi between error indicators is lower on DebateCheck (top-3 condition, this split) than on the subjective panel; support needs DebateCheck below the panel value for at least 80 percent of pairs, with non-overlapping intervals for at least half.

CHARM-100:

| pair | phi on DebateCheck | phi on CHARM-100 | DebateCheck lower | intervals disjoint |
|---|---|---|---|---|
| Jev (noul_framed) x GPT-6 Luna Decisions | 0.407 [0.375, 0.437] | 0.626 [0.521, 0.731] | yes | yes |
| Jev (noul_framed) x GPT-6 Luna chat | 0.450 [0.417, 0.478] | 0.526 [0.431, 0.616] | yes | no |
| GPT-6 Luna Decisions x GPT-6 Luna chat | 0.388 [0.358, 0.420] | 0.611 [0.534, 0.688] | yes | yes |

CHARM-100 verdict: DebateCheck lower in 3 of 3 pairs, disjoint in 2: **supported**.

HealthBench-100 test:

| pair | phi on DebateCheck | phi on HealthBench-100 test | DebateCheck lower | intervals disjoint |
|---|---|---|---|---|
| Jev (noul_framed) x GPT-6 Luna Decisions | 0.407 [0.375, 0.437] | 0.201 [0.059, 0.344] | no | no |
| Jev (noul_framed) x GPT-6 Luna chat | 0.450 [0.417, 0.478] | 0.286 [0.130, 0.443] | no | no |
| GPT-6 Luna Decisions x GPT-6 Luna chat | 0.388 [0.358, 0.420] | 0.384 [0.268, 0.515] | no | no |

HealthBench-100 test verdict: DebateCheck lower in 0 of 3 pairs, disjoint in 0: **not supported**.

## 10. Reporting checklist (Rao and Callison-Burch, 2606.00093)

- Scale: binary MET / UNMET per sentence against a construction label (altered = contradicted); decision models and HHEM give a probability decided at 0.5 or a train-fitted threshold, LLM judges a label.
- Abstention: an LLM answer without a parsable verdict is excluded and counted in coverage; coverage is reported per judge in section 2 and per panel judge in section 9.
- Positive rates: the judge's and the label's rates are in sections 3.1 and 9.
- Resampling unit: pairs on DebateCheck, conversations on the panels; 1,000 percentile bootstrap resamples, seed 1.
- Prompts and question texts: scripts/debatecheck at the fingerprints listed in the pre-registration.


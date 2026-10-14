# Where judges err together: study report

Generated 2026-10-10 by `scripts/debatecheck/analyze-study.ts` --heldout. Pre-registration: docs/preregistration-judge-correlation.md.

Split analysed: **held-out motions (crewed-spaceflight, rent-control)**. Thresholds and selective rules are fitted on the training motions. Intervals are 95 percent percentile bootstraps resampling pairs (1,000 resamples).

## 1. Items

| type | items in split | pairs |
|---|---|---|
| number | 814 | 407 |
| polarity | 100 | 50 |
| entity | 294 | 147 |
| attribution | 212 | 106 |
| unit | 194 | 97 |

## 2. Judges

| judge | kind | maker | evidence | scale | items answered in split | coverage |
|---|---|---|---|---|---|---|
| Jev 1.13.0, framed, 20 passages | decision model | TypeSafe | 20 passages | probability, decides at 0.5 | 1614 | 100.0% |
| Jev 1.13.0, framed, top-3 | decision model | TypeSafe | top-3 | probability, decides at 0.5 | 1614 | 100.0% |
| GPT-6 Luna Decisions, framed, 20 passages | decision model | OpenAI | 20 passages | probability, decides at 0.5 | 1614 | 100.0% |
| GPT-6 Luna Decisions, framed, top-3 | decision model | OpenAI | top-3 | probability, decides at 0.5 | 1614 | 100.0% |
| GPT-6 Luna chat, framed, top-3 | LLM | OpenAI | top-3 | MET / UNMET label | 1614 | 100.0% |
| DeepSeek V4 Pro chat, framed, top-3 | LLM | DeepSeek | top-3 | MET / UNMET label | 1221 | 75.7% |
| Claude Sonnet 5.5 chat, framed, top-3 | LLM | Anthropic | top-3 | MET / UNMET label | 800 | 49.6% |
| HHEM-2.1-Open, top-3 | NLI classifier | Vectara | top-3 | probability, decides at 0.5 | 1614 | 100.0% |
| Jev 1.13.0, framed, top-3, threshold 0.60 | decision model | TypeSafe | top-3 | probability, decides at 0.60 (fitted on train) | 1614 | 100.0% |
| GPT-6 Luna Decisions, framed, top-3, threshold 0.84 | decision model | OpenAI | top-3 | probability, decides at 0.84 (fitted on train) | 1614 | 100.0% |
| HHEM-2.1-Open, top-3, threshold 0.68 | NLI classifier | Vectara | top-3 | probability, decides at 0.68 (fitted on train) | 1614 | 100.0% |
| Jev 1.13.0, framed, 20 passages, threshold 0.56 | decision model | TypeSafe | 20 passages | probability, decides at 0.56 (fitted on train) | 1614 | 100.0% |
| GPT-6 Luna Decisions, framed, 20 passages, threshold 0.78 | decision model | OpenAI | 20 passages | probability, decides at 0.78 (fitted on train) | 1614 | 100.0% |

Abstention rule: an LLM answer that is not the JSON verdict is excluded and counted in coverage; decision models and HHEM always answer. Claude Sonnet 5.5 was run on 400 held-out pairs only (200 numeric, 50 per new type).

## 3. Judge accuracy

### 3.1 All types

| judge | n | judge positive | label positive | accuracy | recall (altered) | false alarm (unchanged) | AUROC |
|---|---|---|---|---|---|---|---|
| Jev 1.13.0, framed, 20 passages | 1614 | 46.2% | 50.0% | 86.1% [84.6%, 87.6%] | 82.3% [79.7%, 84.9%] | 10.2% [8.1%, 12.3%] | 0.916 [0.904, 0.928] |
| Jev 1.13.0, framed, top-3 | 1614 | 42.7% | 50.0% | 78.2% [76.4%, 80.0%] | 70.9% [67.7%, 74.1%] | 14.5% [12.1%, 16.9%] | 0.870 [0.855, 0.885] |
| GPT-6 Luna Decisions, framed, 20 passages | 1614 | 57.4% | 50.0% | 70.2% [67.8%, 72.6%] | 77.6% [74.6%, 80.4%] | 37.2% [33.7%, 40.5%] | 0.775 [0.751, 0.798] |
| GPT-6 Luna Decisions, framed, top-3 | 1614 | 49.9% | 50.0% | 66.2% [64.0%, 68.5%] | 66.0% [62.7%, 69.3%] | 33.7% [30.4%, 36.8%] | 0.726 [0.704, 0.749] |
| GPT-6 Luna chat, framed, top-3 | 1614 | 48.3% | 50.0% | 79.1% [77.1%, 80.9%] | 77.3% [74.2%, 80.2%] | 19.2% [16.7%, 21.9%] | - |
| DeepSeek V4 Pro chat, framed, top-3 | 1221 | 50.4% | 50.5% | 81.2% [79.0%, 83.3%] | 81.3% [78.2%, 84.4%] | 18.8% [15.8%, 22.3%] | - |
| Claude Sonnet 5.5 chat, framed, top-3 | 800 | 45.9% | 50.0% | 79.1% [76.6%, 81.9%] | 75.0% [70.5%, 79.0%] | 16.8% [13.3%, 20.8%] | - |
| HHEM-2.1-Open, top-3 | 1614 | 68.0% | 50.0% | 66.5% [64.6%, 68.2%] | 84.5% [81.9%, 86.9%] | 51.4% [48.1%, 54.8%] | 0.730 [0.710, 0.748] |
| Jev 1.13.0, framed, top-3, threshold 0.60 | 1614 | 38.1% | 50.0% | 78.7% [76.8%, 80.5%] | 66.8% [63.4%, 70.0%] | 9.4% [7.6%, 11.4%] | 0.870 [0.855, 0.885] |
| GPT-6 Luna Decisions, framed, top-3, threshold 0.84 | 1614 | 35.6% | 50.0% | 68.8% [66.9%, 70.9%] | 54.4% [50.8%, 57.9%] | 16.7% [14.3%, 19.2%] | 0.726 [0.704, 0.749] |
| HHEM-2.1-Open, top-3, threshold 0.68 | 1614 | 60.1% | 50.0% | 68.5% [66.7%, 70.1%] | 78.6% [75.7%, 81.2%] | 41.6% [38.3%, 45.0%] | 0.730 [0.710, 0.748] |
| Jev 1.13.0, framed, 20 passages, threshold 0.56 | 1614 | 43.6% | 50.0% | 85.7% [84.1%, 87.3%] | 79.3% [76.5%, 82.0%] | 7.8% [5.9%, 9.7%] | 0.916 [0.904, 0.928] |
| GPT-6 Luna Decisions, framed, 20 passages, threshold 0.78 | 1614 | 45.7% | 50.0% | 70.8% [68.5%, 73.0%] | 66.4% [63.3%, 69.8%] | 24.9% [22.1%, 27.8%] | 0.775 [0.751, 0.798] |

### 3.2 Accuracy by type

| judge | number (n) | polarity (n) | entity (n) | attribution (n) | unit (n) |
|---|---|---|---|---|---|
| Jev 1.13.0, framed, 20 passages | 93.9% [92.3%, 95.3%] (814) | 89.0% [83.0%, 95.0%] (100) | 85.7% [81.6%, 89.5%] (294) | 77.8% [73.1%, 82.5%] (212) | 61.3% [57.2%, 65.5%] (194) |
| Jev 1.13.0, framed, top-3 | 86.1% [83.9%, 88.3%] (814) | 84.0% [78.0%, 90.0%] (100) | 75.5% [70.7%, 80.3%] (294) | 71.7% [67.0%, 76.9%] (212) | 53.1% [49.5%, 56.7%] (194) |
| GPT-6 Luna Decisions, framed, 20 passages | 73.1% [70.0%, 76.2%] (814) | 72.0% [62.0%, 82.0%] (100) | 68.7% [63.6%, 73.8%] (294) | 66.5% [59.9%, 72.6%] (212) | 63.4% [56.7%, 69.6%] (194) |
| GPT-6 Luna Decisions, framed, top-3 | 68.8% [65.7%, 72.1%] (814) | 75.0% [68.0%, 82.0%] (100) | 62.9% [57.5%, 68.7%] (294) | 66.0% [60.4%, 71.2%] (212) | 55.7% [49.0%, 62.4%] (194) |
| GPT-6 Luna chat, framed, top-3 | 82.1% [79.5%, 84.5%] (814) | 85.0% [78.0%, 91.0%] (100) | 78.6% [74.1%, 83.3%] (294) | 74.5% [69.3%, 79.7%] (212) | 69.1% [63.9%, 74.7%] (194) |
| DeepSeek V4 Pro chat, framed, top-3 | 83.2% [80.7%, 85.4%] (796) | 82.1% [73.7%, 91.1%] (56) | 83.0% [77.6%, 88.7%] (159) | 83.0% [76.6%, 89.3%] (112) | 60.2% [52.0%, 68.0%] (98) |
| Claude Sonnet 5.5 chat, framed, top-3 | 84.5% [81.3%, 87.5%] (400) | 79.0% [73.0%, 86.0%] (100) | 77.0% [69.0%, 84.0%] (100) | 83.0% [76.0%, 90.0%] (100) | 56.0% [50.0%, 62.0%] (100) |
| HHEM-2.1-Open, top-3 | 71.6% [69.2%, 74.2%] (814) | 52.0% [47.0%, 57.0%] (100) | 70.7% [66.7%, 74.8%] (294) | 61.8% [56.6%, 67.5%] (212) | 51.5% [47.4%, 55.7%] (194) |
| Jev 1.13.0, framed, top-3, threshold 0.60 | 86.7% [84.6%, 88.8%] (814) | 85.0% [79.0%, 91.0%] (100) | 76.2% [72.1%, 80.6%] (294) | 70.3% [65.6%, 75.0%] (212) | 54.6% [51.5%, 58.2%] (194) |
| GPT-6 Luna Decisions, framed, top-3, threshold 0.84 | 70.8% [67.8%, 73.7%] (814) | 79.0% [71.0%, 88.0%] (100) | 68.0% [62.9%, 72.8%] (294) | 67.9% [62.7%, 73.1%] (212) | 57.7% [53.1%, 62.9%] (194) |
| HHEM-2.1-Open, top-3, threshold 0.68 | 73.5% [70.8%, 76.0%] (814) | 50.0% [46.0%, 54.0%] (100) | 73.5% [69.7%, 77.6%] (294) | 64.6% [59.4%, 70.3%] (212) | 53.6% [49.5%, 57.7%] (194) |
| Jev 1.13.0, framed, 20 passages, threshold 0.56 | 95.0% [93.5%, 96.3%] (814) | 92.0% [87.0%, 97.0%] (100) | 83.0% [79.3%, 86.7%] (294) | 75.9% [71.2%, 81.1%] (212) | 58.8% [54.6%, 62.9%] (194) |
| GPT-6 Luna Decisions, framed, 20 passages, threshold 0.78 | 74.8% [71.5%, 78.1%] (814) | 75.0% [65.0%, 83.0%] (100) | 73.5% [68.7%, 78.6%] (294) | 59.4% [52.8%, 65.1%] (212) | 59.8% [54.6%, 64.9%] (194) |

### 3.3 Recall on altered sentences by type

| judge | number (n) | polarity (n) | entity (n) | attribution (n) | unit (n) |
|---|---|---|---|---|---|
| Jev 1.13.0, framed, 20 passages | 96.8% [94.8%, 98.3%] (814) | 90.0% [80.0%, 98.0%] (100) | 81.6% [75.5%, 87.8%] (294) | 66.0% [57.5%, 74.5%] (212) | 36.1% [26.8%, 45.4%] (194) |
| Jev 1.13.0, framed, top-3 | 83.8% [79.9%, 87.2%] (814) | 84.0% [74.0%, 92.0%] (100) | 69.4% [62.6%, 76.9%] (294) | 59.4% [50.9%, 67.9%] (212) | 24.7% [16.5%, 33.0%] (194) |
| GPT-6 Luna Decisions, framed, 20 passages | 83.0% [79.4%, 86.5%] (814) | 76.0% [64.0%, 88.0%] (100) | 76.2% [69.4%, 83.7%] (294) | 73.6% [65.1%, 82.1%] (212) | 61.9% [52.6%, 71.1%] (194) |
| GPT-6 Luna Decisions, framed, top-3 | 69.8% [65.4%, 74.2%] (814) | 86.0% [76.0%, 94.0%] (100) | 61.2% [53.7%, 68.7%] (294) | 64.2% [54.7%, 72.6%] (212) | 49.5% [39.2%, 59.8%] (194) |
| GPT-6 Luna chat, framed, top-3 | 81.6% [77.9%, 85.5%] (814) | 88.0% [78.0%, 96.0%] (100) | 78.9% [72.1%, 85.0%] (294) | 70.8% [61.3%, 79.2%] (212) | 58.8% [48.5%, 69.1%] (194) |
| DeepSeek V4 Pro chat, framed, top-3 | 83.4% [79.8%, 87.3%] (796) | 86.2% [72.4%, 96.6%] (56) | 87.7% [80.2%, 93.9%] (159) | 80.0% [69.1%, 90.7%] (112) | 52.1% [36.7%, 65.3%] (98) |
| Claude Sonnet 5.5 chat, framed, top-3 | 79.5% [73.0%, 84.5%] (400) | 92.0% [84.0%, 98.0%] (100) | 76.0% [64.0%, 88.0%] (100) | 82.0% [72.0%, 92.0%] (100) | 32.0% [20.0%, 44.0%] (100) |
| HHEM-2.1-Open, top-3 | 94.3% [92.1%, 96.6%] (814) | 40.0% [28.0%, 54.0%] (100) | 96.6% [93.2%, 99.3%] (294) | 82.1% [74.5%, 89.6%] (212) | 50.5% [40.2%, 60.8%] (194) |
| Jev 1.13.0, framed, top-3, threshold 0.60 | 81.1% [77.1%, 84.5%] (814) | 82.0% [72.0%, 92.0%] (100) | 63.9% [56.5%, 71.4%] (294) | 50.0% [40.6%, 59.4%] (212) | 21.6% [14.4%, 29.9%] (194) |
| GPT-6 Luna Decisions, framed, top-3, threshold 0.84 | 58.7% [54.3%, 63.4%] (814) | 74.0% [62.0%, 86.0%] (100) | 53.1% [44.9%, 61.9%] (294) | 48.1% [38.7%, 57.5%] (212) | 35.1% [25.8%, 44.3%] (194) |
| HHEM-2.1-Open, top-3, threshold 0.68 | 88.0% [85.0%, 91.2%] (814) | 30.0% [18.0%, 42.0%] (100) | 92.5% [87.8%, 96.6%] (294) | 76.4% [67.9%, 84.0%] (212) | 45.4% [35.1%, 54.6%] (194) |
| Jev 1.13.0, framed, 20 passages, threshold 0.56 | 96.6% [94.6%, 98.3%] (814) | 90.0% [80.0%, 98.0%] (100) | 74.1% [67.3%, 81.0%] (294) | 61.3% [52.8%, 70.8%] (212) | 28.9% [20.6%, 38.1%] (194) |
| GPT-6 Luna Decisions, framed, 20 passages, threshold 0.78 | 74.7% [70.3%, 78.9%] (814) | 72.0% [60.0%, 84.0%] (100) | 70.1% [62.6%, 77.6%] (294) | 46.2% [36.8%, 55.7%] (212) | 45.4% [36.1%, 54.6%] (194) |

### 3.4 False alarms on unchanged sentences by type

| judge | number (n) | polarity (n) | entity (n) | attribution (n) | unit (n) |
|---|---|---|---|---|---|
| Jev 1.13.0, framed, 20 passages | 9.1% [6.4%, 11.8%] (814) | 12.0% [4.0%, 22.0%] (100) | 10.2% [5.4%, 15.6%] (294) | 10.4% [4.7%, 16.0%] (212) | 13.4% [7.2%, 20.6%] (194) |
| Jev 1.13.0, framed, top-3 | 11.5% [8.6%, 14.7%] (814) | 16.0% [6.0%, 26.0%] (100) | 18.4% [12.2%, 25.2%] (294) | 16.0% [9.4%, 23.6%] (212) | 18.6% [11.3%, 25.8%] (194) |
| GPT-6 Luna Decisions, framed, 20 passages | 36.9% [32.4%, 41.8%] (814) | 32.0% [20.0%, 46.0%] (100) | 38.8% [31.3%, 46.9%] (294) | 40.6% [31.1%, 50.0%] (212) | 35.1% [25.8%, 44.3%] (194) |
| GPT-6 Luna Decisions, framed, top-3 | 32.2% [27.3%, 36.6%] (814) | 36.0% [24.0%, 50.0%] (100) | 35.4% [27.9%, 42.9%] (294) | 32.1% [23.6%, 40.6%] (212) | 38.1% [29.9%, 47.4%] (194) |
| GPT-6 Luna chat, framed, top-3 | 17.4% [13.8%, 21.1%] (814) | 18.0% [8.0%, 30.0%] (100) | 21.8% [15.6%, 28.6%] (294) | 21.7% [14.2%, 29.2%] (212) | 20.6% [13.4%, 28.9%] (194) |
| DeepSeek V4 Pro chat, framed, top-3 | 17.0% [13.6%, 20.5%] (796) | 22.2% [7.4%, 39.3%] (56) | 21.8% [12.0%, 31.2%] (159) | 14.0% [5.3%, 22.8%] (112) | 32.0% [18.4%, 45.1%] (98) |
| Claude Sonnet 5.5 chat, framed, top-3 | 10.5% [6.5%, 15.0%] (400) | 34.0% [22.0%, 46.0%] (100) | 22.0% [12.0%, 34.0%] (100) | 16.0% [6.0%, 26.0%] (100) | 20.0% [10.0%, 30.0%] (100) |
| HHEM-2.1-Open, top-3 | 51.1% [45.9%, 55.8%] (814) | 36.0% [24.0%, 48.0%] (100) | 55.1% [46.9%, 63.3%] (294) | 58.5% [49.1%, 67.9%] (212) | 47.4% [37.1%, 57.7%] (194) |
| Jev 1.13.0, framed, top-3, threshold 0.60 | 7.6% [5.2%, 10.3%] (814) | 12.0% [4.0%, 22.0%] (100) | 11.6% [6.8%, 17.0%] (294) | 9.4% [4.7%, 15.1%] (212) | 12.4% [7.2%, 18.6%] (194) |
| GPT-6 Luna Decisions, framed, top-3, threshold 0.84 | 17.2% [13.5%, 20.9%] (814) | 16.0% [6.0%, 26.0%] (100) | 17.0% [11.6%, 23.1%] (294) | 12.3% [6.6%, 18.9%] (212) | 19.6% [12.4%, 27.8%] (194) |
| HHEM-2.1-Open, top-3, threshold 0.68 | 41.0% [36.4%, 45.7%] (814) | 30.0% [18.0%, 42.0%] (100) | 45.6% [37.4%, 53.7%] (294) | 47.2% [37.7%, 56.6%] (212) | 38.1% [28.9%, 48.5%] (194) |
| Jev 1.13.0, framed, 20 passages, threshold 0.56 | 6.6% [4.4%, 9.1%] (814) | 6.0% [0.0%, 14.0%] (100) | 8.2% [4.1%, 12.9%] (294) | 9.4% [4.7%, 15.1%] (212) | 11.3% [5.2%, 17.5%] (194) |
| GPT-6 Luna Decisions, framed, 20 passages, threshold 0.78 | 25.1% [20.9%, 29.2%] (814) | 22.0% [12.0%, 34.0%] (100) | 23.1% [15.6%, 30.6%] (294) | 27.4% [18.9%, 36.8%] (212) | 25.8% [17.5%, 35.1%] (194) |

### 3.5 AUROC by type (scored judges)

| judge | number | polarity | entity | attribution | unit |
|---|---|---|---|---|---|
| Jev 1.13.0, framed, 20 passages | 0.980 [0.970, 0.987] | 0.953 [0.910, 0.989] | 0.909 [0.875, 0.939] | 0.876 [0.835, 0.916] | 0.608 [0.565, 0.655] |
| Jev 1.13.0, framed, top-3 | 0.937 [0.922, 0.952] | 0.938 [0.895, 0.976] | 0.850 [0.809, 0.890] | 0.828 [0.788, 0.867] | 0.575 [0.534, 0.620] |
| GPT-6 Luna Decisions, framed, 20 passages | 0.811 [0.778, 0.842] | 0.858 [0.771, 0.928] | 0.776 [0.723, 0.829] | 0.711 [0.638, 0.774] | 0.642 [0.577, 0.707] |
| GPT-6 Luna Decisions, framed, top-3 | 0.747 [0.714, 0.781] | 0.837 [0.757, 0.919] | 0.705 [0.645, 0.763] | 0.736 [0.678, 0.789] | 0.601 [0.532, 0.669] |
| HHEM-2.1-Open, top-3 | 0.784 [0.759, 0.809] | 0.523 [0.482, 0.573] | 0.808 [0.768, 0.848] | 0.689 [0.641, 0.742] | 0.539 [0.499, 0.581] |

## 4. H3: error type

Prediction: Jev's recall drops by at least 15 points from numbers to the mean of the other types; GPT-6 Luna's by less than 10.

| judge | recall on numbers | mean recall on other types | drop |
|---|---|---|---|
| Jev 1.13.0, framed, 20 passages | 96.8% | 68.4% | 28.4 pt |
| Jev 1.13.0, framed, top-3 | 83.8% | 59.4% | 24.4 pt |
| GPT-6 Luna Decisions, framed, 20 passages | 83.0% | 71.9% | 11.1 pt |
| GPT-6 Luna Decisions, framed, top-3 | 69.8% | 65.2% | 4.6 pt |
| GPT-6 Luna chat, framed, top-3 | 81.6% | 74.1% | 7.5 pt |
| DeepSeek V4 Pro chat, framed, top-3 | 83.4% | 76.5% | 6.9 pt |
| Claude Sonnet 5.5 chat, framed, top-3 | 79.5% | 70.5% | 9.0 pt |
| HHEM-2.1-Open, top-3 | 94.3% | 67.3% | 27.1 pt |

Verdict (top-3 condition): Jev drop 24.4 pt (predicted >= 15), Luna Decisions drop 4.6 pt (predicted < 10): supported.

## 5. Error correlation between judges

For each pair of judges, on the items both answered: the 2x2 table of error indicators (both wrong / A only / B only / both right), phi, Cohen's kappa, P(B wrong | A wrong) against P(B wrong), and the lift.

### 5.1 Top-3 condition

| pair | n | both / A only / B only / neither wrong | phi | kappa | P(B wrong | A wrong) vs P(B wrong) | lift |
|---|---|---|---|---|---|---|
| Jev 1.13.0, framed, top-3 x GPT-6 Luna Decisions, framed, top-3 | 1614 | 247 / 105 / 299 / 963 | 0.406 [0.357, 0.458] | 0.388 [0.339, 0.440] | 70.2% [65.3%, 75.1%] vs 33.8% | 2.074 |
| Jev 1.13.0, framed, top-3 x GPT-6 Luna chat, framed, top-3 | 1614 | 207 / 145 / 131 / 1131 | 0.491 [0.439, 0.543] | 0.491 [0.439, 0.543] | 58.8% [53.8%, 63.9%] vs 20.9% | 2.808 |
| Jev 1.13.0, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | 1221 | 142 / 89 / 87 / 903 | 0.529 [0.461, 0.591] | 0.529 [0.461, 0.591] | 61.5% [55.3%, 67.8%] vs 18.8% | 3.278 |
| Jev 1.13.0, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 800 | 117 / 62 / 50 / 571 | 0.588 [0.512, 0.656] | 0.587 [0.511, 0.656] | 65.4% [58.6%, 72.5%] vs 20.9% | 3.131 |
| Jev 1.13.0, framed, top-3 x HHEM-2.1-Open, top-3 | 1614 | 124 / 228 / 416 / 846 | 0.020 [-0.034, 0.071] | 0.019 [-0.032, 0.069] | 35.2% [30.4%, 39.9%] vs 33.5% | 1.053 |
| GPT-6 Luna Decisions, framed, top-3 x GPT-6 Luna chat, framed, top-3 | 1614 | 232 / 314 / 106 / 962 | 0.379 [0.325, 0.432] | 0.359 [0.307, 0.412] | 42.5% [38.4%, 46.8%] vs 20.9% | 2.029 |
| GPT-6 Luna Decisions, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | 1221 | 158 / 238 / 71 / 754 | 0.375 [0.313, 0.440] | 0.351 [0.290, 0.416] | 39.9% [34.7%, 45.1%] vs 18.8% | 2.127 |
| GPT-6 Luna Decisions, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 800 | 114 / 155 / 53 / 478 | 0.377 [0.300, 0.452] | 0.357 [0.284, 0.433] | 42.4% [36.3%, 48.8%] vs 20.9% | 2.030 |
| GPT-6 Luna Decisions, framed, top-3 x HHEM-2.1-Open, top-3 | 1614 | 159 / 387 / 381 / 687 | -0.066 [-0.114, -0.020] | -0.066 [-0.114, -0.020] | 29.1% [25.6%, 32.7%] vs 33.5% | 0.870 |
| GPT-6 Luna chat, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | 1221 | 180 / 53 / 49 / 939 | 0.728 [0.677, 0.776] | 0.728 [0.677, 0.775] | 77.3% [72.1%, 81.9%] vs 18.8% | 4.119 |
| GPT-6 Luna chat, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 800 | 124 / 45 / 43 / 588 | 0.668 [0.602, 0.731] | 0.668 [0.601, 0.731] | 73.4% [67.0%, 80.1%] vs 20.9% | 3.515 |
| GPT-6 Luna chat, framed, top-3 x HHEM-2.1-Open, top-3 | 1614 | 119 / 219 / 421 / 855 | 0.019 [-0.033, 0.069] | 0.018 [-0.031, 0.065] | 35.2% [30.0%, 39.7%] vs 33.5% | 1.052 |
| DeepSeek V4 Pro chat, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 612 | 93 / 25 / 22 / 472 | 0.751 [0.679, 0.815] | 0.751 [0.679, 0.815] | 78.8% [71.2%, 86.0%] vs 18.8% | 4.194 |
| DeepSeek V4 Pro chat, framed, top-3 x HHEM-2.1-Open, top-3 | 1221 | 78 / 151 / 308 / 684 | 0.025 [-0.033, 0.086] | 0.024 [-0.031, 0.081] | 34.1% [28.2%, 40.3%] vs 31.6% | 1.077 |
| Claude Sonnet 5.5 chat, framed, top-3 x HHEM-2.1-Open, top-3 | 800 | 62 / 105 / 209 / 424 | 0.035 [-0.041, 0.116] | 0.033 [-0.038, 0.109] | 37.1% [29.9%, 44.2%] vs 33.9% | 1.096 |

### 5.2 Twenty-passage condition

| pair | n | both / A only / B only / neither wrong | phi | kappa | P(B wrong | A wrong) vs P(B wrong) | lift |
|---|---|---|---|---|---|---|
| Jev 1.13.0, framed, 20 passages x GPT-6 Luna Decisions, framed, 20 passages | 1614 | 140 / 85 / 341 / 1048 | 0.285 [0.230, 0.335] | 0.255 [0.203, 0.302] | 62.2% [55.7%, 68.5%] vs 29.8% | 2.088 |

### 5.3 H2: kind of judge

Prediction: two LLMs (highest) > decision model with LLM > two decision models of different makers, with non-overlapping intervals between the extremes.

| category | pairs | mean phi | phi range |
|---|---|---|---|
| LLM x LLM | luna-chat x deepseek-pro, luna-chat x claude, deepseek-pro x claude | 0.716 | 0.668 to 0.751 |
| decision x LLM | jev-3 x luna-chat, jev-3 x deepseek-pro, jev-3 x claude, luna-dec-3 x luna-chat, luna-dec-3 x deepseek-pro, luna-dec-3 x claude | 0.456 | 0.375 to 0.588 |
| decision x decision | jev-3 x luna-dec-3 | 0.406 | 0.406 to 0.406 |
| with NLI classifier | jev-3 x hhem, luna-dec-3 x hhem, luna-chat x hhem, deepseek-pro x hhem, claude x hhem | 0.007 | -0.066 to 0.035 |

Verdict: mean phi LLM x LLM 0.716, decision x LLM 0.456, decision x decision 0.406: **supported**.

### 5.4 Effective independent votes

k judges whose errors correlate with mean phi rho are worth k / (1 + (k - 1) rho) independent votes, computed on the items every judge of the set answered.

| set | k | items | mean phi | effective votes |
|---|---|---|---|---|
| Jev + Luna Decisions (top-3) | 2 | 1614 | 0.406 | 1.42 |
| Jev + Luna Decisions + Luna chat + DeepSeek Pro | 4 | 1221 | 0.484 | 1.63 |
| Luna chat + DeepSeek Pro | 2 | 1221 | 0.728 | 1.16 |
| Luna chat + DeepSeek Pro + Claude | 3 | 612 | 0.738 | 1.21 |
| Jev + Luna Decisions + Luna chat + DeepSeek Pro + Claude | 5 | 612 | 0.538 | 1.59 |
| all six, top-3 | 6 | 612 | 0.362 | 2.13 |

## 6. H4: difficulty strata

Items are split by whether a third judge was right (DeepSeek V4 Pro; Claude for pairs involving Pro, Luna chat when Claude has no items in the split). Prediction: Jev-LLM error correlation stays below LLM-LLM correlation within each stratum.

| pair | third judge | phi where third judge right | phi where third judge wrong |
|---|---|---|---|
| Jev 1.13.0, framed, top-3 x GPT-6 Luna Decisions, framed, top-3 | DeepSeek V4 Pro chat, framed, top-3 | 0.212 [0.137, 0.285] (n 992) | 0.370 [0.252, 0.495] (n 229) |
| Jev 1.13.0, framed, top-3 x GPT-6 Luna chat, framed, top-3 | DeepSeek V4 Pro chat, framed, top-3 | 0.223 [0.118, 0.327] (n 992) | 0.184 [0.046, 0.317] (n 229) |
| Jev 1.13.0, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | Claude Sonnet 5.5 chat, framed, top-3 | 0.129 [0.005, 0.256] (n 497) | 0.244 [0.046, 0.450] (n 115) |
| Jev 1.13.0, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | DeepSeek V4 Pro chat, framed, top-3 | 0.269 [0.110, 0.414] (n 494) | 0.426 [0.238, 0.586] (n 118) |
| GPT-6 Luna Decisions, framed, top-3 x GPT-6 Luna chat, framed, top-3 | DeepSeek V4 Pro chat, framed, top-3 | 0.108 [0.038, 0.182] (n 992) | 0.249 [0.106, 0.387] (n 229) |
| GPT-6 Luna Decisions, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | Claude Sonnet 5.5 chat, framed, top-3 | 0.064 [-0.029, 0.161] (n 497) | 0.339 [0.146, 0.519] (n 115) |
| GPT-6 Luna Decisions, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | DeepSeek V4 Pro chat, framed, top-3 | 0.062 [-0.025, 0.163] (n 494) | 0.353 [0.161, 0.526] (n 118) |
| GPT-6 Luna chat, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | Claude Sonnet 5.5 chat, framed, top-3 | 0.427 [0.253, 0.591] (n 497) | 0.636 [0.437, 0.810] (n 115) |
| GPT-6 Luna chat, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | DeepSeek V4 Pro chat, framed, top-3 | 0.179 [0.018, 0.353] (n 494) | 0.409 [0.200, 0.596] (n 118) |

## 6b. Exploratory (not pre-registered): is the fact passage among the three the judges read?

For each pair, whether one of the three passages selected for the altered sentence contains the pair's original token. Recall on altered sentences, false alarms and error correlation are split by this. The top-3 judges and HHEM read exactly these three passages; the twenty-passage judges are shown for contrast.

Share of test pairs whose altered sentence has its fact passage among the three: 77.3%.

| judge | recall, fact passage present (items) | recall, absent (items) | false alarm, present | false alarm, absent |
|---|---|---|---|---|
| Jev 1.13.0, framed, top-3 | 80.0% [76.9%, 83.2%] (1248) | 39.9% [32.8%, 47.0%] (366) | 12.5% [10.1%, 15.2%] | 21.3% [15.8%, 26.8%] |
| GPT-6 Luna Decisions, framed, top-3 | 74.2% [70.7%, 77.6%] (1248) | 38.3% [31.1%, 45.4%] (366) | 34.8% [31.1%, 38.5%] | 30.1% [23.5%, 36.6%] |
| GPT-6 Luna chat, framed, top-3 | 88.1% [85.4%, 90.5%] (1248) | 40.4% [33.3%, 47.5%] (366) | 17.6% [14.7%, 20.5%] | 24.6% [19.1%, 31.1%] |
| DeepSeek V4 Pro chat, framed, top-3 | 91.5% [89.0%, 94.2%] (954) | 44.4% [36.1%, 52.3%] (267) | 19.1% [15.6%, 22.8%] | 17.9% [11.8%, 24.4%] |
| Claude Sonnet 5.5 chat, framed, top-3 | 86.1% [82.2%, 89.8%] (606) | 40.2% [30.9%, 50.5%] (194) | 17.2% [13.2%, 21.1%] | 15.5% [9.3%, 23.7%] |
| HHEM-2.1-Open, top-3 | 83.3% [80.6%, 86.4%] (1248) | 88.5% [84.2%, 92.9%] (366) | 46.3% [42.5%, 50.5%] | 68.9% [62.3%, 75.4%] |
| Jev 1.13.0, framed, 20 passages | 83.7% [80.6%, 86.5%] (1248) | 77.6% [71.6%, 83.6%] (366) | 8.7% [6.4%, 11.1%] | 15.3% [10.4%, 20.8%] |
| GPT-6 Luna Decisions, framed, 20 passages | 78.4% [75.2%, 81.4%] (1248) | 74.9% [68.3%, 80.9%] (366) | 36.7% [32.9%, 40.9%] | 38.8% [31.7%, 45.9%] |

| pair | phi, fact passage present | phi, absent |
|---|---|---|
| Jev 1.13.0, framed, top-3 x GPT-6 Luna Decisions, framed, top-3 | 0.343 [0.282, 0.402] (n 1248) | 0.498 [0.403, 0.595] (n 366) |
| Jev 1.13.0, framed, top-3 x GPT-6 Luna chat, framed, top-3 | 0.417 [0.347, 0.484] (n 1248) | 0.522 [0.427, 0.616] (n 366) |
| Jev 1.13.0, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | 0.439 [0.342, 0.517] (n 954) | 0.601 [0.489, 0.701] (n 267) |
| Jev 1.13.0, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 0.518 [0.416, 0.616] (n 606) | 0.643 [0.510, 0.756] (n 194) |
| Jev 1.13.0, framed, top-3 x HHEM-2.1-Open, top-3 | 0.099 [0.039, 0.164] (n 1248) | -0.236 [-0.346, -0.131] (n 366) |
| GPT-6 Luna Decisions, framed, top-3 x GPT-6 Luna chat, framed, top-3 | 0.331 [0.269, 0.392] (n 1248) | 0.425 [0.318, 0.529] (n 366) |
| GPT-6 Luna Decisions, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | 0.300 [0.226, 0.370] (n 954) | 0.496 [0.382, 0.608] (n 267) |
| GPT-6 Luna Decisions, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 0.304 [0.217, 0.401] (n 606) | 0.464 [0.334, 0.594] (n 194) |
| GPT-6 Luna Decisions, framed, top-3 x HHEM-2.1-Open, top-3 | -0.000 [-0.055, 0.056] (n 1248) | -0.307 [-0.413, -0.210] (n 366) |
| GPT-6 Luna chat, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | 0.695 [0.623, 0.767] (n 954) | 0.732 [0.637, 0.817] (n 267) |
| GPT-6 Luna chat, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 0.606 [0.512, 0.692] (n 606) | 0.708 [0.597, 0.811] (n 194) |
| GPT-6 Luna chat, framed, top-3 x HHEM-2.1-Open, top-3 | 0.098 [0.039, 0.155] (n 1248) | -0.235 [-0.331, -0.127] (n 366) |
| DeepSeek V4 Pro chat, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 0.632 [0.513, 0.739] (n 472) | 0.909 [0.832, 0.971] (n 140) |
| DeepSeek V4 Pro chat, framed, top-3 x HHEM-2.1-Open, top-3 | 0.117 [0.045, 0.188] (n 954) | -0.268 [-0.389, -0.145] (n 267) |
| Claude Sonnet 5.5 chat, framed, top-3 x HHEM-2.1-Open, top-3 | 0.188 [0.103, 0.277] (n 606) | -0.362 [-0.492, -0.216] (n 194) |

## 7. H5: the framing effect replicates for a second decision model

AUROC on numeric items of the loose relation question (the arena's wording, a choice over supports / contradicts / says nothing) against the framed criterion, same input text, GPT-6 Luna Decisions; Jev from the pilot for reference. Prediction: a gain of at least 0.05 for Luna Decisions.

| judge | AUROC, relation question | AUROC, framed criterion | gain |
|---|---|---|---|
| GPT-6 Luna Decisions, 20 passages | 0.935 [0.919, 0.949] | 0.811 [0.778, 0.842] | -0.124 |
| GPT-6 Luna Decisions, top-3 | 0.871 [0.850, 0.894] | 0.747 [0.714, 0.781] | -0.125 |
| Jev, 20 passages (pilot) | 0.777 [0.753, 0.801] | 0.980 [0.970, 0.987] | 0.203 |

Verdict: not supported.

## 8. Coverage at guaranteed risk

Accept an item when the judge's probability is at or above a high threshold (predict contradicted) or at or below a low one (predict not), thresholds chosen on the training motions as the widest region whose one-sided Clopper-Pearson 95 percent upper bound on the error is at most 5 percent; coverage and realised error on the held-out. Pairs: accept when both judges agree.

| judge | low / high threshold | train coverage | coverage | accepted | error among accepted | 95% upper bound |
|---|---|---|---|---|---|---|
| Jev 1.13.0, framed, 20 passages | 0.16 / 0.88 | 29.0% | 44.2% | 713 | 5.0% | 6.6% |
| Jev 1.13.0, framed, top-3 | 0.10 / 0.92 | 21.0% | 25.9% | 418 | 3.8% | 5.8% |
| GPT-6 Luna Decisions, framed, 20 passages | - | none at 5% | - | - | - | - |
| GPT-6 Luna Decisions, framed, top-3 | - | none at 5% | - | - | - | - |
| HHEM-2.1-Open, top-3 | - | none at 5% | - | - | - | - |

| pair, agreement rule | coverage | accepted | error among accepted | 95% upper bound |
|---|---|---|---|---|
| Jev 1.13.0, framed, top-3 x GPT-6 Luna Decisions, framed, top-3 | 75.0% | 1210 | 20.4% | 22.4% |
| Jev 1.13.0, framed, top-3 x GPT-6 Luna chat, framed, top-3 | 82.9% | 1338 | 15.5% | 17.2% |
| Jev 1.13.0, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | 85.6% | 1045 | 13.6% | 15.5% |
| Jev 1.13.0, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 86.0% | 688 | 17.0% | 19.5% |
| Jev 1.13.0, framed, top-3 x HHEM-2.1-Open, top-3 | 60.1% | 970 | 12.8% | 14.7% |
| GPT-6 Luna Decisions, framed, top-3 x GPT-6 Luna chat, framed, top-3 | 74.0% | 1194 | 19.4% | 21.4% |
| GPT-6 Luna Decisions, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | 74.7% | 912 | 17.3% | 19.5% |
| GPT-6 Luna Decisions, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 74.0% | 592 | 19.3% | 22.1% |
| GPT-6 Luna Decisions, framed, top-3 x HHEM-2.1-Open, top-3 | 52.4% | 846 | 18.8% | 21.1% |
| GPT-6 Luna chat, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | 91.6% | 1119 | 16.1% | 18.0% |
| GPT-6 Luna chat, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 89.0% | 712 | 17.4% | 19.9% |
| GPT-6 Luna chat, framed, top-3 x HHEM-2.1-Open, top-3 | 60.3% | 974 | 12.2% | 14.1% |
| DeepSeek V4 Pro chat, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 92.3% | 565 | 16.5% | 19.2% |
| DeepSeek V4 Pro chat, framed, top-3 x HHEM-2.1-Open, top-3 | 62.4% | 762 | 10.2% | 12.2% |
| Claude Sonnet 5.5 chat, framed, top-3 x HHEM-2.1-Open, top-3 | 60.8% | 486 | 12.8% | 15.5% |

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
| Jev (noul_framed) x GPT-6 Luna Decisions | 0.406 [0.357, 0.458] | 0.626 [0.521, 0.731] | yes | yes |
| Jev (noul_framed) x GPT-6 Luna chat | 0.491 [0.439, 0.543] | 0.526 [0.431, 0.616] | yes | no |
| Jev (noul_framed) x Claude Sonnet 5.5 | 0.588 [0.512, 0.656] | 0.583 [0.483, 0.682] | no | no |
| GPT-6 Luna Decisions x GPT-6 Luna chat | 0.379 [0.325, 0.432] | 0.611 [0.534, 0.688] | yes | yes |
| GPT-6 Luna Decisions x Claude Sonnet 5.5 | 0.377 [0.300, 0.452] | 0.574 [0.479, 0.662] | yes | yes |
| GPT-6 Luna chat x Claude Sonnet 5.5 | 0.668 [0.602, 0.731] | 0.577 [0.502, 0.645] | no | no |

CHARM-100 verdict: DebateCheck lower in 4 of 6 pairs, disjoint in 3: **not supported**.

HealthBench-100 test:

| pair | phi on DebateCheck | phi on HealthBench-100 test | DebateCheck lower | intervals disjoint |
|---|---|---|---|---|
| Jev (noul_framed) x GPT-6 Luna Decisions | 0.406 [0.357, 0.458] | 0.201 [0.059, 0.344] | no | no |
| Jev (noul_framed) x GPT-6 Luna chat | 0.491 [0.439, 0.543] | 0.286 [0.130, 0.443] | no | no |
| GPT-6 Luna Decisions x GPT-6 Luna chat | 0.379 [0.325, 0.432] | 0.384 [0.268, 0.515] | yes | no |

HealthBench-100 test verdict: DebateCheck lower in 1 of 3 pairs, disjoint in 0: **not supported**.

## 10. Reporting checklist (Rao and Callison-Burch, 2606.00093)

- Scale: binary MET / UNMET per sentence against a construction label (altered = contradicted); decision models and HHEM give a probability decided at 0.5 or a train-fitted threshold, LLM judges a label.
- Abstention: an LLM answer without a parsable verdict is excluded and counted in coverage; coverage is reported per judge in section 2 and per panel judge in section 9.
- Positive rates: the judge's and the label's rates are in sections 3.1 and 9.
- Resampling unit: pairs on DebateCheck, conversations on the panels; 1,000 percentile bootstrap resamples, seed 1.
- Prompts and question texts: scripts/debatecheck at the fingerprints listed in the pre-registration.


# Follow-ups to Study 2 (held-out motions)

## 1. Version drift: jev-1.13.0 against jev-1.14.0 under the framed criterion

### Twenty passages

| version | n | accuracy (0.5) | recall (0.5) | false alarm (0.5) | AUROC | recall (0.7) | false alarm (0.7) |
|---|---|---|---|---|---|---|---|
| 1.13.0 | 1614 | 86.1% [84.6%, 87.6%] | 82.3% [79.7%, 84.9%] | 10.2% [8.1%, 12.3%] | 0.916 [0.904, 0.928] | 69.0% | 4.6% |
| 1.14.0 | 1614 | 84.0% [82.5%, 85.6%] | 82.8% [80.3%, 85.3%] | 14.7% [12.4%, 17.0%] | 0.907 [0.894, 0.919] | 72.0% | 5.5% |

Decision agreement between versions at 0.5: kappa 0.904 [0.882, 0.928]; mean |delta p| 0.050 over 1614 items.

| type | recall 1.13 | recall 1.14 | FA 1.13 | FA 1.14 | AUROC 1.13 | AUROC 1.14 |
|---|---|---|---|---|---|---|
| number | 96.8% | 97.3% | 9.1% | 12.5% | 0.980 | 0.974 |
| polarity | 90.0% | 90.0% | 12.0% | 12.0% | 0.953 | 0.964 |
| entity | 81.6% | 81.6% | 10.2% | 15.0% | 0.909 | 0.893 |
| attribution | 66.0% | 62.3% | 10.4% | 13.2% | 0.876 | 0.858 |
| unit | 36.1% | 42.3% | 13.4% | 26.8% | 0.608 | 0.596 |

### Top-3

| version | n | accuracy (0.5) | recall (0.5) | false alarm (0.5) | AUROC | recall (0.7) | false alarm (0.7) |
|---|---|---|---|---|---|---|---|
| 1.13.0 | 1614 | 78.2% [76.4%, 80.0%] | 70.9% [67.7%, 74.1%] | 14.5% [12.1%, 16.9%] | 0.870 [0.855, 0.885] | 61.2% | 6.6% |
| 1.14.0 | 1614 | 78.1% [76.0%, 79.9%] | 72.5% [69.1%, 75.6%] | 16.4% [13.9%, 18.8%] | 0.859 [0.842, 0.874] | 61.5% | 7.1% |

Decision agreement between versions at 0.5: kappa 0.899 [0.877, 0.922]; mean |delta p| 0.046 over 1614 items.

| type | recall 1.13 | recall 1.14 | FA 1.13 | FA 1.14 | AUROC 1.13 | AUROC 1.14 |
|---|---|---|---|---|---|---|
| number | 83.8% | 84.0% | 11.5% | 12.8% | 0.937 | 0.928 |
| polarity | 84.0% | 84.0% | 16.0% | 16.0% | 0.938 | 0.931 |
| entity | 69.4% | 72.1% | 18.4% | 20.4% | 0.850 | 0.841 |
| attribution | 59.4% | 58.5% | 16.0% | 19.8% | 0.828 | 0.797 |
| unit | 24.7% | 34.0% | 18.6% | 21.6% | 0.575 | 0.578 |

Leaderboard v2 under jev-1.14.0 (`bench/leaderboard-v2-114.json`): 90 confident strikes as under 1.13.0, same order of the six models under the confident rule (Sonnet, Opus, Sol, Flash, Pro, Luna), 918 strikes at 0.5 against 755.

## 2. Evidence gate: Jev's same-fact question as a predictor of shared LLM errors

Two-step form over the top-3 passages: the first question asks whether a passage describes the same fact as the sentence. Its probability is used as a gate, fixed at 0.5, with no fitting. Items the gate rejects are where the fact is probably not in the passages; the prediction is that the LLM judges' errors concentrate and correlate there.

Held-out items with a gate value: 1614; gate passes 74.9%. AUROC of the gate for "the passage carrying the original token is among the three" on altered sentences: 0.582.

| judge | accuracy, gate passes (n) | accuracy, gate rejects (n) | recall pass | recall reject | FA pass | FA reject |
|---|---|---|---|---|---|---|
| Jev 1.13.0, framed, top-3 | 79.6% [77.5%, 81.8%] (1209) | 74.1% [70.1%, 77.8%] (405) | 68.5% | 74.1% | 13.6% | 25.8% |
| GPT-6 Luna Decisions, framed, top-3 | 67.4% [64.9%, 70.1%] (1209) | 62.5% [57.7%, 67.1%] (405) | 69.4% | 61.5% | 33.8% | 32.3% |
| GPT-6 Luna chat, framed, top-3 | 80.7% [78.5%, 82.9%] (1209) | 74.1% [70.2%, 77.9%] (405) | 79.1% | 74.9% | 18.3% | 30.6% |
| DeepSeek V4 Pro chat, framed, top-3 | 82.4% [80.1%, 84.9%] (923) | 77.5% [73.2%, 82.0%] (298) | 82.2% | 80.2% | 17.4% | 39.0% |
| Claude Sonnet 5.5 chat, framed, top-3 | 81.1% [78.3%, 83.8%] (588) | 73.6% [68.4%, 79.3%] (212) | 76.2% | 73.4% | 15.8% | 25.6% |
| HHEM-2.1-Open, top-3 | 62.5% [60.1%, 64.8%] (1209) | 78.5% [74.8%, 82.1%] (405) | 80.6% | 89.8% | 48.7% | 83.9% |

| pair | phi, gate passes | phi, gate rejects | P(B|A) vs P(B), pass | P(B|A) vs P(B), reject |
|---|---|---|---|---|
| Jev 1.13.0, framed, top-3 x GPT-6 Luna Decisions, framed, top-3 | 0.330 [0.270, 0.393] (n 1209) | 0.600 [0.509, 0.690] (n 405) | 63.2% vs 32.6% | 86.7% vs 37.5% |
| Jev 1.13.0, framed, top-3 x GPT-6 Luna chat, framed, top-3 | 0.387 [0.317, 0.446] (n 1209) | 0.743 [0.654, 0.819] (n 405) | 49.4% vs 19.3% | 81.0% vs 25.9% |
| Jev 1.13.0, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | 0.483 [0.410, 0.556] (n 923) | 0.635 [0.505, 0.753] (n 298) | 57.9% vs 17.6% | 69.4% vs 22.5% |
| Jev 1.13.0, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 0.507 [0.410, 0.596] (n 588) | 0.760 [0.639, 0.871] (n 212) | 57.9% vs 18.9% | 81.0% vs 26.4% |
| Jev 1.13.0, framed, top-3 x HHEM-2.1-Open, top-3 | 0.078 [0.018, 0.135] (n 1209) | -0.131 [-0.217, -0.043] (n 405) | 44.9% vs 37.5% | 12.4% vs 21.5% |
| GPT-6 Luna Decisions, framed, top-3 x GPT-6 Luna chat, framed, top-3 | 0.273 [0.211, 0.333] (n 1209) | 0.647 [0.571, 0.726] (n 405) | 34.8% vs 19.3% | 62.5% vs 25.9% |
| GPT-6 Luna Decisions, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | 0.303 [0.227, 0.372] (n 923) | 0.569 [0.467, 0.665] (n 298) | 34.6% vs 17.6% | 54.2% vs 22.5% |
| GPT-6 Luna Decisions, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 0.261 [0.177, 0.346] (n 588) | 0.645 [0.527, 0.746] (n 212) | 33.7% vs 18.9% | 63.3% vs 26.4% |
| GPT-6 Luna Decisions, framed, top-3 x HHEM-2.1-Open, top-3 | -0.024 [-0.084, 0.038] (n 1209) | -0.182 [-0.266, -0.102] (n 405) | 35.8% vs 37.5% | 11.8% vs 21.5% |
| GPT-6 Luna chat, framed, top-3 x DeepSeek V4 Pro chat, framed, top-3 | 0.680 [0.612, 0.742] (n 923) | 0.844 [0.760, 0.913] (n 298) | 74.2% vs 17.6% | 83.8% vs 22.5% |
| GPT-6 Luna chat, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 0.579 [0.493, 0.669] (n 588) | 0.848 [0.766, 0.917] (n 212) | 66.7% vs 18.9% | 85.2% vs 26.4% |
| GPT-6 Luna chat, framed, top-3 x HHEM-2.1-Open, top-3 | 0.072 [0.015, 0.133] (n 1209) | -0.104 [-0.194, -0.018] (n 405) | 44.6% vs 37.5% | 14.3% vs 21.5% |
| DeepSeek V4 Pro chat, framed, top-3 x Claude Sonnet 5.5 chat, framed, top-3 | 0.673 [0.573, 0.766] (n 450) | 0.890 [0.801, 0.957] (n 162) | 70.7% vs 15.8% | 93.0% vs 27.2% |
| DeepSeek V4 Pro chat, framed, top-3 x HHEM-2.1-Open, top-3 | 0.049 [-0.014, 0.115] (n 923) | -0.017 [-0.131, 0.089] (n 298) | 40.7% vs 35.6% | 17.9% vs 19.1% |
| Claude Sonnet 5.5 chat, framed, top-3 x HHEM-2.1-Open, top-3 | 0.130 [0.045, 0.212] (n 588) | -0.189 [-0.302, -0.065] (n 212) | 49.5% vs 36.6% | 12.5% vs 26.4% |

## 3. Pairs built from sentences the debate's judge had not approved

Same construction rule as the benchmark, applied to sentences the arena had marked unverified. The altered side is contradicted by construction as before; the unchanged side is a sentence the judge had not supported, so its false-alarm rate is not comparable and is reported for completeness.

| evidence | n (unapproved) | recall, unapproved sample | recall, benchmark (numeric) | AUROC, unapproved | AUROC, benchmark | FA unapproved | FA benchmark |
|---|---|---|---|---|---|---|---|
| 20 passages | 488 | 74.2% [68.4%, 79.5%] | 96.8% [94.8%, 98.3%] | 0.785 [0.751, 0.819] | 0.980 [0.970, 0.987] | 30.3% | 9.1% |
| top-3 | 488 | 49.6% [43.0%, 55.7%] | 83.8% [79.9%, 87.2%] | 0.677 [0.638, 0.712] | 0.937 [0.922, 0.952] | 18.0% | 11.5% |


# DebateCheck: results

## Dataset

1164 contrastive pairs from 180 blind debates. Split by motion: {"pairs":1164,"split":{"test":407,"train":757},"kind":{"other":305,"percent":140,"year":719},"pack":{"congestion-pricing":199,"crewed-spaceflight":211,"four-day-week":241,"nuclear-power":186,"rent-control":196,"sugar-tax":131},"model":{"claude-opus-5.5":250,"claude-sonnet-5.5":187,"deepseek-v4-flash":231,"deepseek-v4-pro":161,"gpt-6-luna":134,"gpt-6.1-sol":201}}

## Jev under five criterion texts (1164 pairs judged)

AUROC separates altered from unchanged sentences by p(contradicts). Detection is the share of altered sentences at or above the threshold, false alarm the share of unchanged ones. Brackets are 95% bootstrap intervals over pairs.

| variant | AUROC | det ≥0.7 | FA ≥0.7 | det ≥0.5 | FA ≥0.5 | Jev tokens/pair |
|---|---|---|---|---|---|---:|
| loose20 | 0.850 [0.835–0.863] | 5.8% [4.6%–7.2%] | 1.3% [0.8%–2.1%] | 11.8% | 2.0% | 5473 |
| sharp20 | 0.920 [0.910–0.930] | 24.1% [21.8%–26.7%] | 0.8% [0.4%–1.5%] | 40.6% | 1.4% | 5507 |
| sharp3 | 0.880 [0.867–0.891] | 36.9% [34.2%–39.8%] | 2.5% [1.7%–3.6%] | 52.0% | 4.0% | 1549 |
| direct3 | 0.865 [0.852–0.877] | 58.5% [55.7%–61.3%] | 7.3% [5.9%–8.9%] | 77.0% | 19.0% | 1399 |
| twostep3 | 0.728 [0.710–0.744] | 10.1% [8.5%–11.9%] | 2.7% [2.0%–3.9%] | 43.4% | 13.3% | 1461 |
| framed20 | 0.958 [0.952–0.964] | 85.3% [83.2%–87.2%] | 7.0% [5.7%–8.7%] | 93.5% | 19.2% | 5472 |
| framed3 | 0.900 [0.889–0.911] | 72.9% [70.3%–75.4%] | 9.4% [7.8%–11.2%] | 81.0% | 19.1% | 1514 |
| ensemble4 | 0.905 [0.895–0.915] | 21.5% [19.2%–23.9%] | 0.4% [0.2%–1.0%] | 55.4% | 4.0% | - |
| ensemble5 | 0.938 [0.929–0.946] | 22.3% [20.0%–24.7%] | 0.5% [0.2%–1.1%] | 63.1% | 4.1% | - |

### By split and by kind of number (detection ≥0.7 / false alarm ≥0.7 / AUROC)

| subset | n | loose20 | sharp20 | sharp3 | direct3 | twostep3 | framed20 | framed3 | ensemble4 | ensemble5 |
|---|---:|---|---|---|---|---|---|---|---|---|
| train motions | 757 | 5.3% / 0.0% / 0.889 | 25.0% / 0.0% / 0.935 | 35.7% / 1.5% / 0.883 | 58.4% / 7.7% / 0.860 | 10.6% / 2.4% / 0.728 | 82.7% / 8.7% / 0.942 | 71.5% / 11.6% / 0.878 | 22.1% / 0.0% / 0.910 | 22.2% / 0.0% / 0.936 |
| held-out motions | 407 | 6.6% / 3.7% / 0.777 | 22.6% / 2.2% / 0.891 | 39.3% / 4.4% / 0.874 | 58.7% / 6.6% / 0.876 | 9.1% / 3.4% / 0.731 | 90.2% / 3.9% / 0.980 | 75.7% / 5.2% / 0.937 | 20.4% / 1.2% / 0.896 | 22.4% / 1.5% / 0.940 |
| year | 719 | 7.5% / 1.8% / 0.843 | 26.7% / 1.1% / 0.915 | 38.4% / 2.9% / 0.896 | 61.3% / 7.5% / 0.887 | 15.2% / 2.6% / 0.793 | 88.7% / 7.6% / 0.968 | 81.1% / 9.2% / 0.929 | 26.4% / 0.7% / 0.919 | 26.7% / 0.8% / 0.949 |
| percent | 140 | 1.4% / 0.7% / 0.900 | 25.0% / 0.0% / 0.966 | 33.6% / 2.1% / 0.829 | 61.4% / 12.1% / 0.800 | 2.9% / 5.7% / 0.543 | 85.0% / 7.1% / 0.952 | 62.1% / 17.1% / 0.803 | 13.6% / 0.0% / 0.877 | 13.6% / 0.0% / 0.920 |
| other | 305 | 3.6% / 0.3% / 0.841 | 17.7% / 0.3% / 0.910 | 35.1% / 1.6% / 0.863 | 50.5% / 4.6% / 0.847 | 1.3% / 1.6% / 0.676 | 77.4% / 5.6% / 0.941 | 58.7% / 6.2% / 0.875 | 13.4% / 0.0% / 0.889 | 15.7% / 0.0% / 0.925 |

### By debater (sharp3: detection ≥0.7 of altered sentences, false alarms on its own unchanged sentences)

| model | pairs | loose20 det | sharp3 det | sharp3 FA | sharp3 AUROC | twostep3 det | twostep3 FA |
|---|---:|---:|---:|---:|---:|---:|---:|
| claude-opus-5.5 | 250 | 9.2% | 45.6% | 1.6% | 0.898 | 10.0% | 0.8% |
| claude-sonnet-5.5 | 187 | 3.2% | 32.1% | 2.1% | 0.879 | 12.3% | 3.7% |
| deepseek-v4-flash | 231 | 3.9% | 28.6% | 4.3% | 0.811 | 9.5% | 4.3% |
| deepseek-v4-pro | 161 | 2.5% | 31.7% | 4.3% | 0.839 | 10.6% | 5.0% |
| gpt-6-luna | 134 | 6.0% | 34.3% | 1.5% | 0.892 | 7.5% | 3.7% |
| gpt-6.1-sol | 201 | 8.5% | 46.3% | 1.0% | 0.944 | 10.0% | 0.0% |

### Threshold fitted on the training motions, applied to the held-out motions (offset correction)

Mean p(contradicts) on altered and unchanged sentences shows where each wording puts the scale; the fitted threshold is the one that maximises detection minus false alarm on the training motions.

| variant | mean p altered (train) | mean p unchanged (train) | fitted threshold | held-out det | held-out FA | held-out Youden | held-out det at 0.7 | held-out FA at 0.7 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| loose20 | 0.218 | 0.025 | 0.04 | 79.9% | 36.4% | 0.435 | 6.6% | 3.7% |
| sharp20 | 0.437 | 0.050 | 0.10 | 87.5% | 24.3% | 0.631 | 22.6% | 2.2% |
| sharp3 | 0.493 | 0.089 | 0.20 | 77.6% | 17.4% | 0.602 | 39.3% | 4.4% |
| direct3 | 0.688 | 0.324 | 0.52 | 73.5% | 14.5% | 0.590 | 58.7% | 6.6% |
| twostep3 | 0.442 | 0.278 | 0.34 | 65.6% | 27.0% | 0.386 | 9.1% | 3.4% |
| framed20 | 0.818 | 0.351 | 0.68 | 91.6% | 4.2% | 0.875 | 90.2% | 3.9% |
| framed3 | 0.742 | 0.316 | 0.64 | 79.4% | 6.4% | 0.730 | 75.7% | 5.2% |
| ensemble4 | 0.515 | 0.185 | 0.32 | 80.3% | 17.0% | 0.634 | 20.4% | 1.2% |
| ensemble5 | 0.548 | 0.205 | 0.36 | 86.2% | 11.3% | 0.749 | 22.4% | 1.5% |

Test-retest of the debate's own question on unchanged sentences: mean |Δp(contradicts)| 0.035, verdict flips at 0.7: 15 of 1164.

## Judges as binary contradiction detectors (the agreement protocol: two items per pair, label = altered)

Scale: binary (flagged as contradicts or not). Abstention: an LLM answer that did not parse or that returned no relation is excluded and counted in coverage; Jev never abstains. Resampling unit: the pair. Both positive rates are shown next to κ, as the agreement paper asks.

| judge | items | coverage | judge positive rate | label positive rate | accuracy | φ | κ [95% CI] | precision | recall | F1 | TP / FP / FN / TN |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|
| Jev loose20 ≥0.7 | 2328 | 100.0% | 3.5% | 50.0% | 52.2% | 0.121 | 0.045 [0.033–0.058] | 81.7% | 5.8% | 10.8% | 67 / 15 / 1097 / 1149 |
| Jev sharp20 ≥0.7 | 2328 | 100.0% | 12.5% | 50.0% | 61.7% | 0.354 | 0.234 [0.208–0.257] | 96.9% | 24.1% | 38.7% | 281 / 9 / 883 / 1155 |
| Jev sharp3 ≥0.7 | 2328 | 100.0% | 19.7% | 50.0% | 67.2% | 0.433 | 0.345 [0.318–0.373] | 93.7% | 36.9% | 53.0% | 430 / 29 / 734 / 1135 |
| Jev sharp3 ≥0.5 | 2328 | 100.0% | 28.0% | 50.0% | 74.0% | 0.534 | 0.479 [0.451–0.508] | 92.8% | 52.0% | 66.6% | 605 / 47 / 559 / 1117 |
| Jev direct3 ≥0.7 | 2328 | 100.0% | 32.9% | 50.0% | 75.6% | 0.545 | 0.512 [0.484–0.541] | 88.9% | 58.5% | 70.6% | 681 / 85 / 483 / 1079 |
| Jev twostep3 ≥0.7 | 2328 | 100.0% | 6.4% | 50.0% | 53.7% | 0.149 | 0.073 [0.055–0.092] | 78.5% | 10.1% | 17.8% | 117 / 32 / 1047 / 1132 |
| Jev framed20 ≥0.5 | 2328 | 100.0% | 56.3% | 50.0% | 87.2% | 0.749 | 0.743 [0.716–0.768] | 83.0% | 93.5% | 87.9% | 1088 / 223 / 76 / 941 |
| Jev framed3 ≥0.5 | 2328 | 100.0% | 50.0% | 50.0% | 81.0% | 0.619 | 0.619 [0.590–0.649] | 80.9% | 81.0% | 81.0% | 943 / 222 / 221 / 942 |
| Jev ensemble4 ≥0.5 | 2328 | 100.0% | 29.7% | 50.0% | 75.7% | 0.562 | 0.514 [0.487–0.542] | 93.2% | 55.4% | 69.5% | 645 / 47 / 519 / 1117 |
| LLM deepseek-v4-flash | 2080 | 89.3% | 46.3% | 52.0% | 83.5% | 0.675 | 0.670 [0.641–0.700] | 88.3% | 78.7% | 83.2% | 851 / 113 / 231 / 885 |
| LLM gpt-6-luna | 2328 | 100.0% | 41.0% | 50.0% | 82.0% | 0.650 | 0.639 [0.609–0.668] | 89.0% | 72.9% | 80.2% | 849 / 105 / 315 / 1059 |

deepseek-v4-flash: labels on unchanged {"contradicts":113,"supports":790,"unparsed":166,"says_nothing":95}, on altered {"contradicts":851,"says_nothing":155,"supports":76,"unparsed":82}; is_claim=false on 3 unchanged and 2 altered of 1164.

gpt-6-luna: labels on unchanged {"contradicts":105,"supports":872,"says_nothing":187}, on altered {"contradicts":849,"supports":145,"says_nothing":170}; is_claim=false on 3 unchanged and 4 altered of 1164.

## Correlated errors on the same items

Error = wrong binary decision on an item (altered flagged as not contradicted, or unchanged flagged as contradicted). Jev decides at 0.5; a confident Jev error has p ≤ 0.2 on an altered sentence or p ≥ 0.8 on an unchanged one. The independence baseline is the LLM's own error rate on the same items.


### Jev under sharp3

| LLM judge | items in common | LLM error rate | Jev error rate | P(LLM wrong \| Jev wrong) | P(LLM wrong \| Jev confidently wrong) | n confident Jev errors | both wrong share | κ between error indicators |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| deepseek-v4-flash | 2080 | 16.5% | 25.5% | 44.3% | 61.2% | 263 | 11.3% | 0.421 |
| gpt-6-luna | 2328 | 18.0% | 26.0% | 50.8% | 67.5% | 305 | 13.2% | 0.492 |

### Jev under framed3

| LLM judge | items in common | LLM error rate | Jev error rate | P(LLM wrong \| Jev wrong) | P(LLM wrong \| Jev confidently wrong) | n confident Jev errors | both wrong share | κ between error indicators |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| deepseek-v4-flash | 2080 | 16.5% | 17.5% | 67.0% | 88.0% | 117 | 11.7% | 0.626 |
| gpt-6-luna | 2328 | 18.0% | 19.0% | 60.5% | 78.2% | 133 | 11.5% | 0.535 |

### Jev under framed20

| LLM judge | items in common | LLM error rate | Jev error rate | P(LLM wrong \| Jev wrong) | P(LLM wrong \| Jev confidently wrong) | n confident Jev errors | both wrong share | κ between error indicators |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| deepseek-v4-flash | 2080 | 16.5% | 11.9% | 49.4% | 67.6% | 37 | 5.9% | 0.319 |
| gpt-6-luna | 2328 | 18.0% | 12.8% | 40.8% | 48.9% | 47 | 5.2% | 0.223 |

deepseek-v4-flash and gpt-6-luna on 2080 items: error rates 16.5% and 16.9%, both wrong on 14.3%; P(gpt-6-luna wrong | deepseek-v4-flash wrong) = 86.3%.

Shared difficulty (Jev framed3 vs GPT-6 Luna, split by whether DeepSeek V4 Flash was wrong): hard items n=344, Jev err 70.9%, Luna err 86.3%, P(Luna wrong | Jev wrong) 92.6%; easy items n=1736, Jev err 6.9%, Luna err 3.2%, P(Luna wrong | Jev wrong) 8.3%.

## Combining judges (held-out motions, 719 items; rules fitted on 1361 training items)

| judges | at least one right | fitted weighted rule | best single |
|---|---:|---:|---:|
| framed3+luna | 91.2% | 88.5% (w=0.25, t=0.75) | 88.2% |
| framed3+flash | 91.0% | 88.7% (w=0.25, t=0.75) | 88.2% |
| luna+flash | 89.0% | 87.8% (w=0.25, t=0.1) | 87.5% |
| framed3+direct3 | 90.7% | 87.9% (w=1, t=1.05) | 88.2% |
| framed20+luna | 96.9% | 94.9% (w=0.25, t=0.7) | 94.4% |

Single judges on the same items: framed3 88.2%, framed20 94.4%, direct3 82.5%, luna 87.2%, flash 87.5%. Majority of framed3 + Luna + Flash: 88.7%.

## Jev's confidence and a confidence cascade (sharp3, decision at 0.5)

Jev alone: accuracy 74.0% on 2328 items; AUROC of its confidence |2p−1| for its own correctness 0.698.


### Cascade with deepseek-v4-flash as fallback (2080 items)

deepseek-v4-flash alone: accuracy 83.5%, cost per item $0.00081; Jev alone: $0.000033.

| τ on confidence | escalated | accuracy | cost per item | share of LLM cost |
|---:|---:|---:|---:|---:|
| 0.0 | 0.0% | 74.5% | $0.00003 | 4.0% |
| 0.1 | 3.6% | 75.0% | $0.00006 | 7.5% |
| 0.2 | 7.5% | 76.0% | $0.00009 | 11.0% |
| 0.3 | 11.5% | 76.8% | $0.00013 | 15.5% |
| 0.4 | 17.0% | 78.2% | $0.00017 | 21.1% |
| 0.5 | 23.2% | 79.8% | $0.00023 | 27.8% |
| 0.6 | 30.1% | 81.5% | $0.00028 | 34.7% |
| 0.7 | 38.8% | 82.7% | $0.00035 | 43.3% |
| 0.8 | 47.6% | 83.0% | $0.00043 | 53.2% |
| 0.9 | 60.2% | 83.4% | $0.00055 | 67.7% |
| 1.0 | 91.4% | 83.4% | $0.00081 | 99.4% |

### Cascade with gpt-6-luna as fallback (2328 items)

gpt-6-luna alone: accuracy 82.0%, cost per item $0.00014; Jev alone: $0.000033.

| τ on confidence | escalated | accuracy | cost per item | share of LLM cost |
|---:|---:|---:|---:|---:|
| 0.0 | 0.0% | 74.0% | $0.00003 | 24.1% |
| 0.1 | 3.6% | 74.7% | $0.00004 | 28.0% |
| 0.2 | 7.4% | 75.6% | $0.00004 | 31.7% |
| 0.3 | 11.3% | 76.5% | $0.00005 | 35.9% |
| 0.4 | 16.8% | 77.4% | $0.00006 | 41.5% |
| 0.5 | 22.9% | 78.8% | $0.00006 | 48.1% |
| 0.6 | 29.9% | 80.3% | $0.00007 | 55.0% |
| 0.7 | 38.6% | 81.3% | $0.00009 | 63.9% |
| 0.8 | 47.7% | 82.0% | $0.00010 | 73.8% |
| 0.9 | 60.9% | 82.3% | $0.00012 | 88.1% |
| 1.0 | 92.1% | 82.0% | $0.00016 | 118.0% |

## Jev's confidence and a confidence cascade (framed3, decision at 0.5)

Jev alone: accuracy 81.0% on 2328 items; AUROC of its confidence |2p−1| for its own correctness 0.794.


### Cascade with deepseek-v4-flash as fallback (2080 items)

deepseek-v4-flash alone: accuracy 83.5%, cost per item $0.00081; Jev alone: $0.000032.

| τ on confidence | escalated | accuracy | cost per item | share of LLM cost |
|---:|---:|---:|---:|---:|
| 0.0 | 0.0% | 82.5% | $0.00003 | 3.9% |
| 0.1 | 5.0% | 83.1% | $0.00009 | 10.7% |
| 0.2 | 9.7% | 83.5% | $0.00015 | 17.9% |
| 0.3 | 13.4% | 83.8% | $0.00019 | 23.5% |
| 0.4 | 18.9% | 84.1% | $0.00026 | 32.0% |
| 0.5 | 24.9% | 84.1% | $0.00032 | 39.2% |
| 0.6 | 31.9% | 83.9% | $0.00039 | 48.0% |
| 0.7 | 43.8% | 83.8% | $0.00050 | 61.6% |
| 0.8 | 63.2% | 83.6% | $0.00065 | 80.0% |
| 0.9 | 95.5% | 83.5% | $0.00083 | 102.1% |
| 1.0 | 100.0% | 83.5% | $0.00084 | 103.9% |

### Cascade with gpt-6-luna as fallback (2328 items)

gpt-6-luna alone: accuracy 82.0%, cost per item $0.00014; Jev alone: $0.000032.

| τ on confidence | escalated | accuracy | cost per item | share of LLM cost |
|---:|---:|---:|---:|---:|
| 0.0 | 0.0% | 81.0% | $0.00003 | 23.5% |
| 0.1 | 5.4% | 82.0% | $0.00004 | 30.0% |
| 0.2 | 10.4% | 82.6% | $0.00005 | 35.7% |
| 0.3 | 14.3% | 83.0% | $0.00005 | 40.5% |
| 0.4 | 20.6% | 83.2% | $0.00006 | 47.7% |
| 0.5 | 27.2% | 83.4% | $0.00007 | 55.3% |
| 0.6 | 34.8% | 83.2% | $0.00009 | 63.5% |
| 0.7 | 47.0% | 83.0% | $0.00010 | 76.4% |
| 0.8 | 66.1% | 82.5% | $0.00013 | 95.4% |
| 0.9 | 96.0% | 82.0% | $0.00016 | 120.7% |
| 1.0 | 100.0% | 82.0% | $0.00017 | 123.5% |

## Jev's confidence and a confidence cascade (framed20, decision at 0.5)

Jev alone: accuracy 87.2% on 2328 items; AUROC of its confidence |2p−1| for its own correctness 0.834.


### Cascade with deepseek-v4-flash as fallback (2080 items)

deepseek-v4-flash alone: accuracy 83.5%, cost per item $0.00081; Jev alone: $0.000115.

| τ on confidence | escalated | accuracy | cost per item | share of LLM cost |
|---:|---:|---:|---:|---:|
| 0.0 | 0.0% | 88.1% | $0.00011 | 14.2% |
| 0.1 | 5.7% | 89.7% | $0.00018 | 22.3% |
| 0.2 | 11.7% | 90.0% | $0.00024 | 29.2% |
| 0.3 | 16.1% | 90.1% | $0.00028 | 34.3% |
| 0.4 | 22.5% | 89.8% | $0.00035 | 43.6% |
| 0.5 | 29.0% | 89.4% | $0.00043 | 52.5% |
| 0.6 | 36.7% | 89.0% | $0.00050 | 61.3% |
| 0.7 | 49.3% | 87.6% | $0.00061 | 74.8% |
| 0.8 | 68.4% | 86.1% | $0.00075 | 92.1% |
| 0.9 | 95.9% | 83.8% | $0.00091 | 112.3% |
| 1.0 | 100.0% | 83.5% | $0.00093 | 114.2% |

### Cascade with gpt-6-luna as fallback (2328 items)

gpt-6-luna alone: accuracy 82.0%, cost per item $0.00014; Jev alone: $0.000115.

| τ on confidence | escalated | accuracy | cost per item | share of LLM cost |
|---:|---:|---:|---:|---:|
| 0.0 | 0.0% | 87.2% | $0.00011 | 85.1% |
| 0.1 | 6.0% | 88.7% | $0.00012 | 91.7% |
| 0.2 | 12.3% | 89.2% | $0.00013 | 98.6% |
| 0.3 | 17.0% | 89.6% | $0.00014 | 103.7% |
| 0.4 | 24.0% | 89.6% | $0.00015 | 111.9% |
| 0.5 | 30.9% | 89.4% | $0.00016 | 119.6% |
| 0.6 | 39.0% | 89.3% | $0.00017 | 128.0% |
| 0.7 | 51.6% | 87.8% | $0.00019 | 141.0% |
| 0.8 | 70.0% | 85.7% | $0.00021 | 159.1% |
| 0.9 | 96.2% | 82.5% | $0.00025 | 182.2% |
| 1.0 | 100.0% | 82.0% | $0.00025 | 185.1% |

## Held-out criterion optimisation (relation question over the top-3 passages; only the `contradicts` text changes)

Reviser: gpt-6.1-sol. Training sample: 400 pairs from the training motions; held-out: 407 pairs from motions the loop never saw.

| wording | train AUROC | train det ≥0.7 | train FA ≥0.7 | held-out AUROC | held-out det ≥0.7 | held-out FA ≥0.7 |
|---|---:|---:|---:|---:|---:|---:|
| seed (sharp) | 0.899 | 37.3% | 0.8% | 0.873 | 40.0% | 3.9% |
| optimised | 0.905 | 44.3% | 1.0% | 0.893 | 49.9% | 4.2% |

Best wording: "The `evidence` gives a different number, date, name, place, threshold, or outcome for a fact asserted in `sentence`, or explicitly states its opposite, even if the rest of the sentence agrees with the evidence."

All wordings tried (round, train AUROC, text):

- r0 0.899 det 37.3% FA 0.8%: "a passage gives a different number, date, name, place or outcome for the same thing `sentence` describes, or states the opposite"
- r1 0.905 det 44.3% FA 1.0%: "The `evidence` gives a different number, date, name, place, threshold, or outcome for a fact asserted in `sentence`, or explicitly states its opposite, even if the rest of the sentence agrees with the evidence."
- r1 0.876 det 32.5% FA 0.8%: "A passage in `evidence` describes the same entity, event, measure, and relevant period as `sentence` but assigns an incompatible value or detail to at least one asserted fact."
- r1 0.889 det 15.8% FA 0.3%: "The `evidence` conflicts with an asserted fact in `sentence`, not merely its tone or interpretation; figures for another measure, unit, period, source edition, or entity, and missing information, do not count as conflicts."
- r1 0.894 det 41.0% FA 0.8%: "Compare each factual detail in `sentence` with passages in `evidence` about that same fact, and select this option if any passage supplies an incompatible detail, even when other details match; do not treat an unmentioned detail as contradicted."
- r2 0.903 det 38.5% FA 0.8%: "A passage in `evidence` gives a number, date, name, place, threshold, or outcome incompatible with the corresponding detail in `sentence`, or explicitly states the opposite, even if every other detail agrees."
- r2 0.886 det 39.3% FA 0.8%: "The `evidence` describes the same fact as `sentence` but assigns it an incompatible value or detail; agreement on the general claim does not cancel a mismatch in one asserted detail."
- r2 0.893 det 19.8% FA 0.3%: "The `evidence` conflicts with a fact asserted in `sentence`; missing details, equivalent units, and figures for a different entity, measure, period, or source edition do not count as conflicts."
- r2 0.905 det 47.0% FA 0.8%: "Compare the factual details in `sentence` with the corresponding facts in `evidence` and choose this option if even one detail is incompatible, but not merely because a detail is absent or a passage discusses something different."
- r3 0.905 det 49.0% FA 2.0%: "A passage in `evidence` states a different number, date, name, place, threshold, or outcome for a fact asserted in `sentence`, even when it confirms the main claim or every other detail."
- r3 0.895 det 36.8% FA 0.5%: "The `evidence` and `sentence` describe the same fact but give incompatible details, such as different start dates for the same scheme or different percentages for the same result; one such mismatch is enough."
- r3 0.885 det 26.3% FA 0.5%: "The `evidence` gives an incompatible detail for the same fact in `sentence`, not merely a missing detail, an equivalent value in different units, or a figure for another measure, period, entity, or source edition."
- r3 0.901 det 35.0% FA 1.0%: "Check each asserted detail in `sentence` against passages in `evidence` about that fact, and choose this option when any corresponding detail cannot be true alongside the evidence, regardless of other agreements; an unmentioned detail alone does not qualify."

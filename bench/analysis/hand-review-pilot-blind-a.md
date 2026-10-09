# Hand review of Jev's verdicts, pilot-blind-a

Reviewer: Claude (Fable 5.1), reading each sentence against the evidence passages listed in
`review-contradicted-pilot-blind-a.md` and `review-supported-pilot-blind-a.md`, plus general knowledge of
the sources. This is a model's reading, not a human annotation; it is recorded so that a human reviewer can
check it item by item. RIGHT means the verdict matches the evidence, WRONG means it does not, UNCLEAR means
the evidence is mixed or the sentence is too vague to call.

## All 3 contradicted sentences

| # | sentence (short) | model | Jev p(contra) | review | why |
|---|---|---|---:|---|---|
| 1 | "no study links these taxes to reduced obesity or diabetes" | deepseek-v4-flash | 0.87 | RIGHT | W0017: a 2019 review found the taxes reduced adverse health consequences. |
| 2 | "Mexico's tax cut purchases most among low-income households" | deepseek-v4-flash | 0.70 | WRONG | P04 and W0038 say exactly this: reductions were larger in low-income households (9%, 17%). The sentence is true and supported. Jev may have read "tax cut" as a reduction in tax. |
| 3 | "Nuclear is the most expensive low-carbon option" | deepseek-v4-pro | 0.75 | UNCLEAR | W0075 says lifetime extension is the least-cost option; the pack's Lazard passage (P19, 175 to 255 $/MWh for new nuclear against 40 to 99 for solar and wind) supports the sentence for new builds. Evidence points both ways; is_claim was 0.53. |

Precision of retractions on this sample: 1 right, 1 wrong, 1 unclear out of 3.

## 30 sampled supported sentences

| # | model | review | note |
|---|---|---|---|
| 1 | gpt-6-luna | WRONG | "purchases fell 7.6% in its first year ... BMJ": the BMJ 2016 study says 6% in 2014 (12% by December). 7.6% is the two-year average from a different 2017 paper. A wrong number was accepted at p(supported) 0.88. |
| 2 | gpt-6-luna | RIGHT | P04. |
| 3 | gpt-6.1-sol | RIGHT | P13. |
| 4 | gpt-6-luna | RIGHT | P13. |
| 5 | gpt-6-luna | RIGHT | W0859. |
| 6 | gpt-6-luna | UNCLEAR | 7.6% over two years is the 2017 Health Affairs figure, not BMJ, and the number is in no passage. The gist (tax 2014, purchases fell) is supported. Should have been unverified. |
| 7 | deepseek-v4-flash | RIGHT | W0822. |
| 8 | deepseek-v4-flash | RIGHT | W0424. |
| 9 | deepseek-v4-flash | RIGHT | P13, P15. |
| 10 | gpt-6-luna | UNCLEAR | "not sugary drinks": W0027 says Denmark also abolished its soft drink tax in 2013. The evidence partly contradicts the sentence. |
| 11 | deepseek-v4-flash | RIGHT | P20. |
| 12 | gpt-6-luna | RIGHT | reformulation under the UK levy is in the pack. |
| 13 | deepseek-v4-flash | UNCLEAR | the 7.6% figure is not in any passage; gist supported by P20. |
| 14 | gpt-6-luna | RIGHT | P04. |
| 15 | gpt-6-luna | RIGHT | W0879. |
| 16 | gpt-6-luna | RIGHT | W0123, at the edge of opinion (is_claim 0.50). |
| 17 | deepseek-v4-pro | RIGHT | P16, W1160. |
| 18 | gpt-6-luna | RIGHT | W0122, W1280. |
| 19 | deepseek-v4-pro | RIGHT | W0919 says nearly four times over budget. |
| 20 | deepseek-v4-pro | UNCLEAR | a forecast, not a checkable fact; W0262 argues the opposite. |
| 21 | deepseek-v4-pro | UNCLEAR | a characterisation; loosely matches W0220 and W1280. |
| 22 | gpt-6-luna | RIGHT | P02. |
| 23 | gpt-6-luna | RIGHT | W1436. |
| 24 | deepseek-v4-pro | RIGHT | W0054. |
| 25 | deepseek-v4-pro | UNCLEAR | "consistently misses" is a generalisation from two cases. |
| 26 | gpt-6.1-sol | RIGHT | P04. |
| 27 | gpt-6.1-sol | RIGHT | W1308. |
| 28 | gpt-6.1-sol | RIGHT | W0122. |
| 29 | deepseek-v4-flash | RIGHT | P16; site work at Vogtle began in 2009. |
| 30 | deepseek-v4-flash | RIGHT | P19. |

Tally: 22 RIGHT, 1 WRONG, 7 UNCLEAR. The one clear error and three of the unclear cases are the same
pattern: a specific figure (7.6%) that appears in no passage, accepted as supported because the passages
support the surrounding claim. The other unclear cases are sentences that are closer to opinion than to a
checkable fact but passed the is_claim threshold.

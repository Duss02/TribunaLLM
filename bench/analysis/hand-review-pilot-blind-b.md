# Hand review of the 17 sentences Jev struck in pilot-blind-b

Reviewer: Claude (Fable 5.1), a language model, not a person. Source: `review-contradicted-pilot-blind-b.md`.
RIGHT means the evidence really contradicts the sentence, WRONG means it does not (false alarm), UNCLEAR means
the evidence is mixed or the sentence is argument rather than a checkable fact.

| # | model | pack | review | why |
|---|---|---|---|---|
| 1 | gpt-6-luna | rent-control | UNCLEAR | The paper reports a 15% supply cut among treated buildings, as the sentence says; the library passage (W0047) calls it a 15% citywide decrease. The evidence is the questionable party. |
| 2 | deepseek-v4-flash | rent-control | RIGHT | "reaches every renter automatically": every passage describes exemptions, caps and opt-outs. |
| 3 | deepseek-v4-pro | four-day-week | WRONG | an argument about consequences, not a checkable fact; nothing in the evidence addresses it. |
| 4 | claude-opus-5.5 | rent-control | RIGHT | W0998: Costa-Hawkins was amended in 2002 to close a condominium-conversion loophole. |
| 5 | deepseek-v4-pro | congestion-pricing | RIGHT | W0099: the Stockholm trial showed a reduction in traffic outside the zone. |
| 6 | deepseek-v4-pro | congestion-pricing | RIGHT | as 5. |
| 7 | deepseek-v4-pro | congestion-pricing | UNCLEAR | Durham is right; Gothenburg's tax did fund a package but also cut traffic 10% (W0524). |
| 8 | deepseek-v4-pro | rent-control | UNCLEAR | depends on what "loophole" means in context; W0998 says there was one. |
| 9 | deepseek-v4-pro | congestion-pricing | RIGHT | W0282: New York gives low-income residents a 50% discount. |
| 10 | deepseek-v4-pro | four-day-week | WRONG | 18 permanent and 56 of 61 continuing is exactly P03; "5 did not continue" follows. The framing is argument, the figures are right. |
| 11 | deepseek-v4-pro | four-day-week | UNCLEAR | "observed in trial after trial" is a generalisation the evidence neither confirms nor refutes. |
| 12 | deepseek-v4-pro | rent-control | WRONG | reduced displacement (P02) and supply lost through conversion and redevelopment (P03, W0047) are what the study found. |
| 13 | deepseek-v4-flash | four-day-week | WRONG | "that still proves the key claim" is argument; the passages shown are unrelated. |
| 14 | deepseek-v4-flash | congestion-pricing | WRONG | Essingeleden was exempt until 2016 and the tax was then extended to it because of its jams (W0245), which is what the sentence says. |
| 15 | deepseek-v4-pro | rent-control | RIGHT | W0047: landlords removed 30% of units by conversion to condos or TICs. |
| 16 | deepseek-v4-pro | rent-control | WRONG | an argument about a proposed ban, not a checkable fact. |
| 17 | deepseek-v4-pro | rent-control | WRONG | "allow landlords predictable returns" is an opinion (is_claim 0.51); W0023 does not contradict it. |

Tally: 6 RIGHT, 4 UNCLEAR, 7 WRONG. With the 3 from stage 1 (1 right, 1 unclear, 1 wrong) the 20 retractions
of the pilot are 7 right, 5 unclear, 8 wrong.

DeepSeek V4 Pro carries 12 of the 17. Nine of its twelve are rebuttals that deny the opponent's point ("your
claim that ... is wrong", "no loophole was needed", "that removes the exact channel"). When the opponent's point
is what the library says, the judge reads the denial as a contradiction, whether or not the denial is a fact. So
part of DeepSeek V4 Pro's 2.2% retraction rate is a debating style, not a knowledge gap, and the leaderboard
cannot tell the two apart.

# Leaderboard v2: the arena's claims under the framed criterion

180 blind debates, 3357 claims, judged again by Jev 1.13.0 with the framed criterion over every passage the arena read (9,046,774 input tokens, $0.38). The pilot's own question struck 20 claims; the framed criterion marks 755 at the 0.5 rule and 90 at the confident rule (p >= 0.88, the high threshold of the guaranteed-risk region fitted on DebateCheck's training motions, 5% error target). Match outcomes (rating, wins) are the pilot's, unchanged. Wilson 95% intervals.

| model | claims | contradicted (pilot) | contradicted, 0.5 | rate | 95% CI | contradicted, confident | rate | 95% CI | mean p | pilot rating | win rate |
|---|---:|---:|---:|---:|---|---:|---:|---|---:|---:|---:|
| claude-sonnet-5.5 | 590 | 0 | 111 | 18.8% | 15.9%-22.2% | 7 | 1.2% | 0.6%-2.4% | 0.345 | 1574 | 61.7% |
| claude-opus-5.5 | 728 | 1 | 144 | 19.8% | 17.0%-22.8% | 15 | 2.1% | 1.3%-3.4% | 0.336 | 1640 | 71.7% |
| gpt-6.1-sol | 455 | 0 | 63 | 13.8% | 11.0%-17.3% | 10 | 2.2% | 1.2%-4.0% | 0.272 | 1584 | 63.3% |
| deepseek-v4-flash | 667 | 5 | 209 | 31.3% | 27.9%-35.0% | 24 | 3.6% | 2.4%-5.3% | 0.401 | 1459 | 43.3% |
| deepseek-v4-pro | 580 | 13 | 174 | 30.0% | 26.4%-33.9% | 21 | 3.6% | 2.4%-5.5% | 0.407 | 1400 | 34.2% |
| gpt-6-luna | 337 | 1 | 54 | 16.0% | 12.5%-20.3% | 13 | 3.9% | 2.3%-6.5% | 0.292 | 1342 | 25.8% |

| motion | claims | contradicted, 0.5 | rate | contradicted, confident | rate |
|---|---:|---:|---:|---:|---:|
| congestion-pricing | 514 | 147 | 28.6% | 4 | 0.8% |
| crewed-spaceflight | 540 | 64 | 11.9% | 3 | 0.6% |
| four-day-week | 589 | 81 | 13.8% | 3 | 0.5% |
| nuclear-power | 608 | 161 | 26.5% | 26 | 4.3% |
| rent-control | 545 | 111 | 20.4% | 16 | 2.9% |
| sugar-tax | 561 | 191 | 34.0% | 38 | 6.8% |

Most confidently contradicted claims (p >= 0.88), for review:

- 0.94 | deepseek-v4-flash | sugar-tax | Philadelphia's 2019 JAMA study found a 38% drop in taxed drink sales; substitution is a reason to broaden the tax, not abandon it.
- 0.94 | gpt-6.1-sol | nuclear-power | Construction of the United Arab Emirates’ first Barakah reactor began in 2012; it entered commercial operation in 2021.
- 0.93 | gpt-6-luna | nuclear-power | The UAE’s first Barakah reactor entered commercial operation in 2021, about nine years after construction began in 2012.
- 0.93 | claude-opus-5.5 | nuclear-power | The UAE's Barakah plant, built by Korea's KEPCO, began construction in 2012 and its first unit entered commercial operation in 2021.
- 0.93 | deepseek-v4-flash | sugar-tax | Mexico's 2014 peso-per-liter tax cut purchases of taxed drinks by 5.5% in 2014 and 9.7% in 2015, with the largest drops among low-income households, according to a 2016 BMJ study.
- 0.93 | deepseek-v4-pro | congestion-pricing | Milan's Area C, begun in 2012, reduced vehicle entries by about 30 percent.
- 0.93 | deepseek-v4-flash | rent-control | A 2019 study by Diamond, McQuade, and Qian found San Francisco's 1979 ordinance reduced rental housing supply by 15 percent and raised citywide rents by 5.1 percent.
- 0.92 | deepseek-v4-flash | sugar-tax | Philadelphia's 1.5-cent-per-ounce tax (2017) cut city sales 38%, while a 2020 JAMA Internal Medicine study found nearby sales rose 15.6%, so leakage erased much of the effect.
- 0.92 | deepseek-v4-pro | nuclear-power | Lazard’s 2024 analysis shows new nuclear at $142–222 per megawatt-hour, while utility-scale solar and onshore wind cost $29–92 and $27–73 respectively.
- 0.92 | deepseek-v4-pro | nuclear-power | Lazard’s 2023 levelized cost analysis puts new nuclear at $141–221 per megawatt-hour, far above utility-scale solar at $24–96 and onshore wind at $24–75.
- 0.92 | deepseek-v4-flash | sugar-tax | Mexico's 2014 peso-per-liter tax on sugary drinks cut purchases by 5.5% in 2014 and 9.7% in 2015, according to a BMJ study.
- 0.92 | gpt-6-luna | sugar-tax | Public Health England reported that average sugar content in soft drinks fell 29% between 2015 and 2019.
- 0.92 | deepseek-v4-flash | nuclear-power | Georgia's Vogtle 3 and 4 took roughly 15 years and exceeded $30 billion; unit 3 only entered commercial service in July 2023.
- 0.92 | claude-sonnet-5.5 | sugar-tax | Start with what my opponent concedes: Mexico's tax cut purchases, and Philadelphia's cut taxed sales by 38 percent.
- 0.92 | deepseek-v4-pro | sugar-tax | Mexico’s 10 percent tax, introduced in 2014, cut purchases of taxed beverages by 5.5 percent in the first year and 9.7 percent in the second.
- 0.92 | gpt-6-luna | nuclear-power | Lazard’s 2024 estimates put the unsubsidized cost of new nuclear electricity at $142–$222 per megawatt-hour, compared with $29–$92 for utility-scale solar and $27–$73 for onshore wind.
- 0.92 | claude-opus-5.5 | sugar-tax | Britain's Soft Drinks Industry Levy, in force since April 2018, pushed manufacturers to reformulate, and Public Health England reported sugar per 100ml in affected drinks fell by roughly 29 percent.
- 0.92 | deepseek-v4-pro | rent-control | Diamond, McQuade, and Qian found that while some tenants stayed, landlords responding to controls converted rental units to condos and TICs, cutting rental supply 15 percent and raising citywide rents by 5.1 percent.
- 0.92 | claude-opus-5.5 | four-day-week | A follow-up a year after Britain's pilot found that 54 of the 61 companies still ran a four-day week, and 31 had made it permanent.
- 0.92 | claude-opus-5.5 | crewed-spaceflight | And no human has left low Earth orbit since Apollo 17 in 1972, while robots kept going.
- 0.92 | deepseek-v4-flash | crewed-spaceflight | After Apollo 17 in 1972, no human has traveled beyond low Earth orbit; robots have since mapped Pluto, landed on Titan, and returned samples from Bennu.
- 0.91 | gpt-6-luna | sugar-tax | WHO recommends taxing sugary drinks to raise prices by at least 20% as one measure to reduce consumption.
- 0.91 | deepseek-v4-pro | sugar-tax | But the BMJ study of Mexico's tax found purchases of taxed beverages fell 9.7% by year two — that's a measurable drop in liquid sugar, the very driver of diabetes.
- 0.91 | claude-opus-5.5 | sugar-tax | Public Health England reported that sugar in levy-liable drinks fell about 29 percent between 2015 and 2018, without anyone policing choices.
- 0.91 | claude-sonnet-5.5 | sugar-tax | On Philadelphia, the 2019 JAMA study found that taxed beverage volume in the city fell about 38 percent.

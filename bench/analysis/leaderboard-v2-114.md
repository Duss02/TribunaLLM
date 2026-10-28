# Leaderboard v2: the arena's claims under the framed criterion

180 blind debates, 3357 claims, judged again by Jev 1.13.0 with the framed criterion over every passage the arena read (9,046,774 input tokens, $0.38). The pilot's own question struck 20 claims; the framed criterion marks 918 at the 0.5 rule and 90 at the confident rule (p >= 0.88, the high threshold of the guaranteed-risk region fitted on DebateCheck's training motions, 5% error target). Match outcomes (rating, wins) are the pilot's, unchanged. Wilson 95% intervals.

| model | claims | contradicted (pilot) | contradicted, 0.5 | rate | 95% CI | contradicted, confident | rate | 95% CI | mean p | pilot rating | win rate |
|---|---:|---:|---:|---:|---|---:|---:|---|---:|---:|---:|
| claude-sonnet-5.5 | 590 | 0 | 141 | 23.9% | 20.6%-27.5% | 8 | 1.4% | 0.7%-2.7% | 0.380 | 1574 | 61.7% |
| claude-opus-5.5 | 728 | 1 | 182 | 25.0% | 22.0%-28.3% | 16 | 2.2% | 1.4%-3.5% | 0.370 | 1640 | 71.7% |
| gpt-6.1-sol | 455 | 0 | 74 | 16.3% | 13.2%-19.9% | 11 | 2.4% | 1.4%-4.3% | 0.298 | 1584 | 63.3% |
| deepseek-v4-flash | 667 | 5 | 240 | 36.0% | 32.4%-39.7% | 23 | 3.4% | 2.3%-5.1% | 0.430 | 1459 | 43.3% |
| deepseek-v4-pro | 580 | 13 | 216 | 37.2% | 33.4%-41.2% | 20 | 3.4% | 2.2%-5.3% | 0.443 | 1400 | 34.2% |
| gpt-6-luna | 337 | 1 | 65 | 19.3% | 15.4%-23.8% | 12 | 3.6% | 2.0%-6.1% | 0.321 | 1342 | 25.8% |

| motion | claims | contradicted, 0.5 | rate | contradicted, confident | rate |
|---|---:|---:|---:|---:|---:|
| congestion-pricing | 514 | 179 | 34.8% | 5 | 1.0% |
| crewed-spaceflight | 540 | 84 | 15.6% | 8 | 1.5% |
| four-day-week | 589 | 108 | 18.3% | 2 | 0.3% |
| nuclear-power | 608 | 203 | 33.4% | 24 | 3.9% |
| rent-control | 545 | 130 | 23.9% | 14 | 2.6% |
| sugar-tax | 561 | 214 | 38.1% | 37 | 6.6% |

Most confidently contradicted claims (p >= 0.88), for review:

- 0.94 | claude-sonnet-5.5 | sugar-tax | On Philadelphia, the 2019 JAMA study found that taxed beverage volume in the city fell about 38 percent.
- 0.94 | gpt-6.1-sol | nuclear-power | Construction of the United Arab Emirates’ first Barakah reactor began in 2012; it entered commercial operation in 2021.
- 0.93 | gpt-6-luna | sugar-tax | WHO recommends taxing sugary drinks to raise prices by at least 20% as one measure to reduce consumption.
- 0.93 | claude-sonnet-5.5 | sugar-tax | Mexico's tax cut purchases, Berkeley's tax cut consumption, and a Philadelphia study in JAMA found that sugary drink purchases within the city fell by about 38 percent, even after counting cross-border shopping.
- 0.93 | deepseek-v4-flash | sugar-tax | Philadelphia's 2019 JAMA study found a 38% drop in taxed drink sales; substitution is a reason to broaden the tax, not abandon it.
- 0.93 | deepseek-v4-flash | crewed-spaceflight | Apollo 11's 1969 Moon landing inspired a generation and returned 21.5 kg of samples.
- 0.92 | deepseek-v4-flash | sugar-tax | Mexico's 2014 peso-per-liter tax on sugary drinks cut purchases by 5.5% in 2014 and 9.7% in 2015, according to a BMJ study.
- 0.92 | gpt-6-luna | sugar-tax | Public Health England reported that average sugar content in soft drinks fell 29% between 2015 and 2019.
- 0.92 | claude-opus-5.5 | nuclear-power | The UAE's Barakah plant, built by Korea's KEPCO, began construction in 2012 and its first unit entered commercial operation in 2021.
- 0.92 | gpt-6-luna | nuclear-power | Lazard’s 2024 analysis estimated new nuclear power at $142–$222 per megawatt-hour, compared with $29–$92 for utility-scale solar and $27–$73 for onshore wind.
- 0.92 | gpt-6-luna | sugar-tax | The 2016 *BMJ* study found Mexico’s taxed-drink purchases fell by 5.5% in 2014 and 9.7% in 2015 relative to its estimate without the tax.
- 0.92 | deepseek-v4-pro | rent-control | Diamond, McQuade, and Qian found that while some tenants stayed, landlords responding to controls converted rental units to condos and TICs, cutting rental supply 15 percent and raising citywide rents by 5.1 percent.
- 0.92 | claude-opus-5.5 | four-day-week | A follow-up a year after Britain's pilot found that 54 of the 61 companies still ran a four-day week, and 31 had made it permanent.
- 0.92 | claude-opus-5.5 | crewed-spaceflight | And no human has left low Earth orbit since Apollo 17 in 1972, while robots kept going.
- 0.92 | deepseek-v4-pro | congestion-pricing | Milan's Area C, begun in 2012, reduced vehicle entries by about 30 percent.
- 0.92 | deepseek-v4-pro | crewed-spaceflight | Since 1972 no human has left low Earth orbit.
- 0.91 | deepseek-v4-pro | nuclear-power | South Korea’s APR1400 design built four units at Barakah in the UAE between 2020 and 2024 after roughly a decade per unit, far faster than Vogtle.
- 0.91 | gpt-6-luna | nuclear-power | The UAE’s first Barakah reactor entered commercial operation in 2021, about nine years after construction began in 2012.
- 0.91 | claude-opus-5.5 | nuclear-power | On safety, Our World in Data estimates about 0.03 deaths per terawatt-hour, comparable to wind and solar and far below fossil fuels.
- 0.91 | claude-sonnet-5.5 | sugar-tax | In the UK, a 2023 Cambridge-led study in PLOS Medicine found obesity among year 6 girls fell about 8 percent in areas exposed to the levy, relative to comparison areas.
- 0.91 | deepseek-v4-flash | sugar-tax | A 2019 JAMA Internal Medicine study found Philadelphia's 2017 soda tax cut taxed beverage sales 38 percent inside the city, but sales rose 38 percent in neighboring areas.
- 0.91 | claude-sonnet-5.5 | sugar-tax | Start with what my opponent concedes: Mexico's tax cut purchases, and Philadelphia's cut taxed sales by 38 percent.
- 0.91 | deepseek-v4-pro | sugar-tax | Mexico’s 10 percent tax, introduced in 2014, cut purchases of taxed beverages by 5.5 percent in the first year and 9.7 percent in the second.
- 0.91 | deepseek-v4-flash | sugar-tax | Mexico's 2014 one-peso-per-liter tax cut taxed-beverage purchases by 6% in 2014 and 9% in 2015, according to a BMJ study.
- 0.91 | gpt-6-luna | nuclear-power | Lazard’s 2024 estimates put the unsubsidized cost of new nuclear electricity at $142–$222 per megawatt-hour, compared with $29–$92 for utility-scale solar and $27–$73 for onshore wind.

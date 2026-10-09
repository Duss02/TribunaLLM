# Perturbation test (78 sentences, seed 11)

Each sentence was judged supported during a debate. It is judged again unchanged (consistency) and with one number altered (sensitivity), against the same evidence.

| judged again | unchanged | number altered |
|---|---:|---:|
| supported | 75 (96.2%) | 30 (38.5%) |
| contradicted | 0 (0.0%) | 0 (0.0%) |
| unverified | 3 (3.8%) | 48 (61.5%) |
| opinion | 0 (0.0%) | 0 (0.0%) |

**Detection rate** (altered sentence called contradicted): 0.0%. **Accepted as supported anyway**: 38.5%.

| number kind | n | contradicted | still supported | unverified | mean p(contradicts) |
|---|---:|---:|---:|---:|---:|
| year | 52 | 0.0% | 42.3% | 57.7% | 0.15 |
| percent | 10 | 0.0% | 20.0% | 80.0% | 0.30 |
| other | 16 | 0.0% | 37.5% | 62.5% | 0.11 |

## Misses: altered numbers the judge still called supported

- (gpt-6.1-sol, sugar-tax) 2016 → 2013: "A 2013 BMJ study estimated that purchases of taxed beverages fell by 6% during 2014 compared with purchases expected without the tax; the reduction reached 12% in December." · p(supported) 0.85, p(contradicts) 0.02
- (claude-sonnet-5.5, nuclear-power) 2025 → 2028: "Britain's Hinkley Point C was first slated for 2028 at £18 billion; EDF now targets 2029 to 2031 at up to £46 billion in current prices." · p(supported) 0.79, p(contradicts) 0.06
- (deepseek-v4-flash, nuclear-power) 2009 → 2004: "Vogtle Units 3 and 4 began in 2004, cost over $30 billion against a $14 billion budget, and finished in 2023 and 2024." · p(supported) 0.80, p(contradicts) 0.04
- (deepseek-v4-pro, sugar-tax) 2014 → 2007: "In Mexico after the 2007 one peso per litre levy, purchases of taxed drinks fell only about 6 percent, but purchases of untaxed drinks rose, offsetting much of the calorie reduction." · p(supported) 0.87, p(contradicts) 0.06
- (gpt-6.1-sol, sugar-tax) 2019 → 2012: "A 2012 JAMA study of Philadelphia’s beverage tax found that increased sales in bordering areas offset approximately 24 percent of the city’s sales decline." · p(supported) 0.91, p(contradicts) 0.02
- (gpt-6-luna, sugar-tax) 2014 → 2010: "No single tax can prove it will reduce obesity, but the evidence does show lower purchases: after Mexico’s 2010 tax, purchases of taxed drinks fell relative to the predicted trend, with larger declines among lower-income households." · p(supported) 0.84, p(contradicts) 0.01
- (deepseek-v4-pro, sugar-tax) 2014 → 2008: "Mexico’s 2008 one-peso-per-litre levy reduced purchases by about 6 percent, but that modest decline has not been shown to lower national obesity or diabetes rates." · p(supported) 0.84, p(contradicts) 0.05
- (deepseek-v4-flash, nuclear-power) 24 → 47: "Barakah's four units at roughly $47 billion now supply up to a quarter of UAE electricity, displacing gas." · p(supported) 0.77, p(contradicts) 0.01
- (deepseek-v4-flash, sugar-tax) 2015 → 2020: "Berkeley's 2020 penny-per-ounce tax was followed by a 21 percent drop in sugary-drink consumption in low-income neighborhoods." · p(supported) 0.79, p(contradicts) 0.02
- (deepseek-v4-flash, sugar-tax) 2014 → 2010: "Mexico's 2010 one-peso-per-litre tax reduced taxed purchases about 6 percent, but consumers substituted untaxed drinks." · p(supported) 0.84, p(contradicts) 0.12
- (deepseek-v4-flash, sugar-tax) 2012 → 2018: "Denmark abolished its fat tax in 2018 and scrapped a planned sugar tax in 2013 after cross-border shopping and economic costs." · p(supported) 0.79, p(contradicts) 0.13
- (gpt-6.1-sol, sugar-tax) 2019 → 2015: "Philadelphia also illustrates leakage: a 2015 JAMA study found that increased sales in bordering areas partially offset falling sales inside the city after its beverage tax." · p(supported) 0.87, p(contradicts) 0.04
- (gpt-6-luna, nuclear-power) 2023 → 2017: "France illustrates the potential: nuclear supplied roughly two-thirds of its electricity in 2017, according to the International Energy Agency." · p(supported) 0.88, p(contradicts) 0.00
- (claude-opus-5.5, nuclear-power) 0.03 → 0.1: "On safety, Our World in Data estimates about 0.1 deaths per terawatt-hour for nuclear, against roughly 24.6 for coal." · p(supported) 0.85, p(contradicts) 0.00
- (claude-sonnet-5.5, nuclear-power) 1970 → 1976: "France built most of its reactor fleet between the 1976s and 1990s, and today nuclear supplies around 65 to 70 percent of its electricity, giving it one of the cleanest grids in Europe." · p(supported) 0.87, p(contradicts) 0.00
- (claude-opus-5.5, sugar-tax) 2019 → 2026: "The 2026 JAMA study found taxed-drink sales fell 51 percent inside the city, partly offset by a rise of about 24 percent in neighbouring areas." · p(supported) 0.77, p(contradicts) 0.02
- (gpt-6.1-sol, sugar-tax) 75 → 44: "Britain exempts pure fruit juice and milk-based drinks containing at least 44 percent milk, illustrating how targeting particular products leaves other sugar sources untouched." · p(supported) 0.79, p(contradicts) 0.02
- (gpt-6.1-sol, sugar-tax) 2016 → 2021: "A study published in The BMJ in 2021 estimated that purchases of taxed beverages fell by 6% during 2014 relative to expected purchases without the tax; reductions were greater among lower-income households." · p(supported) 0.92, p(contradicts) 0.01
- (claude-sonnet-5.5, nuclear-power) 24 → 64: "Barakah is the best case for nuclear, and it still took about twelve years from first construction to all four units operating, at a reported cost near 64 billion dollars for 5.6 gigawatts." · p(supported) 0.77, p(contradicts) 0.06
- (gpt-6.1-sol, nuclear-power) 2016 → 2009: "Vogtle illustrates the problem: units 3 and 4 entered commercial operation in 2023 and 2024, years after their original 2009 and 2017 targets." · p(supported) 0.92, p(contradicts) 0.00
- (claude-sonnet-5.5, sugar-tax) 2018 → 2011: "The UK's 2011 Soft Drinks Industry Levy prompted manufacturers to reformulate, cutting sugar in many drinks without needing consumers to change behaviour." · p(supported) 0.78, p(contradicts) 0.08
- (deepseek-v4-flash, sugar-tax) 2017 → 2023: "Philadelphia's 2023 tax pushed purchases across city lines, a 2019 JAMA Internal Medicine study found." · p(supported) 0.70, p(contradicts) 0.07
- (gpt-6.1-sol, sugar-tax) 2017 → 2021: "Mexico’s two-year purchase results were published in Health Affairs in 2021; they measured purchases, not those health outcomes." · p(supported) 0.70, p(contradicts) 0.02
- (claude-opus-5.5, sugar-tax) 520 → 1585: "Britain's levy was forecast to raise about £1585 million a year but initially raised roughly half that, because firms cut sugar." · p(supported) 0.75, p(contradicts) 0.02
- (claude-sonnet-5.5, nuclear-power) 1990 → 1994: "Solar and wind supplied a rapidly growing share of global electricity in recent years, while nuclear's share has drifted down from its 1994s peak of about 17 percent." · p(supported) 0.88, p(contradicts) 0.04
- (deepseek-v4-flash, nuclear-power) 30 → 74: "Vogtle 3 and 4 in Georgia took over a decade, cost above $74 billion, and entered service in 2023 and 2024, years late." · p(supported) 0.75, p(contradicts) 0.04
- (claude-sonnet-5.5, sugar-tax) 100 → 252: "The levy's reformulation effect came from a tiered design that taxed only drinks above 5 grams of sugar per 252 ml, which rewards manufacturers for changing recipes, not consumers for changing habits." · p(supported) 0.77, p(contradicts) 0.03
- (gpt-6.1-sol, nuclear-power) 2014 → 2007: "The IPCC’s 2007 assessment reported median lifecycle emissions of 12 grams of CO₂-equivalent per kilowatt-hour for nuclear power, compared with 820 for coal and 490 for gas." · p(supported) 0.81, p(contradicts) 0.00
- (claude-sonnet-5.5, nuclear-power) 2014 → 2010: "The IPCC's 2010 assessment put its median lifecycle emissions near 12 grams of CO2 per kilowatt-hour, comparable to wind and far below coal at roughly 820." · p(supported) 0.84, p(contradicts) 0.00
- (deepseek-v4-flash, sugar-tax) 7.6 → 13: "Mexico's 13 percent drop is purchase-based, with no study showing reduced obesity or diabetes." · p(supported) 0.79, p(contradicts) 0.09

Jev cost of this test: $0.0208.

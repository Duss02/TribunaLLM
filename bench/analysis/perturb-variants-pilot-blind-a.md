# Question variants on the perturbation pairs (78 pairs)

p(contradicts) for the unchanged sentence (should stay low) and for the sentence with one number altered (should rise). Detection is the share of altered sentences at or above the threshold; false alarm is the share of unchanged sentences at or above it.

| variant | altered: mean p | detection ≥0.7 | detection ≥0.5 | unchanged: mean p | false alarm ≥0.7 | false alarm ≥0.5 |
|---|---:|---:|---:|---:|---:|---:|
| loose, all 20 (as in the debate) | 0.18 | 2.6% | 10.3% | 0.03 | 0.0% | 0.0% |
| sharp, all 20 | 0.38 | 20.5% | 35.9% | 0.06 | 0.0% | 0.0% |
| sharp, top 3 by BM25 | 0.49 | 33.3% | 46.2% | 0.09 | 1.3% | 2.6% |
| sharp, top 1 by BM25 | 0.46 | 35.9% | 46.2% | 0.14 | 5.1% | 10.3% |
| direct yes/no, top 3 | 0.69 | 56.4% | 76.9% | 0.34 | 10.3% | 26.9% |

## By kind of number, detection ≥0.5

| kind | n | loose, all 20 (as in the debate) | sharp, all 20 | sharp, top 3 by BM25 | sharp, top 1 by BM25 | direct yes/no, top 3 |
|---|---:|---:|---:|---:|---:|---:|
| year | 52 | 9.6% | 36.5% | 48.1% | 46.2% | 82.7% |
| percent | 10 | 30.0% | 60.0% | 50.0% | 40.0% | 50.0% |
| other | 16 | 0.0% | 18.8% | 37.5% | 50.0% | 75.0% |

## Altered sentences still below 0.5 under "sharp, top 3 by BM25"

- (claude-opus-5.5, sugar-tax) 2014 → 2007: "Denmark abolished its soft drink tax in 2007 partly because of cross-border shopping, and Cook County, Illinois repealed its penny-per-ounce tax in 2017 after only a few months amid public backlash." · p 0.15
- (gpt-6.1-sol, sugar-tax) 2016 → 2013: "A 2013 BMJ study estimated that purchases of taxed beverages fell by 6% during 2014 compared with purchases expected without the tax; the reduction reached 12% in December." · p 0.24
- (claude-sonnet-5.5, nuclear-power) 2025 → 2028: "Britain's Hinkley Point C was first slated for 2028 at £18 billion; EDF now targets 2029 to 2031 at up to £46 billion in current prices." · p 0.12
- (deepseek-v4-flash, nuclear-power) 2009 → 2004: "Vogtle Units 3 and 4 began in 2004, cost over $30 billion against a $14 billion budget, and finished in 2023 and 2024." · p 0.22
- (deepseek-v4-pro, sugar-tax) 2014 → 2007: "In Mexico after the 2007 one peso per litre levy, purchases of taxed drinks fell only about 6 percent, but purchases of untaxed drinks rose, offsetting much of the calorie reduction." · p 0.46
- (deepseek-v4-flash, nuclear-power) 65 → 37: "France shows the payoff: nuclear supplies roughly 37% of its electricity, and its grid carbon intensity is a fraction of Germany's, which shut reactors and burned more coal." · p 0.29
- (deepseek-v4-pro, sugar-tax) 2010 → 2007: "Reduced consumption is the mechanism, and a 2007 meta-analysis in Diabetes Care found the highest sugary-drink consumers had a 26 percent higher risk of diabetes." · p 0.04
- (claude-opus-5.5, nuclear-power) 90 → 48: "American reactors run at capacity factors above 48 percent, delivering power around the clock." · p 0.21
- (deepseek-v4-flash, sugar-tax) 2015 → 2022: "Berkeley's 2022 penny-per-ounce tax was followed by a 21% drop in sugary drink consumption in low-income neighborhoods." · p 0.21
- (deepseek-v4-flash, nuclear-power) 24 → 47: "Barakah's four units at roughly $47 billion now supply up to a quarter of UAE electricity, displacing gas." · p 0.08
- (deepseek-v4-flash, sugar-tax) 2015 → 2020: "Berkeley's 2020 penny-per-ounce tax was followed by a 21 percent drop in sugary-drink consumption in low-income neighborhoods." · p 0.17
- (gpt-6.1-sol, sugar-tax) 2016 → 2010: "A 2010 BMJ study estimated that purchases of taxed beverages fell by 6% during the first year relative to expected purchases without the tax; reductions were greater among lower-income households." · p 0.30
- (deepseek-v4-flash, sugar-tax) 2012 → 2018: "Denmark abolished its fat tax in 2018 and scrapped a planned sugar tax in 2013 after cross-border shopping and economic costs." · p 0.22
- (claude-opus-5.5, nuclear-power) 30 → 59: "In the United States, Vogtle units 3 and 4 came in at over 59 billion dollars, roughly double original estimates." · p 0.43
- (gpt-6.1-sol, sugar-tax) 2019 → 2015: "Philadelphia also illustrates leakage: a 2015 JAMA study found that increased sales in bordering areas partially offset falling sales inside the city after its beverage tax." · p 0.33
- (gpt-6-luna, nuclear-power) 2023 → 2017: "France illustrates the potential: nuclear supplied roughly two-thirds of its electricity in 2017, according to the International Energy Agency." · p 0.03
- (claude-opus-5.5, nuclear-power) 0.03 → 0.1: "On safety, Our World in Data estimates about 0.1 deaths per terawatt-hour for nuclear, against roughly 24.6 for coal." · p 0.33
- (claude-sonnet-5.5, nuclear-power) 1970 → 1976: "France built most of its reactor fleet between the 1976s and 1990s, and today nuclear supplies around 65 to 70 percent of its electricity, giving it one of the cleanest grids in Europe." · p 0.03
- (gpt-6.1-sol, sugar-tax) 75 → 44: "Britain exempts pure fruit juice and milk-based drinks containing at least 44 percent milk, illustrating how targeting particular products leaves other sugar sources untouched." · p 0.03
- (deepseek-v4-pro, nuclear-power) 90 → 44: "Nuclear also runs at very high capacity factors, above 44 percent in the United States, providing reliable baseload without carbon." · p 0.02
- (gpt-6.1-sol, sugar-tax) 2016 → 2021: "A study published in The BMJ in 2021 estimated that purchases of taxed beverages fell by 6% during 2014 relative to expected purchases without the tax; reductions were greater among lower-income households." · p 0.29
- (claude-sonnet-5.5, nuclear-power) 24 → 64: "Barakah is the best case for nuclear, and it still took about twelve years from first construction to all four units operating, at a reported cost near 64 billion dollars for 5.6 gigawatts." · p 0.11
- (claude-opus-5.5, sugar-tax) 2023 → 2019: "The 2019 PLOS Medicine study is observational, found no effect among boys or younger children, and measured obesity prevalence among girls aged 10 to 11 rather than long-term health." · p 0.48
- (gpt-6.1-sol, nuclear-power) 2016 → 2009: "Vogtle illustrates the problem: units 3 and 4 entered commercial operation in 2023 and 2024, years after their original 2009 and 2017 targets." · p 0.49
- (claude-sonnet-5.5, nuclear-power) 2023 → 2028: "Vogtle units 3 and 4 in Georgia came online in 2028 and 2024, about seven years late, at over $30 billion, roughly double the original budget." · p 0.19
- (claude-sonnet-5.5, sugar-tax) 2018 → 2011: "The UK's 2011 Soft Drinks Industry Levy prompted manufacturers to reformulate, cutting sugar in many drinks without needing consumers to change behaviour." · p 0.40
- (deepseek-v4-flash, nuclear-power) 2022 → 2028: "France's fleet is now aging; regulators found corrosion problems that idled reactors in 2028." · p 0.24
- (deepseek-v4-flash, sugar-tax) 2017 → 2023: "Philadelphia's 2023 tax pushed purchases across city lines, a 2019 JAMA Internal Medicine study found." · p 0.16
- (deepseek-v4-pro, nuclear-power) 35 → 89: "The latest U.S. reactors, Vogtle units 3 and 4 in Georgia, finished seven years late at roughly $89 billion, more than double initial estimates." · p 0.36
- (gpt-6.1-sol, sugar-tax) 2017 → 2021: "Mexico’s two-year purchase results were published in Health Affairs in 2021; they measured purchases, not those health outcomes." · p 0.22

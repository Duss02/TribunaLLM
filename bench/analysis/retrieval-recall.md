# Retrieval recall (300 generated claims, deepseek-v4-flash, seed 5)

recall@k: share of claims whose source passage ranks within the top k by BM25 over the pack plus the library. The judge reads the top 20 for a sentence and the top 30 for a turn.

| query | recall@5 | recall@10 | recall@20 | recall@30 | median rank |
|---|---:|---:|---:|---:|---:|
| model-written claim | 92.0% | 95.7% | 96.3% | 97.7% | 1 |
| verbatim first sentence | 100.0% | 100.0% | 100.0% | 100.0% | 1 |

| pack | claims | recall@20 (claim) | recall@20 (verbatim) |
|---|---:|---:|---:|
| congestion-pricing | 30 | 96.7% | 100.0% |
| crewed-spaceflight | 30 | 100.0% | 100.0% |
| daylight-saving-time | 30 | 100.0% | 100.0% |
| four-day-week | 30 | 100.0% | 100.0% |
| nuclear-power | 30 | 96.7% | 100.0% |
| remote-work | 30 | 86.7% | 100.0% |
| rent-control | 30 | 93.3% | 100.0% |
| school-phone-ban | 30 | 90.0% | 100.0% |
| sugar-tax | 30 | 100.0% | 100.0% |
| universal-basic-income | 30 | 100.0% | 100.0% |

## Claims whose passage was not in the top 20

- (congestion-pricing, W0815, rank 34) Pigou argued for taxing overproducers so their expenses matched the harm imposed on society.
- (nuclear-power, W0882, rank 32) It investigates radioactive isotopes for medical therapies.
- (remote-work, W0557, rank >50) Staff who are deeply involved and keen on their roles often act to enhance their employer’s image and interests.
- (remote-work, W0222, rank 21) Over twenty years, digital communication tools have caused work and family roles to blend almost completely.
- (remote-work, W0677, rank >50) Schools adopted video conferencing to lower expenses and enroll more learners across wide areas.
- (remote-work, W0045, rank 21) A 2024 study reported that remote employees performed better each day because they focused more and engaged deeply.
- (rent-control, W1063, rank 21) Requiring landlords to insure against rent hikes harms tenants and reduces housing, so public aid or tax breaks work better.
- (rent-control, W0574, rank >50) Without a standard count, most cities rely on rough guesses for how many homeless residents they have.
- (school-phone-ban, W0248, rank >50) Some teenagers allegedly benefited from cyberbullying by learning to identify hostile individuals.
- (school-phone-ban, W0637, rank >50) Using social media, learners can connect with groups beyond school, expanding their outlook and finding help.
- (school-phone-ban, W0908, rank 24) Measuring only time online cannot reveal health harm, a key issue for deciding if excessive internet use is psychiatric.

Generation used 56896 input and 89205 output tokens of deepseek-v4-flash.

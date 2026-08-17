# Pending migrations

Run these **in order**, one file at a time, in the Supabase SQL editor.

`../PENDING.sql` is the same content in one 455 KB file. It is kept for
reference, but the SQL editor struggles with a paste that size — use these.

| # | file | what it does |
|---|------|--------------|
| 01 | 0018_onboarding_answers | diet, reactions and form preferences on the profile |
| 02 | 0019_menstrual_status | the one field the iron figure turns on |
| 03 | 0020_product_shaped_slugs | renames 74 ingredient-shaped slugs to product-shaped |
| 04 | 0021_catalogue_176 | **the 176 branded products** — takes the library to 250 |
| 05 | 0022_papers_part_one | 440 papers, Skin/Sleep/Energy |
| 06 | 0023_papers_part_two | 440 papers, Focus/Training/Immunity |
| 07 | 0024_ask_rate_limit | the assistant's rate-limit table |
| 08 | 0025_schedule_joins_stack | already run under its old name; re-running is a no-op |
| 09 | 0026_delete_account | **urgent** — Delete Account is live and calls this |
| 10 | 0027_ask_reports | reporting an assistant answer |
| 11 | 0028_ingredients | the ingredient and synonym tables |
| 12 | 0029_ingredient_rows | 652 ingredient rows, 548 synonyms |
| 13 | 0030_growth_goal_tag | tags the 19 growth-category products so the Growth goal matches |
| 14 | 0031_peptides_have_no_dose | triggers that stop a peptide carrying timing or being scheduled |
| 15 | 0032_ingredient_search | search across the ingredient panel, not just names |
| 16 | 0033_serving_sizes | the label's own serving, so no amount is computed |
| 17 | 0034_dose_skips | the reason and note captured on the catch-up screen |
| 18 | 0035_onboarded_at | **the onboarding gate reads this** — without it onboarding re-runs on a new device |
| 19 | 0036_drop_injection_site | removes the last injection-related column |
| 20 | 0037_tiers | **the whole free/pro split** — `free_rank`, the stack-limit trigger, `my_entitlement()` |
| 21 | 0038_user_facts | `user_facts`, key validation, the tag trigger — the assistant's memory |

Order matters. 03 must run before 04, and 11 before 12.

**20 must run after 08, and 08 must not be re-run after 20.** `0025` bulk-inserts
into `stack_items`; once `0037` has installed the free-tier trigger that insert
raises `free_tier_stack_limit` for any free account with two or more scheduled
products, and the migration aborts. A clean in-order run is fine. Re-running 08
afterwards is not, which is the one exception to the line below.

Every other file is idempotent, so a re-run changes nothing and a partial run can
be resumed.

If one fails, stop and read the error rather than continuing — a later file
will usually depend on it.

> Rows 15–21 were added by the independent audit pass; the table had stopped at
> 14 while the directory held files through 21. See `AUDIT_INDEPENDENT.md`.
> Check what is already applied before running anything — `FINISH_REPORT.md` §2
> and this table disagree about how much of the list is behind you.

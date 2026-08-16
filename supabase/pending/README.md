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

Order matters. 03 must run before 04, and 11 before 12. Every file is
idempotent, so a re-run changes nothing and a partial run can be resumed.

If one fails, stop and read the error rather than continuing — a later file
will usually depend on it.

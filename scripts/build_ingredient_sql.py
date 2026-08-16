"""Turn scripts/ingredients.json into migration 0029.

    python scripts/build_ingredient_sql.py

Writes supabase/migrations/0029_ingredient_rows.sql and prints the numbers that
belong in the report: how many products got rows, how many rows carry a
canonical key, how many were left unmapped and why.
"""

from __future__ import annotations

import json
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ingredient_map import (  # noqa: E402
    BLEND_HEADINGS,
    PANEL_NOISE,
    SYNONYMS,
    normalise,
    resolve,
)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(HERE, "ingredients.json")
OUT = os.path.join(ROOT, "supabase", "migrations", "0029_ingredient_rows.sql")


def q(value) -> str:
    """A SQL literal."""
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return repr(value)
    return "'" + str(value).replace("'", "''") + "'"


def primary(row: dict, product_name: str, mapped_key: str | None) -> bool:
    """Does the product exist to deliver this?

    True when the ingredient is named in the product title, or when it is one of
    the first three panel rows and carries an amount. Everything else is false —
    the spec says to prefer false where the heuristic is ambiguous, because a
    wrong `true` puts a multivitamin at the top of a search for one of its
    twenty-five trace ingredients.

    A constituent of a proprietary blend is never primary: it has no amount of
    its own and the label is deliberately not saying how much is in there.
    """
    if row.get("in_blend"):
        return False
    name = product_name.lower()
    raw = normalise(row["raw_name"])
    if raw and raw in name:
        return True
    if mapped_key:
        for syn in SYNONYMS.get(mapped_key, []):
            if len(syn) >= 4 and syn in name:
                return True
    return bool(row["position"] < 3 and row.get("amount") is not None)


def main() -> int:
    with open(SRC, encoding="utf-8") as fh:
        data: dict[str, dict] = json.load(fh)

    values: list[str] = []
    stats = Counter()
    unmapped_strings: Counter = Counter()
    no_panel: list[str] = []

    for slug in sorted(data):
        rec = data[slug]
        product = rec.get("product") or ""
        kept = 0
        for row in rec["ingredients"]:
            raw = row["raw_name"]
            if normalise(raw) in PANEL_NOISE:
                stats["panel_noise"] += 1
                continue
            key = resolve(raw)
            if key is None:
                unmapped_strings[raw] += 1
                stats["unmapped"] += 1
            else:
                stats["mapped"] += 1
            is_primary = primary(row, product, key)
            stats["primary"] += int(is_primary)
            kept += 1
            values.append(
                "  ({}, {}, {}, {}, {}, {}, {})".format(
                    q(slug), q(key), q(raw), q(row.get("amount")),
                    q(row.get("unit")), q(is_primary), q(row["position"]),
                )
            )
        if kept == 0:
            no_panel.append(slug)
        stats["products"] += 1

    syn_values = [
        "  ({}, {})".format(q(key), q(syn))
        for key, syns in sorted(SYNONYMS.items())
        for syn in sorted(set(syns))
    ]

    header = f"""-- The ingredient panel for all {stats['products']} catalogue products, and the synonym
-- dictionary that makes it searchable.
--
-- GENERATED. `python scripts/build_ingredient_sql.py` from
-- `scripts/ingredients.json`, which `scripts/fetch_ingredients.py` builds by
-- calling https://api.ods.od.nih.gov/dsld/v9/label/<id> once per product. Every
-- amount and unit below is copied from the filing; none was typed by hand and
-- none was inferred. Re-run both to regenerate.
--
-- WHAT IS IN HERE. {stats['mapped'] + stats['unmapped']} rows across {stats['products']} products.
--   {stats['mapped']} carry a canonical ingredient_key
--   {stats['unmapped']} do not, and are null — see below
--   {stats['primary']} are flagged is_primary
--   {stats['panel_noise']} nutrition-facts rows (Calories, Total Fat, Protein) were dropped
--     entirely: they are real panel entries and they are not ingredients.
--
-- BLEND CONSTITUENTS ARE FLATTENED IN. A proprietary blend is one panel row
-- with its parts nested underneath. Those parts are exactly the hidden
-- ingredients the conflict rules are blind to today, so they are stored beside
-- their parent. They usually carry no amount, which is why `amount` is nullable
-- — the label genuinely does not say, and splitting the blend total across them
-- would be inventing a number the manufacturer withheld. The blend heading
-- itself is kept as a row with a null key, because it is what the label prints.
--
-- WHAT IS DELIBERATELY NULL. A null ingredient_key means "this string could not
-- be mapped to a canonical ingredient with confidence". Those rows stay
-- searchable by raw_name and never participate in a conflict rule. Guessing
-- would be worse: a rule firing on a misread ingredient moves someone's
-- schedule for a reason that does not exist.
--
-- ORDER. Requires 0028 for the tables, and the catalogue migrations for the
-- products themselves. Products absent from this database are skipped by the
-- join rather than failing — apply 0021 first for the full {stats['products']}.

"""

    body = [
        header,
        "insert into public.ingredient_synonym (ingredient_key, synonym) values",
        ",\n".join(syn_values),
        "on conflict (synonym) do update set ingredient_key = excluded.ingredient_key;",
        "",
        "insert into public.glossary_ingredient",
        "  (glossary_id, ingredient_key, raw_name, amount, unit, is_primary, position)",
        "select g.id, v.ingredient_key, v.raw_name, v.amount, v.unit, v.is_primary, v.position",
        "from (values",
        ",\n".join(values),
        ") as v(slug, ingredient_key, raw_name, amount, unit, is_primary, position)",
        "join public.glossary g on g.slug = v.slug",
        # matches the unique constraint in 0028: position is what is unique
        # within a product, and a label can print the same name twice
        "on conflict (glossary_id, position) do update set",
        "  ingredient_key = excluded.ingredient_key,",
        "  raw_name = excluded.raw_name,",
        "  amount = excluded.amount,",
        "  unit = excluded.unit,",
        "  is_primary = excluded.is_primary,",
        "  position = excluded.position;",
        "",
        "do $$",
        "declare",
        "  products integer;",
        "  rows_in  integer;",
        "  keyed    integer;",
        "begin",
        "  select count(distinct glossary_id), count(*), count(ingredient_key)",
        "    into products, rows_in, keyed",
        "  from public.glossary_ingredient;",
        "  raise notice 'ingredients: % rows across % products, % carrying a key',",
        "    rows_in, products, keyed;",
        "end $$;",
        "",
    ]

    with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(body))

    print(f"wrote {os.path.relpath(OUT, ROOT)}")
    print(f"  products          : {stats['products']}")
    print(f"  ingredient rows   : {stats['mapped'] + stats['unmapped']}")
    print(f"  with a key        : {stats['mapped']}")
    print(f"  unmapped (null)   : {stats['unmapped']}")
    print(f"  is_primary        : {stats['primary']}")
    print(f"  panel noise cut   : {stats['panel_noise']}")
    print(f"  synonym rows      : {len(syn_values)}")
    if no_panel:
        print(f"\n  NO USABLE PANEL ({len(no_panel)}): {', '.join(no_panel)}")
    real = [(c, n) for n, c in unmapped_strings.items()
            if normalise(n) not in BLEND_HEADINGS]
    print(f"\n  unmapped strings that are not blend headings ({len(real)}):")
    for c, n in sorted(real, reverse=True):
        print(f"    {c}  {n}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

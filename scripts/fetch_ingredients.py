"""Pull the ingredient panel for every product in the catalogue from DSLD.

Reads `scripts/label_ids.json` (slug -> DSLD label id, built from the catalogue
migrations) and writes `scripts/ingredients.json`, which
`scripts/build_ingredient_sql.py` turns into a migration.

WHY A SCRIPT AND NOT HAND-WRITTEN SQL. 250 products carry on the order of two
thousand ingredient rows between them, each with an amount and a unit that has
to match the printed panel exactly. Typing those is a guarantee of errors that
nobody would ever catch, and the whole point of the table is that a conflict
rule can trust the number in it.

    python scripts/fetch_ingredients.py            # fetch, cache, summarise
    python scripts/fetch_ingredients.py --verify   # re-check the cache

The API is public, unauthenticated and rate-limited by politeness only, so this
sleeps between calls. Responses are cached under scripts/.dsld_cache/ and the
fetch is resumable — a second run only requests what is missing.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, ".dsld_cache")
IDS = os.path.join(HERE, "label_ids.json")
OUT = os.path.join(HERE, "ingredients.json")

API = "https://api.ods.od.nih.gov/dsld/v9/label/{}"
PAUSE = 0.25


def fetch(label_id: str) -> dict | None:
    """One label, from the cache if it is there."""
    path = os.path.join(CACHE, f"{label_id}.json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    req = urllib.request.Request(
        API.format(label_id),
        headers={"Accept": "application/json", "User-Agent": "pepstack-catalogue/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as err:
        print(f"  ! {label_id}: {err}", file=sys.stderr)
        return None
    os.makedirs(CACHE, exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(body, fh)
    time.sleep(PAUSE)
    return body


def panel(record: dict) -> list[dict]:
    """The ingredient rows, flattened.

    DSLD splits a label into `ingredientRows` (the supplement facts panel, which
    carries amounts) and `otherIngredients` (capsule shell, fillers, flow
    agents). Only the first is wanted: nobody schedules around magnesium
    stearate, and treating it as an ingredient would make every capsule in the
    catalogue look like a magnesium product.
    """
    def qty(row: dict) -> tuple:
        for q in row.get("quantity") or []:
            if q.get("quantity") is not None:
                return q.get("quantity"), (q.get("unit") or "").strip() or None
        return None, None

    rows: list[dict] = []
    pos = 0
    for row in record.get("ingredientRows") or []:
        name = (row.get("name") or "").strip()
        if name:
            amount, unit = qty(row)
            rows.append(
                {
                    "raw_name": name,
                    "amount": amount,
                    "unit": unit,
                    "position": pos,
                    "in_blend": False,
                }
            )
            pos += 1

        # A proprietary blend is one panel row whose constituents hang off it as
        # nestedRows. Those constituents are the whole reason this table exists
        # -- a blend containing zinc is exactly the hidden ingredient the
        # conflict rules are blind to today -- so they are flattened in beside
        # their parent. They usually carry no amount of their own, which is
        # correct and is why amount is nullable: the label genuinely does not
        # say, and splitting the blend total across them would be inventing a
        # number the manufacturer withheld.
        for sub in row.get("nestedRows") or []:
            sub_name = (sub.get("name") or "").strip()
            if not sub_name:
                continue
            sub_amount, sub_unit = qty(sub)
            rows.append(
                {
                    "raw_name": sub_name,
                    "amount": sub_amount,
                    "unit": sub_unit,
                    "position": pos,
                    "in_blend": True,
                }
            )
            pos += 1
    return rows


def main() -> int:
    with open(IDS, encoding="utf-8") as fh:
        ids: dict[str, str] = json.load(fh)

    verify = "--verify" in sys.argv
    out: dict[str, dict] = {}
    missing: list[str] = []
    empty: list[str] = []

    for i, (slug, label_id) in enumerate(sorted(ids.items()), 1):
        record = fetch(label_id)
        if record is None:
            missing.append(slug)
            continue
        rows = panel(record)
        if not rows:
            empty.append(slug)
        out[slug] = {
            "label_id": label_id,
            "product": (record.get("fullName") or "").strip(),
            "brand": (record.get("brandName") or "").strip(),
            "serving": record.get("servingSizes") or [],
            "ingredients": rows,
        }
        if i % 25 == 0:
            print(f"  {i}/{len(ids)}")

    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=1, sort_keys=True)

    total = sum(len(v["ingredients"]) for v in out.values())
    print(f"\nproducts fetched      : {len(out)}/{len(ids)}")
    print(f"ingredient rows       : {total}")
    print(f"mean rows per product : {total / max(1, len(out)):.1f}")
    if empty:
        print(f"\nNO USABLE PANEL ({len(empty)}):")
        for s in empty:
            print(f"  {s}")
    if missing:
        print(f"\nFETCH FAILED ({len(missing)}):")
        for s in missing:
            print(f"  {s}")
    if verify:
        print("\nverify: cache re-read, no network calls made for cached labels")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

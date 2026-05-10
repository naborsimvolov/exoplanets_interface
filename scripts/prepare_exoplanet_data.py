import argparse
import json
from pathlib import Path

import pandas as pd


IMAGE_WIDTH = 16384
IMAGE_HEIGHT = 8192

POSITION_COLUMNS = [
    "pl_name",
    "hostname",
    "ra",
    "dec",
    "sy_dist",
    "sy_disterr1",
    "sy_disterr2",
]

EXTRA_COLUMNS = [
    "pl_name",
    "hostname",
    "discoverymethod",
    "disc_year",
    "pl_orbper",
    "pl_orbpererr1",
    "pl_orbpererr2",
    "pl_orbperlim",
    "pl_orbsmax",
    "pl_orbsmaxerr1",
    "pl_orbsmaxerr2",
    "pl_orbsmaxlim",
    "pl_rade",
    "pl_radeerr1",
    "pl_radeerr2",
    "pl_radelim",
    "pl_masse",
    "pl_masseerr1",
    "pl_masseerr2",
    "pl_masselim",
    "pl_dens",
    "pl_denserr1",
    "pl_denserr2",
    "pl_denslim",
    "pl_orbeccen",
    "pl_orbeccenerr1",
    "pl_orbeccenerr2",
    "pl_orbeccenlim",
    "pl_eqt",
    "pl_eqterr1",
    "pl_eqterr2",
    "pl_eqtlim",
    "pl_orbincl",
    "pl_orbinclerr1",
    "pl_orbinclerr2",
    "pl_orbincllim",
    "st_teff",
    "st_tefferr1",
    "st_tefferr2",
    "st_tefflim",
]

FIELDS_TO_INCLUDE = [
    "pl_name",
    "hostname",
    "ra",
    "dec",
    "sy_dist",
    "discoverymethod",
    "disc_year",
    "pl_orbper",
    "pl_orbsmax",
    "pl_rade",
    "pl_masse",
    "pl_dens",
    "pl_orbeccen",
    "st_teff",
]


def ra_dec_to_xy(ra: float, dec: float) -> tuple[float, float]:
    """Convert right ascension and declination to equirectangular map coordinates."""
    x = IMAGE_WIDTH - (ra / 360.0) * IMAGE_WIDTH
    y = ((90.0 - dec) / 180.0) * IMAGE_HEIGHT
    return x, y


def round_number(value):
    if pd.isna(value):
        return None

    if isinstance(value, float):
        return round(value, 6)

    return value


def row_to_planet(row: pd.Series) -> dict:
    x, y = ra_dec_to_xy(float(row["ra"]), float(row["dec"]))

    data = {}
    for field in FIELDS_TO_INCLUDE:
        if field in row and not pd.isna(row[field]):
            data[field] = round_number(row[field])

    return {
        "name": row["pl_name"],
        "x": round(x, 6),
        "y": round(y, 6),
        "data": data,
    }


def load_positions(path: Path) -> pd.DataFrame:
    return pd.read_csv(
        path,
        skiprows=51,
        names=POSITION_COLUMNS,
        comment="#",
        na_values=[""],
    )


def load_extra(path: Path) -> pd.DataFrame:
    return pd.read_csv(
        path,
        skiprows=51,
        names=EXTRA_COLUMNS,
        comment="#",
        na_values=[""],
    )


def build_planets(position_file: Path, extra_file: Path | None, limit: int) -> list[dict]:
    positions = load_positions(position_file)

    if extra_file and extra_file.exists():
        extra = load_extra(extra_file)
        merged = pd.merge(positions, extra, on=["pl_name", "hostname"], how="left")
    else:
        merged = positions

    merged["ra"] = pd.to_numeric(merged["ra"], errors="coerce")
    merged["dec"] = pd.to_numeric(merged["dec"], errors="coerce")
    merged = merged.dropna(subset=["ra", "dec"])
    merged = merged.drop_duplicates(subset=["pl_name", "hostname"])

    if limit > 0 and len(merged) > limit:
        merged = merged.sample(n=limit, random_state=42)

    return [row_to_planet(row) for _, row in merged.iterrows()]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert exoplanet CSV files into JSON for the interactive map."
    )
    parser.add_argument(
        "--positions",
        default="data/exoplanet.csv",
        help="CSV file containing planet names, host names, RA, DEC and distance.",
    )
    parser.add_argument(
        "--extra",
        default="data/unworked_extra_data.csv",
        help="Optional CSV file containing additional exoplanet fields.",
    )
    parser.add_argument(
        "--output",
        default="data/planets_1000.json",
        help="Output JSON file.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=1000,
        help="Maximum number of planets to include. Use 0 for all.",
    )

    args = parser.parse_args()

    position_file = Path(args.positions)
    extra_file = Path(args.extra) if args.extra else None
    output_file = Path(args.output)

    if not position_file.exists():
        raise FileNotFoundError(f"Position file not found: {position_file}")

    planets = build_planets(position_file, extra_file, args.limit)

    output_file.parent.mkdir(parents=True, exist_ok=True)

    with output_file.open("w", encoding="utf-8") as file:
        json.dump(planets, file, indent=2)

    print(f"Saved {len(planets)} planets to {output_file}")


if __name__ == "__main__":
    main()
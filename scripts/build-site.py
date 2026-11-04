"""Copy the static site and its runtime assets into dist/."""

from pathlib import Path
from shutil import copy2


root = Path(__file__).resolve().parents[1]
source = root / "public"
destination = root / "dist"
assets = (
    "compartment-foreground.svg",
    "compartment.webp",
    "forest-panorama.webp",
    "lamp-lit-v2.webp",
    "notebook-v2.webp",
    "trees-atlas.webp",
)

files = (
    *(path for path in sorted(source.iterdir()) if path.is_file()),
    *(source / "assets" / name for name in assets),
    *sorted((source / "assets" / "fonts").glob("*.*")),
)

for path in files:
    output = destination / path.relative_to(source)
    output.parent.mkdir(parents=True, exist_ok=True)
    copy2(path, output)

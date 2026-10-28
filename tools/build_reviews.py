#!/usr/bin/env python3
"""Rebuild untracked inspection pages from the current checked-in game and assets."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def build_reviews():
    for script in ('build_review.py', 'build_character_review.py', 'build_equipment_review.py'):
        subprocess.run([sys.executable, str(ROOT / 'tools' / script)], cwd=ROOT, check=True)


if __name__ == '__main__':
    build_reviews()

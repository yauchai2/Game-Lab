"""Compatibility entry point: current brand is Hello, Static! supplied title art."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('pack_title_screen.py')), run_name='__main__')

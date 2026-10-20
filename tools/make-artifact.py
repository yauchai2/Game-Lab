#!/usr/bin/env python3
"""把 dist/idle-hero.html 轉成 Artifact 用的頁面（去掉 doctype/html/head/body 外殼）。

用法：python3 tools/build.py && python3 tools/make-artifact.py [輸出路徑]
預設輸出 dist/idle-hero.artifact.html。
"""
import re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
src = (root / "dist" / "idle-hero.html").read_text(encoding="utf8")
body = re.search(r"<body[^>]*>(.*)</body>", src, re.S).group(1)
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / "dist" / "idle-hero.artifact.html"
out.write_text("<title>Idle Hero</title>\n" + body, encoding="utf8")
print("wrote", out)

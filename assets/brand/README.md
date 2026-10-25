# Idle Hero supplied 3D logo

Alan supplied the original GLB for use in Game Lab. No public third-party license is asserted. This directory contains the project derivative and a same-model fallback, not the 52,700,964-byte source. Exact source SHA-256 and derivative operations are in logo-3d.json. No paid asset generation was used.

Web budget: one static mesh, 15,000 triangles, two 512px WebP textures, 814,732 bytes. No skin, animation, external resources or normal map. The original texture artwork and UVs are retained through decimation and resizing. The source remains in the external asset workspace and is never overwritten.

Reproduction, from repository root with Blender, Pillow and Playwright available; use new output paths for each derivative:

```sh
blender -b -t 2 --python tools/prepare_logo_asset.py -- SOURCE.glb /tmp/logo-png.glb
python3 tools/compact_logo_glb.py /tmp/logo-png.glb /tmp/logo-web.glb
python3 tools/pack_logo_3d.py /tmp/logo-web.glb
# Serve this checkout on localhost:8808 before baking the poster.
node tools/render_logo_poster.cjs /tmp/logo-poster.png
python3 tools/pack_logo_3d.py /tmp/logo-web.glb /tmp/logo-poster.png
python3 tools/build.py
```

pack_logo_3d.py updates the embedded game asset and initial boot image. The title uses a transient Three.js renderer with an orthographic camera at 320×180, pixel ratio 1, no antialiasing and nearest-neighbor CSS enlargement; 40-second rotation, 24fps cap, reduced-motion pause, with no rotation-control button. The same-model PNG remains usable when GPU initialization fails. Leaving the title disposes renderer, texture URLs, textures, geometry and material; no title renderer runs in gameplay.

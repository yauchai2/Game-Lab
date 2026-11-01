# Twelve Death animation candidates

These GLBs reuse the canonical M01–M08 / B01–B04 project meshes and retain their original materials, geometry bytes, nodes and existing animation clips. A new parent pivot and 1.2s `Death` clip are appended, with 73 sampled rotation/ground-contact keys. No external motion capture or AI-generated model is included.

They are candidate assets, not installed in the game. `manifest.json` pins each original and output hash, collapse direction and landing time. Normal, hovering, wheeled and heavy shapes use different falls. Hover descent, fade, floor height and eventual disposal belong to the instance renderer. The original asset files and `assets/monsters/catalog.json` remain unchanged.

The existing game removes dead monsters after 0.4s; playing the clip without changing presentation ownership would cut it off. Integrate a bounded render-private corpse queue with one spawn per death, preserving kill/reward/target/collision timing. Fade only after the fall and hold, then dispose owned materials/mixer once. Do not wait for a visual corpse before awarding drops or completing a stage.

Rebuild: `python3 tools/cast-lab/build_death_assets.py`. Structural checks: `python3 tools/cast-lab/validate_assets.py`. Precise transformed-vertex ground contact and both sizes are checked by `node tools/cast-lab/test_preview.cjs`. See `docs/3d-cast-death-audio/README.md` for integration details.

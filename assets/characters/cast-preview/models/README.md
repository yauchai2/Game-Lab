# Four-person portrait pose candidates

Four separate skinned GLBs reuse the existing user-supplied meshes,16-bone skins,unlit vertex-color materials and nine native clips. They add `CastPose` (held portrait) and `CastSelect` (0.85s selected-only greeting). No character proportions, textures or original files change.

All four actors should remain in the same scene. AKI stands to the left, MILO raises a hand in the back row, PING stands at the right and NULL crouches in front. The selected actor alone crossfades to `CastSelect`, then returns to `CastPose`; keep the other three posed. The floor parent holds each posed model on the ground. Layout/steps, selection halo/sparks and renderer lifetime remain owned by the presentation.

Manifest pins source/output hashes. Generation: `capture_cast_poses.cjs` then `build_cast_pose_assets.py`; validation: `test_cast_assets.cjs` plus `validate_assets.py`. These are review candidates, not installed game assets. Use the native character/PV loader and explicit preview identity; never change a player's G.char/G.equip merely to construct a four-person cast.

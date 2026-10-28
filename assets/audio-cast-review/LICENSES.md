# Review audio provenance

The two complete candidate files are derivatives of CC0 recordings:

- `music/radio.mp3`: **After Midnight**, dant-e. https://opengameart.org/content/after-midnight
- `music/underpass.mp3`: **Strong Downtempo / Space Ranger**, Nostromo. https://opengameart.org/content/music-loop-strong-downtempo-seamless

Original bytes are pinned by commit/path and SHA-256 in manifest.json. Processing: conservative EQ and two-pass loudness mastering; no reference video/music sampled. CC0 legal text: https://creativecommons.org/publicdomain/zero/1.0/

The twelve identification excerpts are **mixed provenance**, not all CC0:

- Before `radio`: Funky Menu Loop, iamoneabe, CC0.
- Before/after `drift`, after `rush`: Wednesday Night [Funk Fusion], Zane Little Music, CC0.
- Before/after `haze`: November Snow, cynicmusic, CC0.
- Before/after `boss`: Midnight Cruiser, Zane Little Music, CC0.
- Before `underpass` and `rush`: project-original compositions, retained as identification evidence. Do not relabel as third-party or CC0.
- After `radio` and `underpass`: the two CC0 candidates above.

Per-excerpt source file, author, license and hash are in manifest.json; current production source rights are in src/audio/provenance.json and src/audio/LICENSES.md. Cue identification clips embedded in the review use existing project audio and retain their original provenance. No new external animation, paid asset or sampled reference recording is included.

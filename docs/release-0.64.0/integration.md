# v0.64.0 release preparation

2026-10-26, Asia/Hong_Kong. Alan requested a release in this conversation.

Status: prepared candidate only; NOT merged, deployed or released by this task.

Candidate: PR #84, codex/ice-cream-style-complete at dfd9ab7c74f1f06e5e132e2fdd5d60550f380676. Release preparation branch: codex/release-064. Main and latest published v0.62.0 both point to fd4ed11bdaef5b9fa419a4419f9077151b7e522e. Retain all branches and tags.

Scope: twelve creature assets mapped onto existing enemy types; four character and sixteen gear flat-color derivatives; scene materials, portraits, thumbnails, story messages and contextual licensed music. Existing six-chapter story retained. Existing validation evidence: docs/style-complete/README.md. This session read that evidence; did not rerun tests. Two baseline failures and software-WebGL limitations remain as documented there.

Fresh remote inspection via GitHub connector: open PRs #84, #83, #75, #12, #10. Claude branches 0y5wy1, afu9rh, kg811g and md2o27 are behind main with no unique commits. z3r5g1 has one documentation rename commit; excluded from game release. #75 and #83 are documentation-only and require preservation/reconciliation, not wholesale old-branch replacement. #12 is historic character work; #10 is internal backup, excluded. Candidate notes refer to 6fcaef61c1a8cdb0b0b6422ac8f5ca301cdc3b3b (0.63 crafting); commit exists, but is not a head in the freshly returned branch inventory and has no open PR. Do not claim it integrated; revisit before final publication.

Blockers: local checkout game-lab is stale codex/bright-y2k-theme, with other uncommitted work preserved. Shell git fetch fails DNS resolution; gh auth status reports invalid token. Connected GitHub tools support repository reads/writes/merges but do not expose workflow dispatch or release creation. Chrome release workflow page is logged out; login page opened for user handoff. No speculative merge was performed while publication remains blocked.

Next: restore GitHub browser login or CLI authentication; refresh heads and PRs again; reconcile applicable Claude changes; verify exact integrated build, push candidate, merge via PR, publish_pages.py from pushed source, verify live manifest and all hashes and browser startup, then dispatch existing release workflow with exact source SHA and standalone attachment. Do not move existing tags.

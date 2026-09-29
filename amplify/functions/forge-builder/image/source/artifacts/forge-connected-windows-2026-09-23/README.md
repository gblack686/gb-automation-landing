# Forge connected windows

Open `index.html` for the 13-window collection. Use the sidebar to open a full
window, or Preview to inspect its compact version. The shared Studio treatment
extends the approved File Commands direction.

Try these connected journeys:

1. **Skills → run → artifact → canvas.** The producing run and exact artifact
   version stay selected. Back restores the previous view.
2. **Second Brain → Use as context → Conversation.** The selected source appears
   in the context ribbon. Chat drafts survive window and style changes.
3. **Configuration → Save review draft → Changes & Approvals.** Edit the scan cap
   or window, then review the exact diff. The source configuration stays intact.
4. **Approve demo brief → Tasks → Artifacts.** The selected output's review state
   updates and its blocked review task becomes ready, all within the local fixture.
5. **Run Console → Run again → Artifacts.** A successful demo run creates a linked
   output. Select Error to inspect stderr, or Stop to retain partial output.

Use the Workstream selector plus each window's local filters. Shared skill,
command, expert, and configuration catalogs remain visible across workstreams.
Data map shows the rendered connections; the `</>` inspector identifies exact
record keys, relation types, source contracts, and explicit UI-only associations.

All records are sample projections, apart from the inherited source recipe and
configuration snapshot values. Commands, messages, reviews, and changes run only
inside this browser. There is no Supabase connection, live runtime, dispatch,
authorization token, or deployment.

- `DESIGN.md`: reusable rules and the treatment of each window.
- `CONTRACT.md`: data projection, source mappings, and mutation boundaries.
- `validation/`: screenshots, browser checks, and brand validation.
- `manifest.json`: file inventory with checksums and contract provenance.

The page reuses local fonts and assets from the September 18 Forge preview and
links back to the approved standalone File Commands study. Preserve those sibling
directories when moving this artifact. No runtime packages are required to view it.

Validation from the worktree root:

```powershell
node --check artifacts/forge-connected-windows-2026-09-23/app.js
node --check artifacts/forge-connected-windows-2026-09-23/windows.js
python resources/skills/get-gbauto-theme/scripts/validate_html_theme.py artifacts/forge-connected-windows-2026-09-23/index.html
python artifacts/forge-connected-windows-2026-09-23/validation/check_suite.py
node artifacts/forge-connected-windows-2026-09-23/validation/build_manifest.mjs
```

# Theme Handoff — ship this kit to a client vault + ping their agent

> Use this when handing the brand theme kit to a client so their own agent
> (Hermes/Codex/Claude) can pull it and re-skin it for *their* brand via
> `INSTALL.md`. This copies `get-gbauto-theme/` into the client's repo,
> commits + pushes, then pings the client's agent to pull and install.

---

## Inputs

| Var | Meaning | Example |
|---|---|---|
| `CLIENT_SLUG` | client identifier | `jason-diaz` |
| `CLIENT_REPO` | local path to the client's repo/second-brain | `C:/Users/gblac/OneDrive/Desktop/gbauto/jid5274` |
| `DEST_SUBDIR` | where skills live in that repo | `skills/get-gbauto-theme` or `carlos-config/skills/get-gbauto-theme` |
| `AGENT_NAME` | client's agent to ping | `Carlos` |
| `PING_CHANNEL` | how to reach the agent | Hermes orchestrator MCP `messages_send`, or Telegram |

---

## Steps

### 1. Copy the kit into the client repo
```bash
SRC="resources/skills/get-gbauto-theme"
DEST="$CLIENT_REPO/$DEST_SUBDIR"
mkdir -p "$DEST"
# everything except this handoff doc (handoff is internal-only)
cp -r "$SRC/SKILL.md" "$SRC/INSTALL.md" "$SRC/references" "$SRC/assets" "$SRC/examples" "$DEST/"
```

### 2. Commit + push in the client repo
```bash
cd "$CLIENT_REPO"
git add "$DEST_SUBDIR"
git commit -m "feat(theme): add GBAuto brand theme kit for re-skin (INSTALL.md interview)"
git push origin <client-default-branch>
```
Record the commit SHA — the ping references it.

### 3. Ping the client's agent to pull + install
Send the agent a message instructing it to (a) `git pull`, (b) open
`<DEST_SUBDIR>/INSTALL.md`, (c) run the re-skin interview, (d) ask the human
the brand questions before changing anything.

**Message template:**
> Hey {AGENT_NAME} — a brand theme kit just landed in your repo at
> `{DEST_SUBDIR}` (commit `{SHA}`). Please `git pull`, then open
> `{DEST_SUBDIR}/INSTALL.md` and run the re-skin interview: ask {CLIENT} for
> their logo, brand colors, fonts, and 1–3 example artifacts, then rebrand the
> templates in `examples/`. Don't send anything externally until the GB
> placeholder logos are swapped. Reply when the kit is installed and reskinned.

**Channels:**
- Hermes agent → `mcp__gelby-hermes-orchestrator__messages_send` (find the agent's
  conversation via `conversations_list` / `channels_list`).
- Telegram → the client's bot/DM.

### 4. Confirm
Wait for the agent's ack, or verify the push landed:
`git -C "$CLIENT_REPO" log -1 --stat -- "$DEST_SUBDIR"`.

---

## Notes
- The handoff copies the **GBAuto-branded** kit on purpose — `INSTALL.md` is the
  step that converts it to the client's brand. Don't pre-strip the GB brand.
- Keep `THEME-HANDOFF.md` out of the client copy (step 1 omits it).
- If the client repo auto-deploys (Amplify/Netlify) on push, the kit is just
  static skill files under a skills/ dir — it won't affect their site build.

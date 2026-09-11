# @deepseek-ai/dsh-client-ui-archived-chats

A local DeepSeek Harness plugin that adds an "Archived chats" (已归档的聊天)
settings section below "Agent presets" in the Web GUI's settings dialog: a
search box over the registry-global archived-session set, rows grouped by the
Workspace each archived chat is still accounted to (folder glyph, group title,
"N chats"), and one unarchive action per row. Empty states are covered for both
"nothing archived yet" and "no search match".

## What v1 deliberately does not ship

**No delete.** The running build exposes no Session-deletion capability on the
client face: the Workspace Remote namespace answers only `create` / `rename` /
`delete` (Workspace registration) / `insertBefore` / `insertSessionBefore` /
`archiveSession` / `follow`, `ISessions` has no delete method, and
`ClientWorkspaceModel` carries none either. Deleting and "delete all" are left
out rather than faked; the red "delete all" affordance returns when the Host
grows the verb.

## Unarchive semantics (read before relying on it)

There is also **no unarchive verb** on the Host. The row action reads the
complete Host-confirmed archive set from the Workspace projection, removes one
id, and publishes the replacement through `ClientWorkspaceModel.replaceArchived`
in one synchronous block (no await between read and write, so no client-side
step can interleave; a concurrent Host `archived` increment lands afterwards
and wins). That is a **client-projection write**: the next reconnect baseline
or page reload restores the Host archive set, so an unarchived chat reappears
as archived after a reload. Durable unarchive needs a Host-side verb (the
Workspace spec already anticipates it — an archived session keeps its
`sessionIds` slot so unarchiving can restore its position).

## Install

```sh
# The file: protocol matters: a bare path installs as a link: dependency.
dsh plugin --profile web add 'file:/absolute/path/to/plugins/archived-chats'
```

Then add the row to the profile's `cordis.patch.yml` (inside the existing
`- insert:` list):

```yaml
- insert:
    - id: ui-archived-chats
      name: '@deepseek-ai/dsh-client-ui-archived-chats'
```

## How it registers

- **Section**: `ctx.slots.inject('settings.section', () =>
  ctx.slots.register({ name: 'settings.section', id: 'archived-chats',
  order: 30, label: () => ctx.locale.bind(NS)('nav'), locale: NS, inject },
  ArchivedChatsSection))`. The settings shell projects
  `entries('settings.section')` into nav rows sorted by ascending `order`;
  shipped sections sit at general 0, models 10, plugins 15, agent-presets 20 —
  30 lands below Agent presets. The nav glyph for unknown ids falls back to the
  shell's settings-gear icon (the icon map is shell-owned, not extensible by a
  plugin).
- **Data**: `useWorkspaces` supplies `archivedSessionIds` and the Workspace
  rows (an archived session keeps its `sessionIds` slot, so grouping by the
  containing Workspace is exact); `useSessions` supplies `displayTitle` and
  `updatedAt`. Both feeds must be past their first baseline pull before the
  page renders, so the empty state never paints from absent data.
- **Locale**: the `archivedChats` dictionary (zh/en); the active locale id is
  read through the inject `hooks` compartment (`ctx.locale` is a bare
  observable the renderer binds as `useLocale`) and seeds the Intl long-date
  formatter; hour/minute render as a local `h:mm` clock joined by the
  dictionary separator. Internal matching uses ids, never copy.

## Files

- `lib/index.js` — host cordis plugin: empty apply, same split as
  ui-open-in-app (pure UI plugin).
- `lib/client.js` — hand-written browser bundle (module-table factory, React
  via the platform seed, no build step); inline styles over `--dsw-*` semantic
  tokens only.

## Known limitations

- Unarchive does not persist across reloads (see above).
- Archived chats whose Session row the list feed excludes (breadcrumb-only
  subagent rows) are skipped rather than rendered id-only.
- The two filter dropdowns of the reference design ("all chats", "all
  projects") are simplified away per the brief: search plus Workspace grouping
  covers v1.

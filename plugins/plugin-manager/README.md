# @deepseek-ai/dsh-client-ui-plugin-manager

**描述**：Web 设置 → 插件 区的「我的插件」栏目：列出补丁层挂载的本地插件与工作区发现但未挂载的插件项目，提供启用/禁用（写 `cordis.patch.yml` 触发热重载）、打开插件文件夹、安装（pnpm + 补丁层挂载）三类轻管理操作。

## Summary

The **My plugins** tab adds lightweight management for self-made dsh plugins to the Plugins settings section. It lists every plugin the user's patch layer mounts plus local plugin projects discovered in configured source directories (folders whose `package.json` carries a `dsh` manifest field), and issues user commands over the `plugin-manager` settings namespace: toggle enablement (the host edits `cordis.patch.yml` under a validated, atomic write and the profile's live patch watcher re-applies the layer in place), open a plugin folder in the OS file manager, and install a discovered project (`pnpm add` into the profile, then a patch-layer insert row).

The host half keeps the full snapshot in the settings namespace (`listJson` plus command/result bookkeeping); the browser half renders it and adds only transient state (in-flight flags, the last result notice). All copy is locale-owned (`zh`/`en`).

## Operations

- **启用 / 禁用**: appends or removes a marked `disabled: true` patch entry (`- id: <entryId>`) in `cordis.patch.yml`. The block is written and removed by exact text, so user comments elsewhere in the file are untouched; every candidate is re-parsed with the loader's YAML grammar before an atomic rename, because an unparsable patch file fails the live reload loudly. Only rows that declare a conforming `id` are toggleable.
- **打开文件夹**: spawns the platform file manager (`open` / `explorer` / `xdg-open`, or the configured `openCommand`) shell-free. Only paths present in the current snapshot are accepted — client-supplied arbitrary paths are refused.
- **安装**: `pnpm add <folder> --dir <profileDir>` writes the dependency into the profile's `package.json`, then the host appends a top-level `insert` patch entry (`- insert: [{ id, name }]`) so the live reload mounts the plugin. Relative/absolute insert names are anchored beside the patch file by the loader itself.

## Installation (this machine)

1. `package.json` of the profile (`~/.dsh/profiles/web/package.json`) gains `"@deepseek-ai/dsh-client-ui-plugin-manager": "file:/path/to/dsh-plugins/plugins/plugin-manager"` and a `pnpm install` there.
2. `~/.dsh/profiles/web/cordis.patch.yml` gains the insert row inside the existing `- insert:` list:

   ```yaml
   # dsh plugin-manager: "My plugins" tab — list/toggle/open/install self-made plugins
   - id: ui-plugin-manager
     name: '@deepseek-ai/dsh-client-ui-plugin-manager'
     config:
       pluginSourceDirs:
         - ~/projects
   ```

3. The profile's `patchReload: "live"` applies the change in place; the tab appears under Settings → Plugins.

## Configuration

| field | default | meaning |
| --- | --- | --- |
| `profileDir` | `~/.dsh/profiles/web` | profile directory holding `cordis.patch.yml`, `package.json`, `node_modules` |
| `pluginSourceDirs` | `[]` | directories whose first-level folders are scanned for local plugin projects |
| `openCommand` | platform default | file-manager command override |
| `pnpmCommand` | `pnpm` | pnpm binary used for installs |
| `installTimeoutMinutes` | `10` | install kill timeout |

## Known limitations

- Toggling and installing rely on the profile's `patchReload: "live"`; on a `startup` profile the same edits apply at next launch.
- Install assumes the discovered folder is already a valid plugin package (built `lib/`, `dsh` manifest field); the tab surfaces pnpm or loader failures as errors rather than validating them beforehand.
- The runtime status dot correlates rows against the running Loader by insert id and module specifier; a mount whose id the row does not declare shows as "not observed" rather than guessing.

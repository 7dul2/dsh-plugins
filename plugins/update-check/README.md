# @deepseek-ai/dsh-client-ui-update-check

Web 侧边栏发现新版本时显示可点击的更新按钮；设置 → 通用设置同时提供当前版本、可用版本和“立即检查”。成功检查会清除旧的安装失败提示；失败时会保留 pnpm 的诊断摘要。非托管启动的 Harness 安装后需要手动重启，托管启动器会自动重启。

A local DeepSeek Harness plugin that keeps dsh current: the Web GUI shows a
small badge at the right edge of the sidebar footer row (above the settings
entry) **only while a newer dsh version exists**, and clicking it downloads,
installs, and restarts the harness.

Two halves, one settings channel:

- **Browser (`lib/client.js`)** — polls the npm dist-tags endpoint for the
  configured channel, compares against the running version with a
  prerelease-aware comparator (`-rc.N`, `-alpha.N`), renders the badge into the
  `sidebar.footer.action` slot, and turns clicks into one `command` write.
- **Host (`lib/index.js`)** — registers the `update-check` settings namespace,
  keeps the version facts (`currentVersion`, `availableVersion`,
  `managedLauncher`) fresh, and executes the command: `pnpm add
  @deepseek-ai/dsh@<target> --dir <runtimeDir>`, then writes the restart marker
  and exits with code 75 so the managed launcher restarts the harness.

## Install

```sh
# The file: protocol matters: a bare path installs as a link: dependency and
# the host half's bare imports (@deepseek-ai/schemastery) then fail to resolve.
dsh plugin --profile web add 'file:/absolute/path/to/plugins/update-check'
```

Then add the row to the profile's `cordis.patch.yml`:

```yaml
- insert:
    - id: ui-update-check
      name: '@deepseek-ai/dsh-client-ui-update-check'
```

## Managed launcher (enables one-click restarts)

The install only becomes a restart when dsh runs under `bin/dsh-web`, which
sets `DSH_UPDATE_MANAGED=1` and treats exit code 75 or the marker file as
"restart me". Ctrl-C (any other exit) stops the launcher.

```sh
bash bin/install-runtime.sh          # one-time: pnpm add @deepseek-ai/dsh into ~/.dsh/runtime
bin/dsh-web                          # boot; keeps the process foreground
```

Without the launcher the badge still appears and the install still runs, but
the tooltip says the session cannot self-update and no restart happens.

## Configuration

Every field has a default; invalid values fail the plugin load.

| Field | Default | Meaning |
| --- | --- | --- |
| `runtimeDir` | `~/.dsh/runtime` | Where the installer runs `pnpm add` and the launcher boots dsh from |
| `restartMarkerPath` | `~/.dsh/update-restart-requested` | Marker file consumed (and deleted) by the launcher on restart |
| `channel` | `latest` | Dist-tag compared against (`latest`, `next`, `alpha`) |
| `checkIntervalMinutes` | `360` | Host-side registry poll cadence (the browser polls per its own field) |
| `installTimeoutMinutes` | `10` | Before a hanging pnpm install is killed |
| `pnpmCommand` | `pnpm` | pnpm binary used for the install |
| `packageName` | `@deepseek-ai/dsh` | The npm package updated |

Defaults under `~/.dsh` match the default harness home; deployments that set
`DSH_HOME` elsewhere must configure `runtimeDir` and `restartMarkerPath`
explicitly.

The `update-check` settings namespace carries the state shared with the
browser: the facts above, the user-set `channel` and `clientCheckMinutes`, the
one-shot `command` (`<nonce>|<version>`), host bookkeeping (`processedNonce`).
Transient install state (`installState`, `installError`, `installOutput`)
lives there too so a failed install stays visible after the page reloads.

## Files

- `lib/index.js` — host cordis plugin (`name` / `inject` / `Config` / `apply`).
- `lib/client.js` — hand-written browser bundle (module-table factory, React
  via the platform seed, no build step).
- `lib/version.js` — the version comparator; the client bundle carries a
  byte-identical twin (keep in sync).
- `bin/dsh-web` — managed launcher (restart loop over exit 75 / marker).
- `bin/install-runtime.sh` — prepares `~/.dsh/runtime` for the launcher.

### 更新按钮

发现新版本时，侧边栏底部会显示可点击的“更新”按钮。按钮位于设置入口上方；展开侧边栏时显示版本号，收起时保留可点击的状态点。非托管启动也可以安装更新，但安装完成后需要手动重启 Harness；只有 `bin/dsh-web` 托管启动器会自动重启。

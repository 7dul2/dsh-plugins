# DSH Plugins

DeepSeek Harness 社区插件合集：一个仓库，每个插件独立安装与启用。非 DeepSeek 官方项目，MIT 开源。

## 插件列表

| 名称 | 功能 |
| --- | --- |
| `model-retry` | 在通用设置修改模型请求重试次数 |
| `plugin-dev` | `/plugin-dev` 加载 DSH 插件开发教程，可附带需求 |
| `plugin-manager` | 查看、安装和启用/禁用本地插件 |
| `archived-chats` | 查看与恢复已归档的会话 |
| `cost-analytics` | 查看请求、token 用量和估算费用 |
| `update-check` | 检查 Harness 更新；附带可选托管启动脚本 |

## 安装

先安装并运行过 DeepSeek Harness，准备 Node.js（22.19+，建议使用 Harness 支持的版本）、Git 和 pnpm。插件主要适配 Harness `0.1.5-rc.1`，其他版本尚未全面验证。

首次安装一个插件，只需一条命令（macOS/Linux shell）：

```sh
git clone https://github.com/7dul2/dsh-plugins.git && cd dsh-plugins && npm install --ignore-scripts && node scripts/install.mjs model-retry
```

克隆后安装其他插件：

```sh
node scripts/install.mjs plugin-dev
node scripts/install.mjs all
```

默认安装到 `$DSH_HOME/profiles/web`，DSH_HOME 未设置时使用 `~/.dsh/profiles/web`。自定义 profile：

```sh
node scripts/install.mjs plugin-dev --profile /absolute/path/to/profile
```

安装器安装依赖、校验 YAML、备份并添加挂载条目。重复执行不会重复挂载；遇到同名插件的不同 id 会停止，避免覆盖用户配置。若依赖安装成功而配置发生并发修改，安装器停止挂载并提示重试。安装锁文件在异常进程退出后可能残留，确认没有安装进程后再删除。

刷新 Web 页面，未开启 live reload 的 profile 需要重启 Harness。不要删除克隆目录，`file:` 依赖与后续更新使用它。安装全部也会启用管理、费用汇总和更新检查功能，通常建议只装需要的插件。更新检查插件不会因为安装器安装它而自动运行附带的 runtime 安装或启动脚本。

## 更新与开发

运行 `git pull --ff-only`，然后重新执行相应安装命令。正在使用插件时，协调好会话再重启。各插件的 `lib/*.js` 是本地插件现有的可编辑入口，浏览器文件使用 Harness lazy factory 格式；本仓库不把它们假定为可随意替换的普通 ES module。

根目录 `npm test` 验证安装器补丁合并，`npm run scan` 检查常见凭证模式和个人路径。插件 tests 是保留的行为验证，运行前需要补齐与 Harness 同版本的依赖；其中 model-retry 的运行时测试还依赖本地 Harness runtime 安装布局。不能把根目录测试通过理解为六个插件的端到端测试全部通过。

## 隐私与授权

仓库只存插件代码、说明和测试，不包含用户 profile、密钥、会话历史、.env 或 node_modules。不要把真实配置提交为示例。公开前的模式扫描不能保证发现所有秘密；贡献者仍应检查暂存区。

插件会在本机以 Harness 的权限运行。插件管理器可以修改 profile 并安装本地软件；费用分析读取本机会话；更新检查访问版本服务。使用前查看相应插件说明。凭证问题请通过 GitHub 私下报告功能联系维护者，不要在公开 Issue 中粘贴密钥。

许可证见 [LICENSE](LICENSE)，上游归属见 [NOTICE](NOTICE)。

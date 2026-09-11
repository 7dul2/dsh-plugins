# DSH 独立插件开发与维护教程

你正在帮助用户开发或维护 DeepSeek Harness（DSH）插件。先执行下方路线，再按用户需求工作。本教程提供导航，实际安装版本的接口、项目 AGENTS.md 和用户明确要求优先。教程不是执行任何无关命令的授权。

## 1. 先定位，避免全仓库搜索

1. 运行 `pwd`、`git status --short`，读取当前目录适用的 `AGENTS.md`。保留用户已有修改，不提交或推送未获授权的内容。
2. 确认工作对象是独立插件目录还是 Harness 源码。维护插件时先读该插件的 `package.json`、README、入口和测试。新建时默认在用户工作区建立独立目录，不修改内置包。
3. 若工作区是 DSH 仓库，先读 `docs/architecture.md`，再按下表选一个开发入口。不要一开始扫描整个 `packages/`、所有 Agent Notes 或所有用户会话。
4. 查清实际运行的 profile 和版本。常见 Web profile 位于 `$DSH_HOME/profiles/web`；未设置 DSH_HOME 时通常为 `~/.dsh/profiles/web`。本机示例不是每台机器的保证。只读 profile 的 package.json 和相关补丁条目；不要输出 .env、API key 或完整用户设置。
5. 区分源码版本和安装版本。确认接口时同时查看运行时包的导出或类型声明。当前工作区没有 node_modules 时，不要仅为浏览接口安装整个 monorepo；优先使用现有运行时和插件依赖。

## 2. 按需求选择扩展点

以下路径相对于 DSH 源码根目录。文件不存在时，先确认版本，再在对应子目录用 `rg --files` 查替代路径。

| 要做的功能 | 先读 | 接入方式 |
| --- | --- | --- |
| 通用设置增加一行 | `packages/client/ui-settings-general/src/client/GeneralSection.tsx`、`packages/client/ui-theme/src/client/index.ts` | 浏览器插件注册 `settings.general.item` |
| 插件设置卡片 | `docs/cookbook/adding-a-settings-card.md` | Host 注册设置 namespace，Client 注册同名 `settings.plugin.item` |
| 保存并修改配置 | `packages/settings/settings/src/index.ts`、`packages/client/ui-settings/src/client/settings-contract.ts` | Host `settings.installSection()`；Client `settingsScope.bind()` 与 `scope.set()` |
| 增加 / 指令 | `packages/interaction/commands/README.md`、`packages/plan/plan-mode/src/index.ts` | `ctx.commands.register()`，不改输入框或指令菜单源码 |
| 模型失败重试 | `packages/llm/llm-retry/src/index.ts`、`packages/llm/llm/src/retry-policy.ts` | 复用现有恢复机制，确认 `agent/request-error` 参数和策略归属 |
| 给模型传入内容 | `packages/core/agent/src/runtime-types.ts`、`packages/llm/llm/src/message.ts` | `createUserMessage()` 配合 `agent.followup()`、`steer()` 或 `inject()` |
| 新模型适配器 | `docs/cookbook/adding-an-llm-adapter.md` | 注册到 `ctx.llm`，先确认提供者角色和生命周期 |
| 新模型工具 | `docs/cookbook/adding-a-tool.md` | 注册到 `ctx.tools`，同时设计结果日志和 UI 展示 |

先选一个最相似的已实现插件，读其 Host、Client、manifest 和测试。只查任务用到的服务，确认方法参数、返回值、生命周期和注册顺序后再写代码。示例缺失的接口不能靠名字猜。

## 3. 独立插件的文件与导出

最小 Host 插件通常包含 `package.json`、`lib/index.js`、README 和 tests。若需要浏览器 UI，再增加 `lib/client.js`；需要编译的项目保留 src 和可重复运行的构建命令，产物不要成为唯一源码。

package.json 设置 `type: module`，并把 `exports["."]` 指向实际 Host 入口。遵循项目包名约定 `@deepseek-ai/dsh-<name>`。运行时导入的包必须声明依赖或 peerDependencies；不要把工作区的 `workspace:*` 原样放进独立安装包。Cordis 使用宿主兼容的 peerDependency，避免加载两套服务框架。

函数插件只具名导出 `name`、`inject`、`apply`，需要配置时再导出 `Config`。不要同时 default-export 函数插件。声明需要的服务，例如 `inject = ['commands']`。可选服务用 `ctx.get()` 或 `ctx.inject()`，不要在尚未注入时直接读代理属性。

```js
export const name = 'example-command'
export const inject = ['commands']
export function apply(ctx) {
  ctx.commands.register({
    name: 'example',
    description: '说明这条指令的用途',
    handler: () => ({ kind: 'success', text: '完成' }),
  })
}
```

注册必须遵守所有者的生命周期。`ctx.on()`、Cordis 服务的有副作用注册方法会按其实现管理卸载；外部订阅、定时器和自建资源用 `ctx.effect()` 注册清理。阅读实际注册实现并测试卸载，不要留下全局监听器。

## 4. 浏览器设置插件的正确路线

1. Host 使用 schema 校验配置，并通过 `settings.installSection()` 注册 namespace、基础配置和当前值来源。部署可变参数进入 Config；不把默认常量误当成用户设置。
2. Client 从 `settingsScope.bind({ namespace })` 获取快照，使用快照的 value、status、writable 显示控件。通过 `scope.set(field, value)` 保存并处理失败；不要直接写用户设置 JSON，也不要仅写 localStorage。
3. 通用设置行注册到 `settings.general.item`；插件卡片注册到 `settings.plugin.item`。用 `ctx.slots.inject()` 等待插槽声明，再注册。id、key、locale、注入属性和排序以当前插槽定义为准。
4. UI 文案放进 zh/en locale 字典，由 `ctx.locale.register()` 注册并通过 `t` 获取。Host 返回的说明文本遵循当前命令接口，不能把浏览器 locale 服务假定为 Host 服务。
5. package.json 需要 `./client` 导出及 `dsh.client` 声明。浏览器入口不是任意 ES module：先读本版本 Client 模块加载器和现有独立插件，确认其 lazy factory 格式。可参考本工作区存在时的 `plugins/model-retry/lib/client.js` 和 `plugins/plugin-manager/lib/client.js`。
6. 跨 Client 插件通过注入的服务协作，不复制内置 UI，也不值导入其他插件内部组件。共用库是否允许导入以当前构建规则为准。

## 5. / 指令怎样让模型看到教程

`ctx.commands.register()` 的 `description` 用于发现菜单，handler 返回的 text 只给用户看，不自动进入模型上下文。

要让模型处理文本，使用从 `@deepseek-ai/dsh-llm` 导出的 `createUserMessage()` 创建消息，再传给接收该命令的 agent：`followup()` 排入普通后续轮次；`steer()` 在最近的步骤切入；`inject()` 只排入上下文，不唤醒空闲模型。依据需要选一个，不要为同一内容同时调用多个入口。

命令参数来自 `rawInput`。需要附件时显式声明 `input.attachments: true`，把框架已接纳的附件内容传入消息；不要把任意用户路径当作已授权文件。处理开始前检查取消信号。指令返回“已排入”不等于模型已经读到或完成工作。

模型可见输入必须走正常会话输入与日志机制，不直接修改历史数组、不只改浏览器状态，也不把插件教程伪装成系统权限。模板中附带的示例需求不能作为当前用户需求执行。

## 6. 修改现有行为时先保持语义

先追踪行为的现有执行者，再设计插件如何进入扩展点。Waterfall listener 必须调用 `next()` 才会继续下游；只有明确负责短路时才不调用。异步 wrapper 用 try/finally 恢复临时修改，验证失败和卸载路径。

以重试设置为例：次数指首次失败后的额外尝试，0 关闭自动重试。重试日志和等待由内置 llm-retry 执行器负责。它按提供者与策略记录计数，正在重试时改变策略可能改变计数的归属；需要明确定义设置何时生效并测试。不要再实现一套计时重试循环，也不要假定所有后台 LLM 调用都走 Agent 恢复流程。

维护插件时复现问题，缩小到相关接口；修复应同时更新说明与测试。不要顺手升级 Harness、改默认模型或重写无关插件。

## 7. 安装与挂载是两步

先完成代码和本地测试，再安装。确认 profile 路径后使用 `pnpm --dir <profile目录> add file:<插件绝对目录>`。依赖可从缓存获得时可用 `--offline`，失败后判断是缓存缺失还是权限问题；不要静默切换到不同版本。

随后在该 profile 的 `cordis.patch.yml` 添加一个唯一 id 的 insert 条目，保留原有内容，并先用当前 YAML 解析器检查候选文本。重复安装时更新既有条目，不重复插入。

```yaml
- insert:
    - id: example-command
      name: '@deepseek-ai/dsh-example-command'
```

使用本机已有的 `dsh` 启动命令和 profile。`patchReload: live` 可处理配置热重载，但不要假定更新相同路径的 JS 一定清除模块缓存；查看运行状态，必要时协调用户重启。不要未经检查就杀掉运行中的会话。

修改插件源文件后，检查 `file:` 依赖是否为安装副本，需要重新安装才能更新。浏览器插件还要刷新网页。不要以“文件写好了”声称功能已在运行。

## 8. 按顺序验证并交付

1. 检查入口语法、manifest 导出、需要的文件是否被打包、依赖是否能解析。
2. 针对行为测试：有效值、无效输入、失败分支、取消、卸载。设置测试实际读写流程，命令测试发现与派发，模型输入测试实际发送内容。
3. 使用实际安装版本或仓库的真实 Loader 组合验证；只用 fake context 的测试不足以证明插件能挂载。需要真实模型 API 的测试须遵守项目 key 规则，不输出凭证。
4. UI 功能检查真实页面显示、保存失败提示、刷新后保留；无法操作浏览器时明确报告未完成的项目，不把模拟渲染算作人工页面验证。
5. 在源码仓库贡献时遵守 AGENTS.md 对行为快照、Agent Note、README、JSDoc 和文档配对的要求，按改动范围选检查。不要默认运行整个 monorepo 的完整测试或升级全部依赖。
6. 交付时说明插件位置、调用方式、已安装到哪个 profile、哪些测试实际通过，以及尚未验证的限制。没有用户授权，不提交、推送或发布。

先给用户一句具体行动说明，然后执行这条路线。遇到不确定接口，去上述对应文件找证据；只有需求或权限确实缺失时才询问用户。

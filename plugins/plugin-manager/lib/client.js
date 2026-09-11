window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-plugin-manager",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		/**
		 * Browser half of the plugin-manager plugin: one "My plugins" tab in the
		 * Plugins settings section. It renders the host-built snapshot (patch-layer
		 * mounts plus discovered local plugin projects) and issues commands by
		 * writing `${nonce}|${verb}|${arg}` on the `plugin-manager` settings
		 * namespace; the host half owns everything after that.
		 *
		 * Transient state (in-flight flags, revealed install output) lives in this
		 * browser-local store; every durable field crosses the settings namespace,
		 * whose schema is owned by the host half.
		 */
		const NS = "ui-plugin-manager";
		const SETTINGS_NAMESPACE = "plugin-manager";
		/** The host appends install output after the first newline of the error. */
		const zh = {
			tab: "我的插件",
			mountedGroup: "已挂载（补丁层）",
			discoveredGroup: "工作区发现（未挂载）",
			mountedEmpty: "补丁层还没有挂载本地插件",
			discoveredEmpty: "工作区没有发现新的本地插件项目",
			loading: "正在读取插件列表…",
			loadFailed: "插件列表读取失败，点击重试",
			version: "版本",
			statusActive: "运行中",
			statusFailed: "加载失败",
			statusTransition: "状态切换中",
			statusDisabled: "已禁用",
			enableAction: "启用",
			disableAction: "禁用",
			openAction: "打开文件夹",
			installAction: "安装",
			installedTag: "已安装依赖",
			notInstalledTag: "依赖未安装",
			confirmDisable: "禁用后补丁层会热重载，插件的会话内状态将丢失。",
			confirmEnable: "启用后补丁层会热重载并挂载该插件。",
			busy: "正在执行…",
			doneNotice: "完成",
			openUnavailable: "当前环境无法打开文件夹",
		};
		const en = {
			tab: "My plugins",
			mountedGroup: "Mounted (patch layer)",
			discoveredGroup: "Discovered in workspace (not mounted)",
			mountedEmpty: "The patch layer mounts no local plugins yet",
			discoveredEmpty: "No new local plugin projects were found in the workspace",
			loading: "Reading the plugin list…",
			loadFailed: "Reading the plugin list failed — click to retry",
			version: "Version",
			statusActive: "Active",
			statusFailed: "Load failed",
			statusTransition: "Transitioning",
			statusDisabled: "Disabled",
			enableAction: "Enable",
			disableAction: "Disable",
			openAction: "Open folder",
			installAction: "Install",
			installedTag: "Dependency installed",
			notInstalledTag: "Dependency not installed",
			confirmDisable: "Disabling hot-reloads the patch layer; in-session plugin state is lost.",
			confirmEnable: "Enabling hot-reloads the patch layer and mounts the plugin.",
			busy: "Working…",
			doneNotice: "Done",
			openUnavailable: "This environment cannot open a folder",
		};
		function newNonce() {
			const cryptoRef = globalThis.crypto;
			if (cryptoRef !== undefined && typeof cryptoRef.randomUUID === "function") return cryptoRef.randomUUID();
			return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
		}
		/**
		 * Browser-local store over the command lifecycle. The settings scope stays
		 * the only durable source; this store adds the in-flight flag and the
		 * transient notice, and exposes the useSyncExternalStore face the tab
		 * renders from.
		 * @param scope - the bound `plugin-manager` settings scope.
		 */
		function createManagerController(scope) {
			let state = { busy: false, notice: undefined, error: undefined };
			const listeners = new Set();
			const emit = () => {
				for (const listener of listeners) listener();
			};
			const setState = (patch) => {
				state = { ...state, ...patch };
				emit();
			};
			/** Newest snapshot value of the settings section, or undefined while absent. */
			function sectionValue() {
				const snapshot = scope.getSnapshot();
				return snapshot.value;
			}
			/**
			 * Issue one command and drive the transient lifecycle until the host's
			 * result fields land. The nonce makes replays no-ops host-side.
			 * @param verb - one of refresh/toggle/open/install.
			 * @param arg - command argument ('' for refresh).
			 */
			async function command(verb, arg) {
				if (state.busy) return;
				const nonce = newNonce();
				setState({ busy: true, notice: undefined, error: undefined });
				try {
					await scope.set("command", `${nonce}|${verb}|${arg}`);
				} catch (error) {
					setState({ busy: false, error: error instanceof Error ? error.message : String(error) });
					return;
				}
				// The host writes `busy: false` plus the result fields when the
				// command settles; a timeout keeps the UI recoverable if the write
				// is lost entirely.
				const deadline = Date.now() + 120000;
				const poll = setInterval(() => {
					const value = sectionValue();
					if (value === undefined) return;
					if (value.processedNonce === nonce && value.busy === false) {
						clearInterval(poll);
						setState({
							busy: false,
							notice: value.lastNotice === "" ? undefined : value.lastNotice,
							error: value.lastError === "" ? undefined : value.lastError,
						});
						return;
					}
					if (Date.now() > deadline) {
						clearInterval(poll);
						setState({ busy: false, error: "the host did not acknowledge the command" });
					}
				}, 500);
			}
			const disposeScope = scope.subscribe(() => {
				const value = sectionValue();
				if (value !== undefined && value.busy !== state.busy && !state.busy) setState({ busy: value.busy });
			});
			return {
				subscribe: (listener) => {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				getSnapshot: () => state,
				/** Current settings-section value, or undefined before the first read. */
				value: () => {
					const snapshot = scope.getSnapshot();
					return snapshot.value;
				},
				command,
				dispose: () => {
					disposeScope();
				},
			};
		}
		const listStyle = { display: "flex", flexDirection: "column", gap: 16, minWidth: 0 };
		const groupStyle = { display: "flex", flexDirection: "column", gap: 8 };
		const groupHeadStyle = { margin: 0, fontSize: 12, fontWeight: 600, color: "var(--dsw-alias-label-tertiary)" };
		const cardStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 6,
			padding: "12px 16px",
			border: "1px solid var(--dsw-alias-border-l3)",
			borderRadius: 12,
			background: "var(--dsw-alias-bg-base)",
		};
		const cardHeadStyle = { display: "flex", alignItems: "center", gap: 8, minWidth: 0 };
		const titleStyle = { margin: 0, fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
		const descStyle = { margin: 0, fontSize: 12, lineHeight: "18px", color: "var(--dsw-alias-label-secondary)" };
		const metaStyle = { margin: 0, fontSize: 11, lineHeight: "16px", color: "var(--dsw-alias-label-tertiary)", wordBreak: "break-all" };
		const actionRowStyle = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 };
		const buttonStyle = {
			padding: "4px 12px",
			fontSize: 12,
			lineHeight: "18px",
			color: "var(--dsw-alias-label-secondary)",
			background: "transparent",
			border: "1px solid var(--dsw-alias-border-l3)",
			borderRadius: 8,
			cursor: "pointer",
		};
		const primaryButtonStyle = { ...buttonStyle, color: "var(--dsw-alias-label-primary)", borderColor: "var(--dsw-alias-border-l2)" };
		const tagStyle = {
			flex: "none",
			padding: "1px 8px",
			fontSize: 11,
			lineHeight: "16px",
			borderRadius: 999,
			border: "1px solid var(--dsw-alias-border-l4)",
			color: "var(--dsw-alias-label-tertiary)",
		};
		const dotStyle = (color) => ({ width: 8, height: 8, borderRadius: 999, background: color, flex: "none" });
		const statusStyle = { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, lineHeight: "16px", color: "var(--dsw-alias-label-tertiary)" };
		const emptyStyle = { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "32px 0", textAlign: "center" };
		const emptyTitleStyle = { margin: 0, fontSize: 13, fontWeight: 500, color: "var(--dsw-alias-label-secondary)" };
		const emptyHintStyle = { margin: 0, fontSize: 12, color: "var(--dsw-alias-label-tertiary)" };
		/** Human fiber phase for one row, localized. @param row - snapshot row. @param t - translate. */
		function statusLabel(row, t) {
			if (row.disabled) return t("statusDisabled");
			if (row.fiberPhase === "active") return t("statusActive");
			if (row.fiberPhase === "failed") return t("statusFailed");
			if (row.fiberPhase !== null) return t("statusTransition");
			return null;
		}
		const PHASE_COLOR = {
			pending: "var(--dsw-static-amber-500)",
			loading: "var(--dsw-static-amber-500)",
			active: "var(--dsw-static-green-500)",
			failed: "var(--dsw-static-red-500)",
			unloading: "var(--dsw-static-amber-500)",
		};
		/**
		 * Fallback copy for rows whose package cannot carry author metadata
		 * (single-file mounts with no `package.json`). Author-declared
		 * `displayName`/`displayDescription` always win over these; the
		 * English face falls back to the package's own npm fields.
		 */
		const FALLBACK_META = {
			"custom-favicon": {
				name: "浏览器标签图标",
				description: "以 /favicon.svg 提供 favicon.png 的自定义图标插件",
			},
		};
		/** Resolve one row's shown name: author metadata, else the fallback table, else the derived title. */
		function rowName(row) {
			if (row.displayName !== undefined && row.displayName !== "") return row.displayName;
			const fallback = FALLBACK_META[row.id] ?? FALLBACK_META[row.packageName];
			return fallback !== undefined ? fallback.name : row.title;
		}
		/** Resolve one row's shown description: author metadata, else the fallback table, else the package description. */
		function rowIntro(row) {
			if (row.displayDescription !== undefined && row.displayDescription !== "") return row.displayDescription;
			const fallback = FALLBACK_META[row.id] ?? FALLBACK_META[row.packageName];
			return fallback !== undefined ? fallback.description : row.description;
		}
		/**
		 * One plugin card: identity, state dot, and the actions the row allows.
		 * @param props - row, the translate seat, and the injected command callback.
		 */
		function PluginCard(props) {
			const { row, t, command } = props;
			const status = statusLabel(row, t);
			const name = rowName(row);
			const intro = rowIntro(row);
			const dotColor = row.disabled
				? "var(--dsw-alias-label-tertiary)"
				: row.fiberPhase !== null && PHASE_COLOR[row.fiberPhase] !== undefined
				? PHASE_COLOR[row.fiberPhase]
				: null;
			return react.createElement("div", { style: cardStyle },
				react.createElement("div", { style: cardHeadStyle },
					react.createElement("h4", { style: titleStyle, title: row.title }, name),
					row.version !== "" ? react.createElement("span", { style: tagStyle }, `${t("version")} ${row.version}`) : null,
					row.disabled ? react.createElement("span", { style: tagStyle }, t("statusDisabled")) : null,
					!row.mounted && row.installed ? react.createElement("span", { style: tagStyle }, t("installedTag")) : null,
					!row.mounted && !row.installed ? react.createElement("span", { style: tagStyle }, t("notInstalledTag")) : null,
					status !== null && !row.disabled
						? react.createElement("span", { style: statusStyle },
							dotColor !== null ? react.createElement("span", { style: dotStyle(dotColor), "aria-hidden": true }) : null,
							status,
						)
						: null,
				),
				intro !== "" ? react.createElement("p", { style: descStyle }, intro) : null,
				react.createElement("p", { style: metaStyle }, row.path),
				react.createElement("div", { style: actionRowStyle },
					row.canToggle
						? react.createElement("button", {
							type: "button",
							style: row.disabled ? primaryButtonStyle : buttonStyle,
							title: row.disabled ? t("confirmEnable") : t("confirmDisable"),
							onClick: () => { void command("toggle", row.id); },
						}, row.disabled ? t("enableAction") : t("disableAction"))
						: null,
					row.canOpen
						? react.createElement("button", {
							type: "button",
							style: buttonStyle,
							onClick: () => { void command("open", row.path); },
						}, t("openAction"))
						: null,
					row.canInstall
						? react.createElement("button", {
							type: "button",
							style: primaryButtonStyle,
							onClick: () => { void command("install", row.path); },
						}, t("installAction"))
						: null,
				),
			);
		}
		/**
		 * The My-plugins tab page. Local state is none; the snapshot list arrives
		 * through the injected reader, and every action rides the injected command
		 * callback over the settings namespace.
		 * @param props - the locale seat, the `t` seat, and the injected face.
		 */
		function PluginManagerTab(props) {
			const { t, controller, readList } = props;
			const controllerState = react.useSyncExternalStore(controller.subscribe, controller.getSnapshot);
			const [rows, setRows] = react.useState(undefined);
			const [failed, setFailed] = react.useState(false);
			const [loadNonce, setLoadNonce] = react.useState(0);
			react.useEffect(() => {
				let cancelled = false;
				setFailed(false);
				readList()
					.then((list) => {
						if (!cancelled) setRows(list);
					})
					.catch(() => {
						if (!cancelled) setFailed(true);
					});
				return () => {
					cancelled = true;
				};
			}, [readList, loadNonce, controllerState.notice, controllerState.error]);
			if (rows === undefined) {
				return react.createElement("div", { style: listStyle },
					react.createElement("p", { style: emptyHintStyle }, failed ? t("loadFailed") : t("loading")),
				);
			}
			const mounted = rows.filter((row) => row.mounted);
			const discovered = rows.filter((row) => !row.mounted);
			return react.createElement("div", { style: listStyle },
				react.createElement("section", { style: groupStyle },
					react.createElement("h3", { style: groupHeadStyle }, t("mountedGroup")),
					mounted.length === 0
						? react.createElement("p", { style: emptyHintStyle }, t("mountedEmpty"))
						: mounted.map((row) => react.createElement(PluginCard, { key: row.key, row, t, command: controller.command })),
				),
				react.createElement("section", { style: groupStyle },
					react.createElement("h3", { style: groupHeadStyle }, t("discoveredGroup")),
					discovered.length === 0
						? react.createElement("p", { style: emptyHintStyle }, t("discoveredEmpty"))
						: discovered.map((row) => react.createElement(PluginCard, { key: row.key, row, t, command: controller.command })),
				),
				controllerState.busy
					? react.createElement("p", { style: statusStyle }, t("busy"))
					: null,
				controllerState.notice !== undefined
					? react.createElement("p", { style: statusStyle }, `${t("doneNotice")} — ${controllerState.notice}`)
					: null,
				controllerState.error !== undefined
					? react.createElement("p", { style: { ...statusStyle, color: "var(--dsw-static-red-500)" } }, controllerState.error)
					: null,
			);
		}
		/**
		 * Client plugin body: register the dictionaries and the Plugins-section tab
		 * once the section owner's `settings.plugins.tab` declaration is live.
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "ui-plugin-manager: dictionaries");
			let controller;
			ctx.effect(() => {
				const scope = ctx.settingsScope.bind({ namespace: SETTINGS_NAMESPACE });
				controller = createManagerController(scope);
				return () => {
					controller.dispose();
				};
			}, "ui-plugin-manager: controller");
			/** Parse the host's snapshot JSON; a bad body reads as a failed load. */
			const readList = async () => {
				const value = controller.value();
				if (value === undefined || typeof value.listJson !== "string" || value.listJson === "") return [];
				const parsed = JSON.parse(value.listJson);
				if (!Array.isArray(parsed)) throw new Error("plugin-manager snapshot is not a list");
				return parsed;
			};
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("settings.plugins.tab", () => ctx.slots.register({
				name: "settings.plugins.tab",
				id: "my-plugins",
				order: 20,
				label: () => t("tab"),
				locale: NS,
				inject: () => ({ controller, readList }),
			}, PluginManagerTab));
		}
		/**
		 * Required services: slots for the tab registration, locale for the
		 * dictionaries, and the settings scope the command channel binds through.
		 */
		const inject = ["slots", "locale", "settingsScope"];
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

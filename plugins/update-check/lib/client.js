window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-update-check",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		/**
		 * Browser half of the update-check plugin: poll the npm dist-tags endpoint
		 * for the configured channel, show a badge in the `sidebar.footer.action`
		 * slot only while a newer dsh version exists, and turn a badge click into
		 * one `command` write on the `update-check` settings namespace. The host
		 * half owns everything after that: install, restart marker, exit 75.
		 *
		 * Transient state (registry answers, in-flight flags) lives in this
		 * browser-local store; every durable field crosses the settings namespace,
		 * whose schema is owned by the host half.
		 */
		const NS = "ui-update-check";
		const SETTINGS_NAMESPACE = "update-check";
		const DIST_TAGS_URL = "https://registry.npmjs.org/-/package";
		const DEFAULT_PACKAGE = "@deepseek-ai/dsh";
		const REGISTRY_TIMEOUT_MS = 15000;
		const DEFAULT_CHECK_MINUTES = 30;
		//#region version comparator — byte-identical twin of lib/version.js, keep in sync
		const VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)(?:-([A-Za-z0-9]+)(?:\.(\d+))?)?(?:\+.*)?$/;
		function parseVersion(value) {
			if (typeof value !== "string") return undefined;
			const match = VERSION_PATTERN.exec(value.trim());
			if (match === null) return undefined;
			return {
				major: Number(match[1]),
				minor: Number(match[2]),
				patch: Number(match[3]),
				pre: match[4] === undefined
					? undefined
					: { word: match[4].toLowerCase(), seq: match[5] === undefined ? 0 : Number(match[5]) },
			};
		}
		function compareVersions(a, b) {
			const left = parseVersion(a);
			const right = parseVersion(b);
			if (left === undefined || right === undefined) return 0;
			for (const [l, r] of [[left.major, right.major], [left.minor, right.minor], [left.patch, right.patch]]) {
				if (l !== r) return l < r ? -1 : 1;
			}
			if (left.pre === undefined || right.pre === undefined) {
				if (left.pre === right.pre) return 0;
				return left.pre === undefined ? 1 : -1;
			}
			if (left.pre.word !== right.pre.word) return left.pre.word < right.pre.word ? -1 : 1;
			if (left.pre.seq !== right.pre.seq) return left.pre.seq < right.pre.seq ? -1 : 1;
			return 0;
		}
		//#endregion
		const zh = {
			tip: "有新版本 {version}，点击更新",
			tipUnmanaged: "有新版本 {version}；当前 dsh 不是由托管启动器启动的，无法自动更新",
			updating: "正在更新到 {version}…",
			failed: "更新失败：{error}；点击重试",
			label: "更新",
		};
		const en = {
			tip: "New version {version} available — click to update",
			tipUnmanaged: "New version {version} available; this dsh was not started by the managed launcher and cannot self-update",
			updating: "Updating to {version}…",
			failed: "Update failed: {error}; click to retry",
			label: "Update",
		};
		function newNonce() {
			const cryptoRef = globalThis.crypto;
			if (cryptoRef !== undefined && typeof cryptoRef.randomUUID === "function") return cryptoRef.randomUUID();
			return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
		}
		function timeoutSignal() {
			return typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
				? AbortSignal.timeout(REGISTRY_TIMEOUT_MS)
				: undefined;
		}
		/**
		 * Browser-local store over the update decision. The settings scope stays
		 * the only durable source; this store adds the registry answer and the
		 * click lifecycle, and exposes the useSyncExternalStore face the badge
		 * renders from.
		 * @param scope - the bound `update-check` settings scope.
		 */
		function createUpdateController(scope) {
			let state = { target: undefined, phase: "idle", notice: undefined, canRestart: false };
			const listeners = new Set();
			const emit = () => {
				for (const listener of listeners) listener();
			};
			const setState = (patch) => {
				state = { ...state, ...patch };
				emit();
			};
			let tags;
			let pollTimer;
			let pollMinutes;
			/** Dist-tag for the active channel, falling back to `latest` and then the host-reported fact. */
			function channelTag(value) {
				const channel = typeof value.channel === "string" && value.channel !== "" ? value.channel : "latest";
				const tagged = tags === undefined ? undefined : (tags[channel] ?? tags.latest);
				if (typeof tagged === "string" && tagged !== "") return tagged;
				return typeof value.availableVersion === "string" && value.availableVersion !== ""
					? value.availableVersion
					: undefined;
			}
			function syncFromScope() {
				const snapshot = scope.getSnapshot();
				const value = snapshot.value;
				if (value === undefined) return;
				const canRestart = value.managedLauncher === true && snapshot.writable === true && snapshot.mode === "host";
				let phase = state.phase;
				let notice = state.notice;
				if (value.installState === "installing" || value.installState === "restarting") {
					phase = "waiting";
				} else if (value.installState === "error") {
					phase = "failed";
					notice = value.installError;
				} else if (phase === "waiting") {
					// The host reset the transient state (fresh boot reconcile): the flow ended.
					phase = "idle";
					notice = undefined;
				}
				const tag = channelTag(value);
				const target = tag !== undefined && compareVersions(tag, value.currentVersion) > 0 ? tag : undefined;
				setState({ target, phase, notice, canRestart });
				restartPoll(value.clientCheckMinutes);
			}
			function restartPoll(minutes) {
				const wanted = typeof minutes === "number" && Number.isFinite(minutes) && minutes >= 1 ? minutes : DEFAULT_CHECK_MINUTES;
				if (pollTimer !== undefined && pollMinutes === wanted) return;
				if (pollTimer !== undefined) clearInterval(pollTimer);
				pollMinutes = wanted;
				pollTimer = setInterval(() => {
					void fetchTags();
				}, wanted * 60000);
			}
			async function fetchTags() {
				const value = scope.getSnapshot().value;
				const packageName = value !== undefined && typeof value.packageName === "string" && value.packageName !== ""
					? value.packageName
					: DEFAULT_PACKAGE;
				try {
					const response = await fetch(`${DIST_TAGS_URL}/${packageName}/dist-tags`, { signal: timeoutSignal() });
					if (!response.ok) return;
					const body = await response.json();
					if (typeof body === "object" && body !== null) {
						tags = body;
						syncFromScope();
					}
				} catch {
					// Offline or registry blocked: the host-reported availableVersion fact
					// keeps serving the badge until the next poll.
				}
			}
			/**
			 * Badge click: issue one install command. Without a managed launcher or a
			 * writable settings document the tooltip already explains why the click
			 * cannot start an update.
			 */
			async function requestUpdate() {
				if (state.target === undefined || state.phase === "waiting") return;
				if (!state.canRestart) return;
				const nonce = newNonce();
				setState({ phase: "waiting", notice: undefined });
				try {
					await scope.set("command", `${nonce}|${state.target}`);
				} catch (error) {
					setState({ phase: "failed", notice: error instanceof Error ? error.message : String(error) });
				}
			}
			const disposeScope = scope.subscribe(syncFromScope);
			syncFromScope();
			void fetchTags();
			return {
				subscribe: (listener) => {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				getSnapshot: () => state,
				requestUpdate,
				dispose: () => {
					if (pollTimer !== undefined) clearInterval(pollTimer);
					disposeScope();
				},
			};
		}
		const DOT_SIZE = 8;
		/**
		 * The badge itself. Rendered inside `.footerActions` (full-width flex row
		 * above the settings entry): right-aligned in the wide sidebar, centered by
		 * the collapsed rail's own justify-content. Only non-idle state renders.
		 * @param props - owner share (`wide`), the locale seat, and the injected controller.
		 */
		function UpdateBadge(props) {
			const { wide, t, controller } = props;
			const state = react.useSyncExternalStore(controller.subscribe, controller.getSnapshot);
			if (state.target === undefined && state.phase === "idle") return null;
			const title = state.phase === "waiting"
				? t("updating", { version: state.target ?? "" })
				: state.phase === "failed"
				? t("failed", { error: state.notice ?? "" })
				: state.canRestart
				? t("tip", { version: state.target })
				: t("tipUnmanaged", { version: state.target });
			const dotColor = state.phase === "failed"
				? "var(--dsw-static-red-500)"
				: state.phase === "waiting"
				? "var(--dsw-static-blue-500)"
				: "var(--dsw-static-amber-500)";
			return react.createElement(
				"button",
				{
					type: "button",
					title,
					"aria-label": title,
					onClick: () => {
						void controller.requestUpdate();
					},
					style: {
						marginLeft: wide ? "auto" : undefined,
						display: "inline-flex",
						alignItems: "center",
						gap: 4,
						border: "none",
						background: "transparent",
						padding: wide ? "2px 8px" : "2px",
						borderRadius: 999,
						cursor: "pointer",
						minHeight: 20,
						color: "var(--dsw-alias-label-secondary)",
					},
				},
				react.createElement("span", {
					"aria-hidden": true,
					style: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: 999, background: dotColor, flex: "none" },
				}),
				wide && state.target !== undefined
					? react.createElement("span", { style: { fontSize: 11, lineHeight: "16px", whiteSpace: "nowrap" } }, state.target)
					: null,
				wide && state.phase === "waiting"
					? react.createElement("span", { style: { fontSize: 11, lineHeight: "16px", whiteSpace: "nowrap" } }, t("label"))
					: null,
			);
		}
		/**
		 * Client plugin body: register the dictionaries and the footer-action badge
		 * once the sidebar's slot declaration is on the ledger.
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "ui-update-check: dictionaries");
			let controller;
			ctx.effect(() => {
				const scope = ctx.settingsScope.bind({ namespace: SETTINGS_NAMESPACE });
				controller = createUpdateController(scope);
				return () => {
					controller.dispose();
				};
			}, "ui-update-check: controller");
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "update-check",
				order: 100,
				locale: NS,
				inject: () => ({ controller }),
			}, UpdateBadge));
		}
		/**
		 * Required services: slots for the footer action, locale for the
		 * dictionaries, and the settings scope the badge binds its namespace
		 * through.
		 */
		const inject = ["slots", "locale", "settingsScope"];
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

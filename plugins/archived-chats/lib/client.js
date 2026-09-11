window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-archived-chats",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		/**
		 * Browser half of the archived-chats plugin: one settings section listing
		 * the registry-global archived-session set, grouped by the Workspace each
		 * archived chat is still accounted to, with a search box and one
		 * unarchive action per row.
		 *
		 * Data arrives through the standard root seats (`useWorkspaces`,
		 * `useSessions`) and the inject face (the `locale` observable for
		 * locale-following date formatting, plus the `unarchive` callback).
		 * Unarchive writes the client Workspace projection only — the running
		 * build exposes no unarchive verb on the Host, so the write lasts until
		 * the next reconnect baseline (see README).
		 */
		const NS = "archivedChats";
		/** Group key for archived chats whose accounting Workspace is not in the registry. */
		const UNGROUPED_KEY = "\u0000ungrouped";
		const zh = {
			nav: "已归档的聊天",
			searchPlaceholder: "搜索已归档聊天",
			groupCount: "{count} 个聊天",
			groupUntitled: "未分组",
			emptyTitle: "还没有归档的聊天",
			emptyHint: "归档的会话会显示在这里，可随时取消归档",
			emptySearch: "没有匹配的归档聊天",
			unarchive: "取消归档",
			dateSeparator: "， ",
		};
		const en = {
			nav: "Archived chats",
			searchPlaceholder: "Search archived chats",
			groupCount: "{count} chats",
			groupUntitled: "Ungrouped",
			emptyTitle: "No archived chats yet",
			emptyHint: "Archived chats will appear here; you can unarchive them anytime",
			emptySearch: "No archived chats match your search",
			unarchive: "Unarchive",
			dateSeparator: ", ",
		};
		/**
		 * Group one filtered pass of the archive set by accounting Workspace.
		 * Groups keep Workspace registry order; the ungrouped group sorts last.
		 * Rows without a Session-list row are skipped: the list feed drops
		 * breadcrumb-only rows, and without a row there is no title to render.
		 * @param archivedIds - Host-confirmed archive set, in Host order.
		 * @param workspaceItems - Workspace rows, in registry order.
		 * @param sessionsById - Session list rows keyed by id.
		 * @param needle - Lowercased search text; empty keeps every chat.
		 * @returns ordered groups with newest-first chats.
		 */
		function buildGroups(archivedIds, workspaceItems, sessionsById, needle) {
			const groups = [];
			const groupByKey = new Map();
			for (const id of archivedIds) {
				const row = sessionsById[id];
				if (row === undefined) continue;
				const title = typeof row.displayTitle === "string" ? row.displayTitle : "";
				if (needle !== "" && !title.toLowerCase().includes(needle)) continue;
				const workspace = workspaceItems.find((item) => item.sessionIds.includes(id));
				const key = workspace === undefined ? UNGROUPED_KEY : workspace.workspaceId;
				let group = groupByKey.get(key);
				if (group === undefined) {
					group = { key, title: workspace === undefined ? undefined : workspace.title, chats: [] };
					groupByKey.set(key, group);
					groups.push(group);
				}
				group.chats.push({ id, title, updatedAt: typeof row.updatedAt === "number" ? row.updatedAt : 0 });
			}
			for (const group of groups) group.chats.sort((left, right) => right.updatedAt - left.updatedAt);
			const ungrouped = groups.filter((group) => group.key === UNGROUPED_KEY);
			return [...groups.filter((group) => group.key !== UNGROUPED_KEY), ...ungrouped];
		}
		/**
		 * Render one chat timestamp in the active locale, joining an Intl long
		 * date and a local `h:mm` clock (unpadded hour, padded minute) with the
		 * dictionary separator. A missing or unparsable stamp renders as absent.
		 * @param ms - Session updatedAt epoch milliseconds.
		 * @param tag - Active locale id, used directly as the BCP 47 tag.
		 * @param joiner - Localized date/time separator.
		 * @returns the formatted stamp, or undefined when there is no date.
		 */
		function formatStamp(ms, tag, joiner) {
			if (typeof ms !== "number" || !Number.isFinite(ms) || ms <= 0) return undefined;
			const date = new Date(ms);
			let day;
			try {
				day = new Intl.DateTimeFormat(tag, { year: "numeric", month: "long", day: "numeric" }).format(date);
			} catch (error) {
				// A language-pack id outside BCP 47 cannot seed Intl; the plain
				// numeric date keeps the row readable where the tag is unusable.
				day = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
			}
			return `${day}${joiner}${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
		}
		/** Decorative folder glyph for group headings. */
		function FolderIcon() {
			return react.createElement(
				"svg",
				{
					width: 14,
					height: 14,
					viewBox: "0 0 16 16",
					fill: "none",
					"aria-hidden": true,
					style: { flex: "none", color: "var(--dsw-alias-label-tertiary)" },
				},
				react.createElement("path", {
					d: "M1.5 4.5A1.5 1.5 0 0 1 3 3h3.2l1.8 2h5A1.5 1.5 0 0 1 14.5 6.5v5A1.5 1.5 0 0 1 13 13H3a1.5 1.5 0 0 1-1.5-1.5v-7Z",
					stroke: "currentColor",
					strokeWidth: 1.2,
					strokeLinejoin: "round",
				}),
			);
		}
		const sectionStyle = { display: "flex", flexDirection: "column", gap: 16, minWidth: 0, color: "var(--dsw-alias-label-primary)" };
		const titleStyle = { margin: 0, fontSize: 18, fontWeight: 600, lineHeight: "26px" };
		const searchStyle = {
			width: "100%",
			boxSizing: "border-box",
			padding: "8px 12px",
			fontSize: 13,
			lineHeight: "20px",
			color: "var(--dsw-alias-label-primary)",
			background: "var(--dsw-alias-bg-base)",
			border: "1px solid var(--dsw-alias-border-l2)",
			borderRadius: 10,
			outline: "none",
		};
		const groupStyle = { display: "flex", flexDirection: "column", gap: 4 };
		const groupHeadStyle = { margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--dsw-alias-label-tertiary)" };
		const groupCountStyle = { fontWeight: 400 };
		const rowStyle = { display: "flex", alignItems: "center", gap: 12, minWidth: 0, padding: "10px 4px", borderBottom: "1px solid var(--dsw-alias-border-l4)" };
		const rowTitleStyle = { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, lineHeight: "20px" };
		const rowDateStyle = { flex: "none", fontSize: 12, lineHeight: "18px", color: "var(--dsw-alias-label-tertiary)", whiteSpace: "nowrap" };
		const unarchiveButtonStyle = {
			flex: "none",
			padding: "4px 12px",
			fontSize: 12,
			lineHeight: "18px",
			color: "var(--dsw-alias-label-secondary)",
			background: "transparent",
			border: "1px solid var(--dsw-alias-border-l3)",
			borderRadius: 8,
			cursor: "pointer",
		};
		const emptyStyle = { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "48px 0", textAlign: "center" };
		const emptyTitleStyle = { margin: 0, fontSize: 14, fontWeight: 500, color: "var(--dsw-alias-label-secondary)" };
		const emptyHintStyle = { margin: 0, fontSize: 12, color: "var(--dsw-alias-label-tertiary)" };
		/**
		 * The archived-chats settings page. Local state is the search text only;
		 * every live fact arrives through framework-bound hooks, and the unarchive
		 * action rides the injected callback.
		 * @param props - owner share, the standard root seats, the locale hook,
		 *   the `t` seat, and the injected unarchive callback.
		 */
		function ArchivedChatsSection(props) {
			const { useWorkspaces, useSessions, useLocale, t, unarchive } = props;
			const [query, setQuery] = react.useState("");
			const workspaceState = useWorkspaces((snapshot) => snapshot);
			const sessionState = useSessions((snapshot) => snapshot);
			const locale = useLocale((snapshot) => snapshot);
			// Both feeds publish through one baseline pull each; render nothing
			// until both land, so "no archives" is never painted from absent data.
			// Anything but the ready phase (unknown values included) keeps waiting.
			if (workspaceState.phase !== "ready" || sessionState.phase !== "ready") return null;
			const tag = typeof locale.active === "string" && locale.active !== "" ? locale.active : "en";
			const joiner = t("dateSeparator");
			const needle = query.trim().toLowerCase();
			const groups = buildGroups(workspaceState.archivedSessionIds, workspaceState.items, sessionState.byId, needle);
			if (groups.length === 0) {
				return react.createElement("div", { style: sectionStyle },
					react.createElement("h2", { style: titleStyle }, t("nav")),
					react.createElement("input", {
						type: "search",
						value: query,
						placeholder: t("searchPlaceholder"),
						"aria-label": t("searchPlaceholder"),
						style: searchStyle,
						onChange: (event) => { setQuery(event.target.value); },
					}),
					react.createElement("div", { style: emptyStyle },
						react.createElement("p", { style: emptyTitleStyle }, needle === "" ? t("emptyTitle") : t("emptySearch")),
						needle === "" ? react.createElement("p", { style: emptyHintStyle }, t("emptyHint")) : null,
					),
				);
			}
			return react.createElement("div", { style: sectionStyle },
				react.createElement("h2", { style: titleStyle }, t("nav")),
				react.createElement("input", {
					type: "search",
					value: query,
					placeholder: t("searchPlaceholder"),
					"aria-label": t("searchPlaceholder"),
					style: searchStyle,
					onChange: (event) => { setQuery(event.target.value); },
				}),
				groups.map((group) => react.createElement(
					"section",
					{ key: group.key, style: groupStyle },
					react.createElement("h3", { style: groupHeadStyle },
						react.createElement(FolderIcon),
						react.createElement("span", null, group.title === undefined ? t("groupUntitled") : group.title),
						react.createElement("span", { style: groupCountStyle }, t("groupCount", { count: group.chats.length })),
					),
					group.chats.map((chat) => {
						const stamp = formatStamp(chat.updatedAt, tag, joiner);
						return react.createElement("div", { key: chat.id, style: rowStyle },
							react.createElement("span", { style: rowTitleStyle, title: chat.title }, chat.title),
							stamp === undefined ? null : react.createElement("span", { style: rowDateStyle }, stamp),
							react.createElement("button", {
								type: "button",
								style: unarchiveButtonStyle,
								"aria-label": `${t("unarchive")}: ${chat.title}`,
								onClick: () => { unarchive(chat.id); },
							}, t("unarchive")),
						);
					}),
				)),
			);
		}
		/**
		 * Client plugin body: register the dictionaries and the settings section
		 * once the settings shell's `settings.section` declaration is on the ledger.
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "ui-archived-chats: dictionaries");
			// Unarchive is a client-projection write: read the complete
			// Host-confirmed set, remove one id, and publish the replacement in one
			// synchronous block (no await between read and write), so no
			// client-side step can interleave. A concurrent Host `archived`
			// increment lands afterwards and wins, which is the correct outcome for
			// a change made elsewhere.
			const unarchive = (sessionId) => {
				const snapshot = ctx.workspaces.list.getSnapshot();
				if (snapshot.phase !== "ready") return;
				const next = snapshot.archivedSessionIds.filter((id) => id !== sessionId);
				ctx.workspaces.list.replaceArchived(next);
			};
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "archived-chats",
				// The nav projects entries by ascending order: general 0, models 10,
				// plugins 15, agent-presets 20 — this page lands below Agent presets.
				order: 30,
				label: () => ctx.locale.bind(NS)("nav"),
				locale: NS,
				inject: () => ({
					unarchive,
					hooks: { locale: ctx.locale },
				}),
			}, ArchivedChatsSection));
		}
		/**
		 * Required services: slots for the section registration, locale for the
		 * dictionaries, and the Workspace Controller service whose projection the
		 * unarchive action writes through.
		 */
		const inject = ["slots", "locale", "workspaces"];
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

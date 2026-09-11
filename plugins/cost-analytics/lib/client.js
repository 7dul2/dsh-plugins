window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-cost-analytics",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		/**
		 * Browser half of the cost-analytics plugin: a billing pill beside the
		 * token-usage pill in the composer dock, and the "成本统计" settings
		 * section over the whole session library.
		 *
		 * Both surfaces read the same two host-owned settings namespaces through
		 * scopes bound in `apply`: `cost-analytics-usage` carries the host
		 * rollup (per-session, per-model requests, four token buckets, and
		 * peak/off-peak splits, with subagent sessions already folded into their
		 * parent), and `cost-analytics` carries the currency and price table.
		 * Money is computed here and nowhere else, so a price edit reprices every
		 * view without a rescan.
		 *
		 * The dock pill renders only for the current session's own row; a
		 * subagent session has no row of its own by construction. Its popover is
		 * deliberately portal-free (this bundle may require React only), so it
		 * anchors to the pill inside a relatively positioned wrapper.
		 */
		const NS = "costAnalytics";
		const USAGE_NAMESPACE = "cost-analytics-usage";
		const COST_NAMESPACE = "cost-analytics";
		const DEFAULT_CURRENCY = "CNY";
		const UNKNOWN_MODEL = "(unknown)";
		const EMDASH = "—";
		/** Categorical palette for model nodes; tokens are theme-owned, so both skins stay legible. */
		const MODEL_COLORS = [
			"var(--dsw-static-blue-500)",
			"var(--dsw-static-green-500)",
			"var(--dsw-static-amber-500)",
			"var(--dsw-static-deepseek-500)",
			"var(--dsw-static-red-500)",
			"var(--dsw-static-blue-300)",
		];
		const zh = {
			nav: "消耗统计",
			dialogTitle: "本次会话计费",
			pillTitle: "{cost} · {requests} 次请求",
			sankeyRequests: "{count} 次请求",
			summaryTotal: "合计 {cost}",
			summaryRequests: "{count} 次请求",
			tokensLine: "输入 {input} · 缓存读 {read} · 缓存写 {write} · 输出 {out}",
			unpriced: "未配置价格：{models}",
			modelRequests: "{count} 次",
			modelLine: "{requests} · 输入 {input} · 缓存读 {read} · 缓存写 {write} · 输出 {out}",
			peakLine: "高峰 {peak} · 空闲 {offPeak}",
			close: "关闭",
			totalCost: "总计 {cost}",
			sessionCount: "{count} 个会话",
			groupUntitled: "未分组",
			sessionUntitled: "未命名会话",
			archivedTag: "已归档",
			modelCount: "{count} 个模型",
			emptyTitle: "还没有可统计的消耗",
			emptyHint: "会话产生模型请求后，这里会按项目与会话显示计费统计",
			errorTitle: "统计不可用",
			degradedTitle: "部分数据缺失",
			updatedAt: "更新于 {time}",
			untitledModel: "未知模型",
		};
		const en = {
			nav: "Cost analytics",
			dialogTitle: "Session billing",
			pillTitle: "{cost} · {requests} requests",
			sankeyRequests: "{count} requests",
			summaryTotal: "Total {cost}",
			summaryRequests: "{count} requests",
			tokensLine: "Input {input} · cache read {read} · cache write {write} · output {out}",
			unpriced: "No price configured: {models}",
			modelRequests: "{count}",
			modelLine: "{requests} · input {input} · cache read {read} · cache write {write} · output {out}",
			peakLine: "Peak {peak} · off-peak {offPeak}",
			close: "Close",
			totalCost: "Total {cost}",
			sessionCount: "{count} sessions",
			groupUntitled: "Ungrouped",
			sessionUntitled: "Untitled session",
			archivedTag: "Archived",
			modelCount: "{count} models",
			emptyTitle: "No consumption recorded yet",
			emptyHint: "Once sessions issue model requests, their billing appears here grouped by project and session",
			errorTitle: "Statistics unavailable",
			degradedTitle: "Incomplete data",
			updatedAt: "Updated {time}",
			untitledModel: "Unknown model",
		};
		/** @returns a compact token reading: exact below 10k, then `k`, then `M`. */
		function formatTokens(value) {
			if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "0";
			if (value < 10000) return String(Math.round(value));
			if (value < 1000000) return `${(value / 1000).toFixed(value < 100000 ? 1 : 0)}k`;
			return `${(value / 1000000).toFixed(2)}M`;
		}
		/** @returns a compact count reading for request totals. */
		function formatCount(value) {
			if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "0";
			if (value < 10000) return String(Math.round(value));
			return `${(value / 1000).toFixed(1)}k`;
		}
		/**
		 * Format one amount in the configured currency.
		 * @param value - non-negative amount, or `null` for an unpriced total.
		 * @param currency - ISO-4217 code; an unusable code falls back to a suffix.
		 * @param tag - active locale id used as the BCP 47 tag.
		 * @returns the display text.
		 */
		function formatMoney(value, currency, tag) {
			if (value === null || value === undefined || !Number.isFinite(value)) return EMDASH;
			const digits = value > 0 && value < 0.01 ? 4 : 2;
			try {
				return new Intl.NumberFormat(tag, {
					style: "currency",
					currency,
					minimumFractionDigits: 2,
					maximumFractionDigits: digits,
				}).format(value);
			} catch (error) {
				// An unusable currency code cannot seed Intl; a plain suffixed
				// number keeps the amount readable.
				return `${value.toFixed(digits)} ${currency}`;
			}
		}
		/**
		 * Format one epoch-millisecond stamp in the active locale.
		 * @param ms - epoch milliseconds; `0` renders as absent.
		 * @param tag - active locale id used as the BCP 47 tag.
		 * @returns the display text, or an empty string when there is no stamp.
		 */
		function formatStamp(ms, tag) {
			if (typeof ms !== "number" || !Number.isFinite(ms) || ms <= 0) return "";
			const date = new Date(ms);
			try {
				return new Intl.DateTimeFormat(tag, {
					year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
				}).format(date);
			} catch (error) {
				// A locale id outside BCP 47 cannot seed Intl.
				return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
			}
		}
		/** @returns `text` shortened to `max` characters with a single ellipsis. */
		function truncate(text, max) {
			return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1))}…`;
		}
		/** @returns the final path segment of a workspace path, or the path itself. */
		function baseName(path) {
			if (typeof path !== "string" || path === "") return "";
			const parts = path.split(/[\\/]/).filter((part) => part !== "");
			return parts.length === 0 ? path : parts[parts.length - 1];
		}
		/**
		 * Sum the four disjoint buckets of one model rollup, or of one period split.
		 * @param buckets - object carrying the four bucket fields.
		 * @param price - rates to apply.
		 * @returns the amount those buckets cost.
		 */
		function bucketCost(buckets, price) {
			return (buckets.input || 0) * (price.input || 0)
				+ (buckets.cacheRead || 0) * (price.cacheRead || 0)
				+ (buckets.cacheWrite || 0) * (price.cacheWrite || 0)
				+ (buckets.output || 0) * (price.output || 0);
		}
		/**
		 * Price one model's rollup under the two-tier rule.
		 * @param usage - one model's totals plus both period splits.
		 * @param price - the model's price entry, or undefined when unpriced.
		 * @returns the amount, or `null` when the model has no price entry.
		 */
		function modelCost(usage, price) {
			if (price === undefined || price === null) return null;
			if (price.peak !== undefined && price.peak !== null) {
				return bucketCost(usage.periods.peak, price.peak) + bucketCost(usage.periods.offPeak, price);
			}
			return bucketCost(usage, price);
		}
		/**
		 * Price every model of one session row.
		 * @param session - one `cost-analytics-usage` session row.
		 * @param prices - resolved price table keyed by model id.
		 * @returns per-model rows sorted by amount, plus the row's totals.
		 */
		function priceSession(session, prices) {
			const models = session.models === undefined ? {} : session.models;
			const rows = Object.keys(models).map((model) => {
				const usage = models[model];
				const cost = modelCost(usage, prices[model]);
				return { model, usage, cost };
			});
			rows.sort((left, right) => {
				const leftCost = left.cost === null ? -1 : left.cost;
				const rightCost = right.cost === null ? -1 : right.cost;
				return rightCost - leftCost || left.model.localeCompare(right.model);
			});
			const totals = { requests: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0, cost: 0, priced: false };
			for (const row of rows) {
				totals.requests += row.usage.requests || 0;
				totals.input += row.usage.input || 0;
				totals.cacheRead += row.usage.cacheRead || 0;
				totals.cacheWrite += row.usage.cacheWrite || 0;
				totals.output += row.usage.output || 0;
				if (row.cost !== null) {
					totals.cost += row.cost;
					totals.priced = true;
				}
			}
			return { rows, totals };
		}
		/**
		 * Price the complete rollup and group its session rows by project path.
		 * @param usage - the resolved `cost-analytics-usage` value.
		 * @param prices - resolved price table keyed by model id.
		 * @returns summary totals, unpriced model ids, and ordered project groups.
		 */
		function buildSection(usage, prices) {
			const sessions = Array.isArray(usage.sessions) ? usage.sessions : [];
			const summary = { requests: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0, cost: 0, priced: false };
			const unpriced = new Set();
			const groups = new Map();
			for (const session of sessions) {
				const priced = priceSession(session, prices);
				for (const row of priced.rows) if (row.cost === null) unpriced.add(row.model);
				summary.requests += priced.totals.requests;
				summary.input += priced.totals.input;
				summary.cacheRead += priced.totals.cacheRead;
				summary.cacheWrite += priced.totals.cacheWrite;
				summary.output += priced.totals.output;
				if (priced.totals.priced) {
					summary.cost += priced.totals.cost;
					summary.priced = true;
				}
				const path = typeof session.workspacePath === "string" ? session.workspacePath : "";
				let group = groups.get(path);
				if (group === undefined) {
					group = { path, sessions: [], cost: 0, priced: false };
					groups.set(path, group);
				}
				group.sessions.push({ session, priced });
				if (priced.totals.priced) {
					group.cost += priced.totals.cost;
					group.priced = true;
				}
			}
			const ordered = [...groups.values()];
			for (const group of ordered) {
				group.sessions.sort((left, right) => {
					const leftCost = left.priced.totals.priced ? left.priced.totals.cost : -1;
					const rightCost = right.priced.totals.priced ? right.priced.totals.cost : -1;
					return rightCost - leftCost || left.session.sessionId.localeCompare(right.session.sessionId);
				});
			}
			ordered.sort((left, right) => (right.priced ? right.cost : -1) - (left.priced ? left.cost : -1)
				|| left.path.localeCompare(right.path));
			return {
				summary,
				// The host reports its own unpriced set; a price edited in the
				// browser narrows it further, so both views agree by construction.
				unpriced: [...unpriced].sort(),
				hostUnpriced: Array.isArray(usage.unpricedModels) ? usage.unpricedModels : [],
				groups: ordered,
				updatedAt: usage.updatedAt,
				degraded: typeof usage.degraded === "string" ? usage.degraded : "",
				error: typeof usage.error === "string" ? usage.error : "",
				sessionCount: sessions.length,
			};
		}
		/**
		 * Distribute one column's node heights over a fixed track.
		 * @param weights - relative share per node.
		 * @param available - track height in pixels.
		 * @param minimum - minimum node height.
		 * @returns one height per weight, scaled to fit the track.
		 */
		function nodeHeights(weights, available, minimum) {
			const total = weights.reduce((sum, weight) => sum + weight, 0);
			const raw = weights.map((weight) => total > 0 ? (weight / total) * available : available / weights.length);
			const clamped = raw.map((height) => Math.max(minimum, height));
			const sum = clamped.reduce((acc, height) => acc + height, 0);
			return sum <= available ? clamped : clamped.map((height) => (height / sum) * available);
		}
		/** @returns top offsets for one column's node heights, separated by the shared gap. */
		function stackOffsets(heights) {
			const offsets = [];
			let cursor = 0;
			for (const height of heights) {
				offsets.push(cursor);
				cursor += height + 3;
			}
			return offsets;
		}
		const svgText = { fontSize: 10, fill: "var(--dsw-alias-label-secondary)" };
		const sankeyStyle = { width: "100%", height: "auto", display: "block" };
		/**
		 * Three-column flow diagram: models to requests to amounts. Node and link
		 * thickness follow each model's share, and the two columns share one
		 * vertical scale so 1px of link means the same flow at both seams.
		 * @param props - priced model rows, the row totals, and formatting seats.
		 */
		function Sankey(props) {
			const { rows, totalRequests, currency, tag, t } = props;
			const gapCount = Math.max(0, rows.length - 1);
			const track = Math.max(28, rows.length * 16) + gapCount * 3;
			const height = track + 26;
			const amountWeights = rows.map((row) => row.cost === null ? 1 : Math.max(row.cost, 0));
			const leftHeights = nodeHeights(rows.map((row) => Math.max(row.usage.requests || 0, 1)), track - gapCount * 3, 5);
			const rightHeights = nodeHeights(amountWeights, track - gapCount * 3, 5);
			const leftOffsets = stackOffsets(leftHeights);
			const rightOffsets = stackOffsets(rightHeights);
			const top = 20;
			const leftX = 80;
			const spineX = 158;
			const rightX = 236;
			const nodeWidth = 48;
			const spineWidth = 18;
			const children = [];
			rows.forEach((row, index) => {
				const color = MODEL_COLORS[index % MODEL_COLORS.length];
				const y = top + leftOffsets[index];
				const heightPx = leftHeights[index];
				const spineY = top + leftOffsets[index];
				const rightY = top + rightOffsets[index];
				const amount = formatMoney(row.cost, currency, tag);
				const label = row.model === UNKNOWN_MODEL ? t("untitledModel") : row.model;
				children.push(react.createElement("path", {
					key: `l-${row.model}`,
					d: `M ${leftX + nodeWidth},${y + heightPx / 2} C ${(leftX + nodeWidth + spineX) / 2},${y + heightPx / 2} ${(leftX + nodeWidth + spineX) / 2},${spineY + heightPx / 2} ${spineX},${spineY + heightPx / 2}`,
					stroke: color,
					strokeWidth: Math.max(1, heightPx),
					fill: "none",
					strokeOpacity: 0.35,
				}));
				children.push(react.createElement("path", {
					key: `r-${row.model}`,
					d: `M ${spineX + spineWidth},${spineY + heightPx / 2} C ${(spineX + spineWidth + rightX) / 2},${spineY + heightPx / 2} ${(spineX + spineWidth + rightX) / 2},${rightY + rightHeights[index] / 2} ${rightX},${rightY + rightHeights[index] / 2}`,
					stroke: color,
					strokeWidth: Math.max(1, rightHeights[index]),
					fill: "none",
					strokeOpacity: 0.35,
				}));
				children.push(react.createElement("rect", {
					key: `ln-${row.model}`,
					x: leftX,
					y,
					width: nodeWidth,
					height: heightPx,
					rx: 2,
					fill: color,
				}, react.createElement("title", null, `${label} · ${t("modelRequests", { count: formatCount(row.usage.requests) })} · ${amount}`)));
				children.push(react.createElement("text", {
					key: `lt-${row.model}`,
					x: leftX - 4,
					y: y + heightPx / 2 + 3,
					textAnchor: "end",
					style: svgText,
				}, truncate(label, 14)));
				children.push(react.createElement("rect", {
					key: `rn-${row.model}`,
					x: rightX,
					y: rightY,
					width: nodeWidth,
					height: rightHeights[index],
					rx: 2,
					fill: color,
				}));
				children.push(react.createElement("text", {
					key: `rt-${row.model}`,
					x: rightX + nodeWidth + 4,
					y: rightY + rightHeights[index] / 2 + 3,
					style: svgText,
				}, truncate(amount, 11)));
			});
			return react.createElement("svg", {
				viewBox: `0 0 348 ${height}`,
				role: "img",
				"aria-label": t("dialogTitle"),
				style: sankeyStyle,
			},
				react.createElement("rect", {
					x: spineX,
					y: top,
					width: spineWidth,
					height: track,
					rx: 3,
					fill: "var(--dsw-alias-bg-layer-3)",
				}),
				react.createElement("text", {
					x: spineX + spineWidth / 2,
					y: 13,
					textAnchor: "middle",
					style: svgText,
				}, t("sankeyRequests", { count: formatCount(totalRequests) })),
				...children,
			);
		}
		/** Decorative coin glyph for the dock pill. */
		function CoinIcon() {
			return react.createElement("svg", {
				width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", "aria-hidden": true,
				style: { flex: "none" },
			},
				react.createElement("circle", { cx: 8, cy: 8, r: 6.2, stroke: "currentColor", strokeWidth: 1.2 }),
				react.createElement("path", { d: "M8 4.6v6.8M6.2 6.4h3.6M6.2 9.6h3.6", stroke: "currentColor", strokeWidth: 1.1, strokeLinecap: "round" }),
			);
		}
		/** Decorative close glyph for the popover. */
		function CloseIcon() {
			return react.createElement("svg", { width: 12, height: 12, viewBox: "0 0 16 16", fill: "none", "aria-hidden": true },
				react.createElement("path", { d: "M4 4l8 8M12 4l-8 8", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" }),
			);
		}
		const anchorStyle = { position: "relative", display: "inline-flex", alignItems: "center" };
		const pillStyle = {
			display: "inline-flex",
			alignItems: "center",
			gap: 4,
			border: "none",
			background: "transparent",
			padding: "2px 4px",
			borderRadius: 999,
			cursor: "pointer",
			minHeight: 20,
			fontSize: 12,
			lineHeight: "18px",
			color: "var(--dsw-alias-label-secondary)",
		};
		const backdropStyle = {
			position: "fixed",
			inset: 0,
			zIndex: 40,
			background: "transparent",
		};
		const panelStyle = {
			position: "absolute",
			bottom: "calc(100% + 8px)",
			left: 0,
			zIndex: 41,
			width: 372,
			maxWidth: "calc(100vw - 32px)",
			maxHeight: 460,
			overflowY: "auto",
			boxSizing: "border-box",
			display: "block",
			padding: 12,
			borderRadius: 12,
			border: "1px solid var(--dsw-alias-border-l3)",
			background: "var(--dsw-alias-bg-overlay)",
			boxShadow: "var(--dsw-shadow-lv2)",
			color: "var(--dsw-alias-label-primary)",
			textAlign: "left",
		};
		const panelHeadStyle = { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 };
		const panelTitleStyle = { flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, lineHeight: "20px" };
		const ghostButtonStyle = {
			flex: "none",
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center",
			width: 22,
			height: 22,
			border: "none",
			borderRadius: 6,
			background: "transparent",
			color: "var(--dsw-alias-label-tertiary)",
			cursor: "pointer",
		};
		const summaryStyle = { display: "flex", flexDirection: "column", gap: 2, padding: "0 0 8px" };
		const summaryMainStyle = { fontSize: 18, fontWeight: 600, lineHeight: "26px" };
		const mutedStyle = { fontSize: 11, lineHeight: "16px", color: "var(--dsw-alias-label-tertiary)" };
		const warnStyle = { fontSize: 11, lineHeight: "16px", color: "var(--dsw-static-amber-500)" };
		const errorStyle = { fontSize: 11, lineHeight: "16px", color: "var(--dsw-static-red-500)" };
		const modelRowStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 1,
			padding: "6px 0",
			borderTop: "1px solid var(--dsw-alias-border-l4)",
		};
		const modelHeadStyle = { display: "flex", alignItems: "center", gap: 6 };
		const dotStyle = { width: 8, height: 8, borderRadius: 999, flex: "none" };
		const modelNameStyle = {
			flex: 1,
			minWidth: 0,
			overflow: "hidden",
			textOverflow: "ellipsis",
			whiteSpace: "nowrap",
			fontSize: 12,
			lineHeight: "18px",
		};
		const amountStyle = { flex: "none", fontSize: 12, fontWeight: 600, lineHeight: "18px" };
		/**
		 * The dock pill and its popover, for the current session's own rollup row.
		 * @param props - the standard session seats, the locale seat, and the bound scopes.
		 */
		function BillingPill(props) {
			const { sessionId, t, useUsage, useCost, useLocale } = props;
			const usageSnapshot = useUsage((snapshot) => snapshot);
			const costSnapshot = useCost((snapshot) => snapshot);
			const localeSnapshot = useLocale((snapshot) => snapshot);
			const [open, setOpen] = react.useState(false);
			const ready = usageSnapshot.status === "ready" && costSnapshot.status === "ready";
			const view = react.useMemo(() => {
				if (!ready) return null;
				const usage = usageSnapshot.value;
				const sessions = Array.isArray(usage.sessions) ? usage.sessions : [];
				const session = sessions.find((candidate) => candidate.sessionId === sessionId);
				if (session === undefined) return null;
				const prices = costSnapshot.value.prices === undefined ? {} : costSnapshot.value.prices;
				const priced = priceSession(session, prices);
				return {
					session,
					priced,
					prices,
					currency: typeof costSnapshot.value.currency === "string" && costSnapshot.value.currency !== ""
						? costSnapshot.value.currency
						: DEFAULT_CURRENCY,
				};
			}, [ready, usageSnapshot.value, costSnapshot.value, sessionId]);
			if (view === null || view.priced.totals.requests === 0) return null;
			const tag = typeof localeSnapshot.active === "string" && localeSnapshot.active !== "" ? localeSnapshot.active : "en";
			const { priced, currency } = view;
			const { rows, totals } = priced;
			const costText = totals.priced ? formatMoney(totals.cost, currency, tag) : EMDASH;
			const label = t("pillTitle", { cost: costText, requests: formatCount(totals.requests) });
			const unpriced = rows.filter((row) => row.cost === null).map((row) => row.model);
			return react.createElement("span", { style: anchorStyle },
				react.createElement("button", {
					type: "button",
					style: pillStyle,
					title: label,
					"aria-label": label,
					"aria-haspopup": "dialog",
					"aria-expanded": open,
					onClick: () => { setOpen(!open); },
				},
					react.createElement(CoinIcon),
					react.createElement("span", null, costText),
				),
				open ? react.createElement("span", { style: backdropStyle, onClick: () => { setOpen(false); } }) : null,
				open ? react.createElement("span", { style: panelStyle, role: "dialog", "aria-label": t("dialogTitle") },
					react.createElement("span", { style: panelHeadStyle },
						react.createElement("span", { style: panelTitleStyle }, t("dialogTitle")),
						react.createElement("button", {
							type: "button",
							style: ghostButtonStyle,
							"aria-label": t("close"),
							onClick: () => { setOpen(false); },
						}, react.createElement(CloseIcon)),
					),
					react.createElement("span", { style: summaryStyle },
						react.createElement("span", { style: summaryMainStyle }, t("summaryTotal", { cost: costText })),
						react.createElement("span", { style: mutedStyle }, t("summaryRequests", { count: formatCount(totals.requests) })),
						react.createElement("span", { style: mutedStyle }, t("tokensLine", {
							input: formatTokens(totals.input),
							read: formatTokens(totals.cacheRead),
							write: formatTokens(totals.cacheWrite),
							out: formatTokens(totals.output),
						})),
						unpriced.length > 0 ? react.createElement("span", { style: warnStyle }, t("unpriced", { models: unpriced.join(", ") })) : null,
					),
					react.createElement(Sankey, { rows, totalRequests: totals.requests, currency, tag, t }),
					react.createElement("span", { style: { display: "block", marginTop: 6 } }, rows.map((row, index) => {
						const amount = row.cost === null ? EMDASH : formatMoney(row.cost, currency, tag);
						const name = row.model === UNKNOWN_MODEL ? t("untitledModel") : row.model;
						const twoTier = row.usage.periods !== undefined
							&& (row.usage.periods.peak.requests > 0 || row.usage.periods.offPeak.requests > 0);
						return react.createElement("span", { key: row.model, style: modelRowStyle },
							react.createElement("span", { style: modelHeadStyle },
								react.createElement("span", { style: { ...dotStyle, background: MODEL_COLORS[index % MODEL_COLORS.length] } }),
								react.createElement("span", { style: modelNameStyle, title: name }, name),
								react.createElement("span", { style: amountStyle }, amount),
							),
							react.createElement("span", { style: mutedStyle }, t("modelLine", {
								requests: t("modelRequests", { count: formatCount(row.usage.requests) }),
								input: formatTokens(row.usage.input),
								read: formatTokens(row.usage.cacheRead),
								write: formatTokens(row.usage.cacheWrite),
								out: formatTokens(row.usage.output),
							})),
							twoTier ? react.createElement("span", { style: mutedStyle }, t("peakLine", {
								peak: formatCount(row.usage.periods.peak.requests),
								offPeak: formatCount(row.usage.periods.offPeak.requests),
							})) : null,
						);
					})),
				) : null,
			);
		}
		const sectionStyle = { display: "flex", flexDirection: "column", gap: 16, minWidth: 0, color: "var(--dsw-alias-label-primary)" };
		const sectionTitleStyle = { margin: 0, fontSize: 18, fontWeight: 600, lineHeight: "26px" };
		const cardStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 4,
			padding: "12px 14px",
			border: "1px solid var(--dsw-alias-border-l4)",
			borderRadius: 12,
			background: "var(--dsw-alias-bg-layer-1)",
		};
		const groupStyle = { display: "flex", flexDirection: "column", gap: 4 };
		const groupHeadStyle = { margin: 0, display: "flex", alignItems: "baseline", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--dsw-alias-label-tertiary)" };
		const groupPathStyle = { fontWeight: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
		const rowStyle = { display: "flex", flexDirection: "column", gap: 1, padding: "8px 4px", borderBottom: "1px solid var(--dsw-alias-border-l4)" };
		const rowHeadStyle = { display: "flex", alignItems: "center", gap: 8, minWidth: 0 };
		const rowTitleStyle = { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, lineHeight: "20px" };
		const tagStyle = {
			flex: "none",
			padding: "1px 6px",
			borderRadius: 6,
			fontSize: 10,
			lineHeight: "16px",
			color: "var(--dsw-alias-label-tertiary)",
			background: "var(--dsw-alias-bg-layer-3)",
		};
		const rowAmountStyle = { flex: "none", fontSize: 13, fontWeight: 600, lineHeight: "20px" };
		const emptyStyle = { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "48px 0", textAlign: "center" };
		const emptyTitleStyle = { margin: 0, fontSize: 14, fontWeight: 500, color: "var(--dsw-alias-label-secondary)" };
		const emptyHintStyle = { margin: 0, fontSize: 12, color: "var(--dsw-alias-label-tertiary)" };
		/** Decorative folder glyph for project headings. */
		function FolderIcon() {
			return react.createElement("svg", {
				width: 14, height: 14, viewBox: "0 0 16 16", fill: "none", "aria-hidden": true,
				style: { flex: "none", color: "var(--dsw-alias-label-tertiary)" },
			},
				react.createElement("path", {
					d: "M1.5 4.5A1.5 1.5 0 0 1 3 3h3.2l1.8 2h5A1.5 1.5 0 0 1 14.5 6.5v5A1.5 1.5 0 0 1 13 13H3a1.5 1.5 0 0 1-1.5-1.5v-7Z",
					stroke: "currentColor", strokeWidth: 1.2, strokeLinejoin: "round",
				}),
			);
		}
		/**
		 * The "成本统计" settings page: whole-library totals plus one group per
		 * project and one row per session, archived sessions included.
		 * @param props - the locale seat and the bound scopes.
		 */
		function CostSessionSection(props) {
			const { t, useUsage, useCost, useLocale } = props;
			const usageSnapshot = useUsage((snapshot) => snapshot);
			const costSnapshot = useCost((snapshot) => snapshot);
			const localeSnapshot = useLocale((snapshot) => snapshot);
			const ready = usageSnapshot.status === "ready" && costSnapshot.status === "ready";
			const view = react.useMemo(() => {
				if (!ready) return null;
				const prices = costSnapshot.value.prices === undefined ? {} : costSnapshot.value.prices;
				return buildSection(usageSnapshot.value, prices);
			}, [ready, usageSnapshot.value, costSnapshot.value]);
			if (view === null) return null;
			const tag = typeof localeSnapshot.active === "string" && localeSnapshot.active !== "" ? localeSnapshot.active : "en";
			const currency = typeof costSnapshot.value.currency === "string" && costSnapshot.value.currency !== ""
				? costSnapshot.value.currency
				: DEFAULT_CURRENCY;
			const summaryCost = view.summary.priced ? formatMoney(view.summary.cost, currency, tag) : EMDASH;
			const stamp = formatStamp(view.updatedAt, tag);
			const unpriced = view.unpriced.length > 0 ? view.unpriced : view.hostUnpriced;
			const header = react.createElement("h2", { style: sectionTitleStyle }, t("nav"));
			const summaryCard = react.createElement("div", { style: cardStyle },
				react.createElement("div", { style: { display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" } },
					react.createElement("span", { style: summaryMainStyle }, t("totalCost", { cost: summaryCost })),
					react.createElement("span", { style: mutedStyle }, t("summaryRequests", { count: formatCount(view.summary.requests) })),
					react.createElement("span", { style: mutedStyle }, t("sessionCount", { count: view.sessionCount })),
				),
				react.createElement("span", { style: mutedStyle }, t("tokensLine", {
					input: formatTokens(view.summary.input),
					read: formatTokens(view.summary.cacheRead),
					write: formatTokens(view.summary.cacheWrite),
					out: formatTokens(view.summary.output),
				})),
				unpriced.length > 0 ? react.createElement("span", { style: warnStyle }, t("unpriced", { models: unpriced.join(", ") })) : null,
				view.error !== "" ? react.createElement("span", { style: errorStyle }, `${t("errorTitle")}: ${view.error}`) : null,
				view.degraded !== "" ? react.createElement("span", { style: warnStyle }, `${t("degradedTitle")}: ${view.degraded}`) : null,
				stamp === "" ? null : react.createElement("span", { style: mutedStyle }, t("updatedAt", { time: stamp })),
			);
			if (view.groups.length === 0) {
				return react.createElement("div", { style: sectionStyle },
					header,
					summaryCard,
					react.createElement("div", { style: emptyStyle },
						react.createElement("p", { style: emptyTitleStyle }, t("emptyTitle")),
						react.createElement("p", { style: emptyHintStyle }, t("emptyHint")),
					),
				);
			}
			return react.createElement("div", { style: sectionStyle },
				header,
				summaryCard,
				view.groups.map((group) => react.createElement("section", { key: group.path === "" ? "\u0000ungrouped" : group.path, style: groupStyle },
					react.createElement("h3", { style: groupHeadStyle },
						react.createElement(FolderIcon),
						react.createElement("span", { style: groupPathStyle, title: group.path }, group.path === "" ? t("groupUntitled") : baseName(group.path)),
						react.createElement("span", null, t("sessionCount", { count: group.sessions.length })),
						group.priced ? react.createElement("span", null, formatMoney(group.cost, currency, tag)) : null,
					),
					group.sessions.map(({ session, priced: sessionPriced }) => {
						const amount = sessionPriced.totals.priced ? formatMoney(sessionPriced.totals.cost, currency, tag) : EMDASH;
						const title = typeof session.title === "string" && session.title !== "" ? session.title : t("sessionUntitled");
						const models = Object.keys(session.models === undefined ? {} : session.models).length;
						const detail = [
							t("modelCount", { count: models }),
							t("summaryRequests", { count: formatCount(sessionPriced.totals.requests) }),
							t("tokensLine", {
								input: formatTokens(sessionPriced.totals.input),
								read: formatTokens(sessionPriced.totals.cacheRead),
								write: formatTokens(sessionPriced.totals.cacheWrite),
								out: formatTokens(sessionPriced.totals.output),
							}),
						].join(" · ");
						return react.createElement("div", { key: session.sessionId, style: rowStyle },
							react.createElement("div", { style: rowHeadStyle },
								react.createElement("span", { style: rowTitleStyle, title }, title),
								session.archived ? react.createElement("span", { style: tagStyle }, t("archivedTag")) : null,
								react.createElement("span", { style: rowAmountStyle }, amount),
							),
							react.createElement("span", { style: mutedStyle }, detail),
						);
					}),
				)),
			);
		}
		/**
		 * Client plugin body: register the dictionaries, bind both settings
		 * scopes once for the fiber, and contribute the composer-dock pill and the
		 * settings section once their slots are declared.
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "ui-cost-analytics: dictionaries");
			const usageScope = ctx.settingsScope.bind({ namespace: USAGE_NAMESPACE });
			const costScope = ctx.settingsScope.bind({ namespace: COST_NAMESPACE });
			// Both surfaces read the same two scopes; the renderer binds each entry
			// to a use<Name> selector hook and caches it per source.
			const faces = () => ({
				hooks: { usage: usageScope, cost: costScope, locale: ctx.locale },
			});
			ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
				name: "conversation.composer.dock",
				id: "cost-billing",
				// The dock is an ascending flex row; the token-usage stats pill is
				// order 0, so the billing pill sits immediately beside it.
				order: 1,
				locale: NS,
				inject: faces,
			}, BillingPill));
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "cost-session",
				// The nav projects entries by ascending order: general 0, models 10,
				// plugins 15, agent-presets 20, archived-chats 30 — this page lands
				// below Archived chats.
				order: 45,
				label: () => ctx.locale.bind(NS)("nav"),
				locale: NS,
				inject: faces,
			}, CostSessionSection));
		}
		/**
		 * Required services: slots for both contributions, locale for the
		 * dictionaries and the active language, and the settings scopes both
		 * surfaces read their namespaces through.
		 */
		const inject = ["slots", "locale", "settingsScope"];
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

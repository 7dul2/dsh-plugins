window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-cost-analytics",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let reactDom = require("react-dom");
		/** Bundled d3-sankey v0.12.3 layout engine; see plugins/cost-analytics/NOTICE. */
		var d3Sankey=(()=>{var q=Object.defineProperty;var nt=Object.getOwnPropertyDescriptor;var rt=Object.getOwnPropertyNames;var ft=Object.prototype.hasOwnProperty;var st=(r,s)=>{for(var i in s)q(r,i,{get:s[i],enumerable:!0})},ut=(r,s,i,a)=>{if(s&&typeof s=="object"||typeof s=="function")for(let l of rt(s))!ft.call(r,l)&&l!==i&&q(r,l,{get:()=>s[l],enumerable:!(a=nt(s,l))||a.enumerable});return r};var it=r=>ut(q({},"__esModule",{value:!0}),r);var dt={};st(dt,{sankey:()=>z});function b(r,s){let i;if(s===void 0)for(let a of r)a!=null&&(i<a||i===void 0&&a>=a)&&(i=a);else{let a=-1;for(let l of r)(l=s(l,++a,r))!=null&&(i<l||i===void 0&&l>=l)&&(i=l)}return i}function I(r,s){let i;if(s===void 0)for(let a of r)a!=null&&(i>a||i===void 0&&a>=a)&&(i=a);else{let a=-1;for(let l of r)(l=s(l,++a,r))!=null&&(i>l||i===void 0&&l>=l)&&(i=l)}return i}function h(r,s){let i=0;if(s===void 0)for(let a of r)(a=+a)&&(i+=a);else{let a=-1;for(let l of r)(l=+s(l,++a,r))&&(i+=l)}return i}function A(r,s){return r.sourceLinks.length?r.depth:s-1}function y(r){return function(){return r}}function J(r,s){return T(r.source,s.source)||r.index-s.index}function P(r,s){return T(r.target,s.target)||r.index-s.index}function T(r,s){return r.y0-s.y0}function D(r){return r.value}function at(r){return r.index}function lt(r){return r.nodes}function ct(r){return r.links}function W(r,s){let i=r.get(s);if(!i)throw new Error("missing: "+s);return i}function G({nodes:r}){for(let s of r){let i=s.y0,a=i;for(let l of s.sourceLinks)l.y0=i+l.width/2,i+=l.width;for(let l of s.targetLinks)l.y1=a+l.width/2,a+=l.width}}function z(){let r=0,s=0,i=1,a=1,l=24,B=8,m,M=at,N=A,g,p,j=lt,C=ct,v=6;function c(){let t={nodes:j.apply(null,arguments),links:C.apply(null,arguments)};return K(t),O(t),Q(t),U(t),Z(t),G(t),t}c.update=function(t){return G(t),t},c.nodeId=function(t){return arguments.length?(M=typeof t=="function"?t:y(t),c):M},c.nodeAlign=function(t){return arguments.length?(N=typeof t=="function"?t:y(t),c):N},c.nodeSort=function(t){return arguments.length?(g=t,c):g},c.nodeWidth=function(t){return arguments.length?(l=+t,c):l},c.nodePadding=function(t){return arguments.length?(B=m=+t,c):B},c.nodes=function(t){return arguments.length?(j=typeof t=="function"?t:y(t),c):j},c.links=function(t){return arguments.length?(C=typeof t=="function"?t:y(t),c):C},c.linkSort=function(t){return arguments.length?(p=t,c):p},c.size=function(t){return arguments.length?(r=s=0,i=+t[0],a=+t[1],c):[i-r,a-s]},c.extent=function(t){return arguments.length?(r=+t[0][0],i=+t[1][0],s=+t[0][1],a=+t[1][1],c):[[r,s],[i,a]]},c.iterations=function(t){return arguments.length?(v=+t,c):v};function K({nodes:t,links:f}){for(let[n,e]of t.entries())e.index=n,e.sourceLinks=[],e.targetLinks=[];let o=new Map(t.map((n,e)=>[M(n,e,t),n]));for(let[n,e]of f.entries()){e.index=n;let{source:u,target:d}=e;typeof u!="object"&&(u=e.source=W(o,u)),typeof d!="object"&&(d=e.target=W(o,d)),u.sourceLinks.push(e),d.targetLinks.push(e)}if(p!=null)for(let{sourceLinks:n,targetLinks:e}of t)n.sort(p),e.sort(p)}function O({nodes:t}){for(let f of t)f.value=f.fixedValue===void 0?Math.max(h(f.sourceLinks,D),h(f.targetLinks,D)):f.fixedValue}function Q({nodes:t}){let f=t.length,o=new Set(t),n=new Set,e=0;for(;o.size;){for(let u of o){u.depth=e;for(let{target:d}of u.sourceLinks)n.add(d)}if(++e>f)throw new Error("circular link");o=n,n=new Set}}function U({nodes:t}){let f=t.length,o=new Set(t),n=new Set,e=0;for(;o.size;){for(let u of o){u.height=e;for(let{source:d}of u.targetLinks)n.add(d)}if(++e>f)throw new Error("circular link");o=n,n=new Set}}function X({nodes:t}){let f=b(t,e=>e.depth)+1,o=(i-r-l)/(f-1),n=new Array(f);for(let e of t){let u=Math.max(0,Math.min(f-1,Math.floor(N.call(null,e,f))));e.layer=u,e.x0=r+u*o,e.x1=e.x0+l,n[u]?n[u].push(e):n[u]=[e]}if(g)for(let e of n)e.sort(g);return n}function Y(t){let f=I(t,o=>(a-s-(o.length-1)*m)/h(o,D));for(let o of t){let n=s;for(let e of o){e.y0=n,e.y1=n+e.value*f,n=e.y1+m;for(let u of e.sourceLinks)u.width=u.value*f}n=(a-n+m)/(o.length+1);for(let e=0;e<o.length;++e){let u=o[e];u.y0+=n*(e+1),u.y1+=n*(e+1)}tt(o)}}function Z(t){let f=X(t);m=Math.min(B,(a-s)/(b(f,o=>o.length)-1)),Y(f);for(let o=0;o<v;++o){let n=Math.pow(.99,o),e=Math.max(1-n,(o+1)/v);_(f,n,e),$(f,n,e)}}function $(t,f,o){for(let n=1,e=t.length;n<e;++n){let u=t[n];for(let d of u){let k=0,x=0;for(let{source:w,value:R}of d.targetLinks){let S=R*(d.layer-w.layer);k+=et(w,d)*S,x+=S}if(!(x>0))continue;let L=(k/x-d.y0)*f;d.y0+=L,d.y1+=L,F(d)}g===void 0&&u.sort(T),E(u,o)}}function _(t,f,o){for(let n=t.length,e=n-2;e>=0;--e){let u=t[e];for(let d of u){let k=0,x=0;for(let{target:w,value:R}of d.sourceLinks){let S=R*(w.layer-d.layer);k+=ot(d,w)*S,x+=S}if(!(x>0))continue;let L=(k/x-d.y0)*f;d.y0+=L,d.y1+=L,F(d)}g===void 0&&u.sort(T),E(u,o)}}function E(t,f){let o=t.length>>1,n=t[o];V(t,n.y0-m,o-1,f),H(t,n.y1+m,o+1,f),V(t,a,t.length-1,f),H(t,s,0,f)}function H(t,f,o,n){for(;o<t.length;++o){let e=t[o],u=(f-e.y0)*n;u>1e-6&&(e.y0+=u,e.y1+=u),f=e.y1+m}}function V(t,f,o,n){for(;o>=0;--o){let e=t[o],u=(e.y1-f)*n;u>1e-6&&(e.y0-=u,e.y1-=u),f=e.y0-m}}function F({sourceLinks:t,targetLinks:f}){if(p===void 0){for(let{source:{sourceLinks:o}}of f)o.sort(P);for(let{target:{targetLinks:o}}of t)o.sort(J)}}function tt(t){if(p===void 0)for(let{sourceLinks:f,targetLinks:o}of t)f.sort(P),o.sort(J)}function et(t,f){let o=t.y0-(t.sourceLinks.length-1)*m/2;for(let{target:n,width:e}of t.sourceLinks){if(n===f)break;o+=e+m}for(let{source:n,width:e}of f.targetLinks){if(n===t)break;o-=e}return o}function ot(t,f){let o=f.y0-(f.targetLinks.length-1)*m/2;for(let{source:n,width:e}of f.targetLinks){if(n===t)break;o+=e+m}for(let{target:n,width:e}of t.sourceLinks){if(n===f)break;o-=e}return o}return c}return it(dt);})();
		/**
		 * Browser half of the cost-analytics plugin: a billing pill beside the
		 * token-usage pill in the composer dock, and the cost-analytics settings
		 * section over the whole session library.
		 *
		 * Both surfaces read the same two host-owned settings namespaces through
		 * scopes bound in `apply`: `cost-analytics-usage` carries the host
		 * rollup (per-session, per-provider/model requests, four token buckets, and
		 * peak/off-peak splits, with subagent sessions already folded into their
		 * parent), and `cost-analytics` carries the currency and price table.
		 * Money is computed here and nowhere else, so a price edit reprices every
		 * view without a rescan.
		 *
		 * The dock pill renders only for the current session's own row; a
		 * subagent session has no row of its own by construction. When the host's
		 * token-usage row is present, the pill is portaled into that row so both
		 * controls share its flex layout. Its popover remains anchored to the pill
		 * inside a relatively positioned wrapper.
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
			chartChannels: "渠道 Token", chartTokens: "模型 Token", chartCost: "开销", chartUnknown: "未知",
			chartScale: "渠道按提供者汇总，模型按模型 ID 汇总；各列独立按占比缩放。",
			dialogTitle: "本次会话计费",
			pillTitle: "{cost} · {requests} 次请求",
			sankeyRequests: "{count} 次请求",
			tokenCount: "{count} tok",
			summaryRequests: "{count} 次请求",
			tokensLine: "输入 {input} · 缓存读 {read} · 缓存写 {write} · 输出 {out}",
			unpriced: "未配置价格：{models}",
			modelRequests: "{count} 次",
			modelLine: "{requests} · 输入 {input} · 缓存读 {read} · 缓存写 {write} · 输出 {out}",
			peakLine: "高峰 {peak} · 空闲 {offPeak}",
			requestCount: "请求次数",
			inputTokens: "未缓存输入",
			cacheReadTokens: "缓存读取",
			cacheWriteTokens: "缓存写入",
			outputTokens: "输出",
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
			chartChannels: "Channel tokens", chartTokens: "Model tokens", chartCost: "Cost", chartUnknown: "Unknown",
			chartScale: "Channels aggregate by provider and models by model ID; each column uses its own share scale.",
			dialogTitle: "Session billing",
			pillTitle: "{cost} · {requests} requests",
			sankeyRequests: "{count} requests",
			tokenCount: "{count} tok",
			summaryRequests: "{count} requests",
			tokensLine: "Input {input} · cache read {read} · cache write {write} · output {out}",
			unpriced: "No price configured: {models}",
			modelRequests: "{count}",
			modelLine: "{requests} · input {input} · cache read {read} · cache write {write} · output {out}",
			peakLine: "Peak {peak} · off-peak {offPeak}",
			requestCount: "Requests",
			inputTokens: "Uncached input",
			cacheReadTokens: "Cached input",
			cacheWriteTokens: "Cache write",
			outputTokens: "Output",
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
		 * @param price - currency amounts per million tokens for each bucket.
		 * @returns the amount those buckets cost.
		 */
		function bucketCost(buckets, price) {
			return ((buckets.input || 0) * (price.input || 0)
				+ (buckets.cacheRead || 0) * (price.cacheRead || 0)
				+ (buckets.cacheWrite || 0) * (price.cacheWrite || 0)
				+ (buckets.output || 0) * (price.output || 0)) / 1_000_000;
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
		 * @param prices - resolved price table keyed by provider/model, with a
		 * model-only fallback for existing configurations.
		 * @returns per-model rows sorted by amount, plus the row's totals.
		 */
		function priceSession(session, prices) {
			const models = session.models === undefined ? {} : session.models;
			const rows = Object.keys(models).map((model) => {
				const usage = models[model];
				const provider = usage.provider || UNKNOWN_MODEL;
				const modelId = usage.modelId || model;
				const routeKey = provider + '/' + modelId;
				const price = provider === UNKNOWN_MODEL ? prices[modelId] : prices[routeKey] ?? prices[modelId];
				const cost = modelCost(usage, price);
				return { model: routeKey, modelId, provider, usage, cost, priceKey: price === undefined ? null : (prices[routeKey] === undefined ? modelId : routeKey) };
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
		 * @returns summary totals, unpriced provider/model ids, and ordered project groups.
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
		const svgText = { fontSize: 13, fontWeight: 500, fill: "var(--dsw-alias-label-secondary)" };
		const sankeyStyle = { width: "100%", height: "auto", display: "block", overflow: "visible" };
		/**
		 * Lay out the three independent metric columns used by the chart.
		 * Ribbons connect provider totals to model totals, then model totals to
		 * provider/model costs; zero and unknown costs retain labels but no area.
		 * @param weights - one non-negative value for each node in the column.
		 * @param x - horizontal node position.
		 * @param top - first usable y coordinate.
		 * @param bottom - last usable y coordinate.
		 * @param gap - minimum spacing between positive nodes.
		 * @returns positioned nodes with zero-height entries for missing values.
		 */
		function layoutColumn(weights, x, top, bottom, gap) {
			const positive = weights.map((value, index) => ({ value, index })).filter(item => item.value > 0);
			const missing = weights.map((value, index) => ({ value, index })).filter(item => item.value <= 0);
			const result = new Array(weights.length);
			const limit = bottom - missing.length * gap;
			if (positive.length) {
				const nodes = positive.flatMap(item => [
					{ id: 'left:' + item.index, order: item.index },
					{ id: 'right:' + item.index, order: item.index },
				]);
				const links = positive.map(item => ({
					source: 'left:' + item.index, target: 'right:' + item.index, value: item.value,
				}));
				const graph = d3Sankey.sankey().nodeId(node => node.id).nodeWidth(10)
					.nodePadding(gap).nodeSort((a, b) => a.order - b.order)
					.extent([[0, top], [40, limit]])({ nodes, links });
				for (const node of graph.nodes.filter(node => node.id.startsWith('left:'))) {
					result[node.order] = { x, y0: node.y0, y1: node.y1 };
				}
			}
			missing.forEach((item, index) => {
				const y = positive.length ? limit + gap * (index + 1) : top + gap * index;
				result[item.index] = { x, y0: y, y1: y };
			});
			return result;
		}
		/**
		 * Render channel Token → model Token → cost as three independently scaled
		 * columns. A route is the provider/model row emitted by the host rollup.
		 * @param props - priced model rows and locale formatting.
		 */
		function Sankey({ rows, currency, tag, t }) {
			const width = 760;
			const height = Math.max(340, rows.length * 80 + 80);
			const top = 48;
			const bottom = height - 32;
			const gap = 42;
			const xs = [12, 375, 738];
			const channels = [];
			const channelByProvider = new Map();
			const models = [];
			const modelById = new Map();
			const routes = rows.map(row => {
				const usage = row.usage || {};
				const provider = row.provider || UNKNOWN_MODEL;
				const modelId = row.modelId || row.model || UNKNOWN_MODEL;
				const tokens = (usage.input || 0) + (usage.cacheRead || 0) + (usage.cacheWrite || 0) + (usage.output || 0);
				let channelIndex = channelByProvider.get(provider);
				if (channelIndex === undefined) {
					channelIndex = channels.length;
					channelByProvider.set(provider, channelIndex);
					channels.push({ provider, tokens: 0 });
				}
				channels[channelIndex].tokens += tokens;
				let modelIndex = modelById.get(modelId);
				if (modelIndex === undefined) {
					modelIndex = models.length;
					modelById.set(modelId, modelIndex);
					models.push({ modelId, tokens: 0 });
				}
				models[modelIndex].tokens += tokens;
				return {
					row, provider, modelId, tokens, channelIndex, modelIndex,
					cost: typeof row.cost === 'number' && Number.isFinite(row.cost) && row.cost > 0 ? row.cost : 0,
				};
			});
			const values = [channels.map(channel => channel.tokens), models.map(model => model.tokens), routes.map(route => route.cost)];
			const columns = values.map((weights, column) => layoutColumn(weights, xs[column], top, bottom, gap));
			const children = [];
			const titles = [t('chartChannels'), t('chartTokens'), t('chartCost')];
			titles.forEach((label, column) => children.push(react.createElement('text', {
				key: 'heading-' + column, x: xs[column], y: 20,
				textAnchor: column === 2 ? 'end' : 'start', style: svgText,
			}, label)));
			const appendLink = (key, source, target, sourceY0, sourceY1, targetY0, targetY1, color, name) => {
				if (sourceY0 === sourceY1 || targetY0 === targetY1) return;
				const x0 = source.x + 10;
				const x1 = target.x;
				const mid = (x0 + x1) / 2;
				children.push(react.createElement('path', {
					key, d: `M ${x0},${sourceY0} C ${mid},${sourceY0} ${mid},${targetY0} ${x1},${targetY0} L ${x1},${targetY1} C ${mid},${targetY1} ${mid},${sourceY1} ${x0},${sourceY1} Z`,
					fill: color, fillOpacity: 0.28,
				}, react.createElement('title', null, name)));
			};
			const channelOffsets = channels.map(() => 0);
			const modelTargetOffsets = models.map(() => 0);
			for (const [index, route] of routes.entries()) {
				if (route.tokens <= 0) continue;
				const source = columns[0][route.channelIndex];
				const target = columns[1][route.modelIndex];
				const sourceTotal = channels[route.channelIndex].tokens;
				const targetTotal = models[route.modelIndex].tokens;
				const sourceSpan = (source.y1 - source.y0) * route.tokens / sourceTotal;
				const targetSpan = (target.y1 - target.y0) * route.tokens / targetTotal;
				const sourceY0 = source.y0 + channelOffsets[route.channelIndex];
				const targetY0 = target.y0 + modelTargetOffsets[route.modelIndex];
				channelOffsets[route.channelIndex] += sourceSpan;
				modelTargetOffsets[route.modelIndex] += targetSpan;
				appendLink('link-0-' + index, source, target, sourceY0, sourceY0 + sourceSpan, targetY0, targetY0 + targetSpan,
					MODEL_COLORS[route.modelIndex % MODEL_COLORS.length], route.provider + '/' + route.modelId);
			}
			const modelSourceOffsets = models.map(() => 0);
			for (const [index, route] of routes.entries()) {
				if (route.tokens <= 0) continue;
				const source = columns[1][route.modelIndex];
				const target = columns[2][index];
				const sourceTotal = models[route.modelIndex].tokens;
				const sourceSpan = (source.y1 - source.y0) * route.tokens / sourceTotal;
				const sourceY0 = source.y0 + modelSourceOffsets[route.modelIndex];
				modelSourceOffsets[route.modelIndex] += sourceSpan;
				appendLink('link-1-' + index, source, target, sourceY0, sourceY0 + sourceSpan, target.y0, target.y1,
					MODEL_COLORS[route.modelIndex % MODEL_COLORS.length], route.provider + '/' + route.modelId);
			}
			const nodeColumns = [
				channels.map((channel, index) => ({ name: channel.provider, label: t('tokenCount', { count: formatTokens(channel.tokens) }), colorIndex: index })),
				models.map((model, index) => ({ name: model.modelId, label: t('tokenCount', { count: formatTokens(model.tokens) }), colorIndex: index })),
				routes.map(route => ({ name: route.provider + '/' + route.modelId, label: route.row.cost === null ? t('chartUnknown') : formatMoney(route.row.cost, currency, tag), colorIndex: route.modelIndex })),
			];
			nodeColumns.forEach((nodes, column) => nodes.forEach((item, index) => {
				const node = columns[column][index];
				children.push(react.createElement('rect', {
					key: 'node-' + column + '-' + index,
					x: node.x, y: node.y0, width: 10, height: node.y1 - node.y0,
					fill: MODEL_COLORS[item.colorIndex % MODEL_COLORS.length],
				}, react.createElement('title', null, item.name + ' · ' + item.label)));
				const x = column === 2 ? node.x - 8 : node.x + 18;
				const y = (node.y0 + node.y1) / 2;
				children.push(react.createElement('text', {
					key: 'label-' + column + '-' + index, x, y: y + 4,
					textAnchor: column === 2 ? 'end' : 'start', style: svgText,
				}, [react.createElement('tspan', { key: 'name', x, dy: -6 }, truncate(item.name, 30)),
					react.createElement('tspan', { key: 'value', x, dy: 18 }, item.label)],
				react.createElement('title', null, item.name + ' · ' + item.label)));
			}));
			children.push(react.createElement('text', {
				key: 'scale-note', x: 12, y: height - 6, style: { ...svgText, fontSize: 11 },
			}, t('chartScale')));
			return react.createElement('svg', {
				viewBox: `0 0 ${width} ${height}`, role: 'img',
				'aria-label': titles.join(' → '), style: sankeyStyle,
			}, ...children);
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
		const anchorStyle = { position: "relative", display: "inline-flex", alignItems: "center" };
		const pillStyle = {
			display: "inline-flex",
			alignItems: "center",
			gap: 6,
			boxSizing: "border-box",
			maxWidth: "100%",
			padding: "1px 8px",
			border: "none",
			borderRadius: 24,
			background: "transparent",
			color: "var(--dsw-alias-label-tertiary)",
			font: "inherit",
			fontVariantNumeric: "tabular-nums",
			lineHeight: "inherit",
			whiteSpace: "nowrap",
			cursor: "pointer",
		};
		const backdropStyle = {
			position: "fixed",
			inset: 0,
			zIndex: 1099,
			background: "transparent",
		};
		const panelStyle = {
			position: "fixed",
			bottom: 72,
			left: "50%",
			transform: "translateX(-50%)",
			zIndex: 1100,
			width: "min(800px, calc(100vw - 24px))",
			minWidth: "min(300px, calc(100vw - 24px))",
			maxWidth: "calc(100vw - 24px)",
			maxHeight: "calc(100dvh - 96px)",
			overflowY: "auto",
			boxSizing: "border-box",
			display: "block",
			padding: 16,
			border: 0,
			borderRadius: 12,
			background: "var(--dsw-specific-menu)",
			"--dsw-elevation-stroke-color": "var(--dsw-alias-border-l1)",
			boxShadow: "var(--dsw-elevation-prominent)",
			fontSize: 12,
			lineHeight: "18px",
			color: "var(--dsw-alias-label-secondary)",
			cursor: "default",
		};
		const panelHeadStyle = { display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 8, color: "var(--dsw-alias-label-primary)", fontWeight: 500 };
		const panelTitleLabelStyle = { display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 };
		const panelTitleValueStyle = { fontVariantNumeric: "tabular-nums" };
		const panelTitleRuleStyle = { marginBottom: 10, borderTop: "0.5px solid var(--dsw-alias-border-l2)" };
		const summaryStyle = { display: "grid", gridTemplateColumns: "minmax(76px, auto) minmax(0, 1fr)", gap: "6px 16px", margin: 0, color: "var(--dsw-alias-label-tertiary)" };
		const detailLabelStyle = { minWidth: 0, margin: 0 };
		const detailValueStyle = { minWidth: 0, margin: 0, color: "var(--dsw-alias-label-secondary)", fontVariantNumeric: "tabular-nums", textAlign: "right" };
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
			const [statsDock, setStatsDock] = react.useState(null);
			react.useEffect(() => {
				if (typeof document === "undefined") return undefined;
				setStatsDock(document.querySelector("[data-composer-stats]"));
				return undefined;
			}, [sessionId]);
			react.useEffect(() => {
				if (!open || typeof document === "undefined") return undefined;
				const onKeyDown = (event) => {
					if (event.key === "Escape") setOpen(false);
				};
				document.addEventListener("keydown", onKeyDown);
				return () => { document.removeEventListener("keydown", onKeyDown); };
			}, [open]);
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
			const content = react.createElement("span", { style: anchorStyle, "data-cost-billing-pill": true },
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
				open ? react.createElement("div", { style: panelStyle, role: "dialog", "aria-label": t("dialogTitle") },
					react.createElement("div", { style: panelHeadStyle },
						react.createElement("span", { style: panelTitleLabelStyle }, react.createElement(CoinIcon), t("dialogTitle")),
						react.createElement("span", { style: panelTitleValueStyle }, costText),
					),
					react.createElement("div", { style: panelTitleRuleStyle, "aria-hidden": true }),
					react.createElement("dl", { style: summaryStyle, "data-cost-details": true },
						react.createElement("dt", { style: detailLabelStyle }, t("requestCount")),
						react.createElement("dd", { style: detailValueStyle }, formatCount(totals.requests)),
						react.createElement("dt", { style: detailLabelStyle }, t("inputTokens")),
						react.createElement("dd", { style: detailValueStyle }, t("tokenCount", { count: formatTokens(totals.input) })),
						react.createElement("dt", { style: detailLabelStyle }, t("cacheReadTokens")),
						react.createElement("dd", { style: detailValueStyle }, t("tokenCount", { count: formatTokens(totals.cacheRead) })),
					totals.cacheWrite !== 0 ? react.createElement(react.Fragment, null,
						react.createElement("dt", { style: detailLabelStyle }, t("cacheWriteTokens")),
						react.createElement("dd", { style: detailValueStyle }, t("tokenCount", { count: formatTokens(totals.cacheWrite) })),
					) : null,
					react.createElement("dt", { style: detailLabelStyle }, t("outputTokens")),
					react.createElement("dd", { style: detailValueStyle }, t("tokenCount", { count: formatTokens(totals.output) })),
				),
				unpriced.length > 0 ? react.createElement("span", { style: { ...warnStyle, display: "block", marginTop: 10 } }, t("unpriced", { models: unpriced.join(", ") })) : null,
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
			return statsDock === null ? content : reactDom.createPortal(content, statsDock);
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
		 * The cost-analytics settings page: whole-library totals plus one group
		 * per project and one row per session, archived sessions included.
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

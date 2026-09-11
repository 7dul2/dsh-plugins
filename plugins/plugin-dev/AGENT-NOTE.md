# DSH tutorial command delivery

The plugin registers one command and reads its packaged guide at activation. Command result text remains UI-only; the guide and optional task are sent together using createUserMessage and the receiving Agent's followup method. A guide-only invocation asks for acknowledgement without tools or edits. This avoids accidentally starting repository work before the user supplies a task.

The tutorial is ordinary logged conversation input after Agent admission, not a permanent system prompt. Followup preserves work already in flight by queueing a later turn. Repeated invocation deliberately sends a new guide, including after compaction. No runtime memory flag claims that a model still has an earlier guide in context.

The existing repository command-registration decision remains authoritative; this plugin adds a consumer and does not replace its command lifecycle or model visibility rules. Cordis-owned registration removes discovery and execution when the plugin unloads.

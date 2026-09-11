# General settings retry budget

The standalone plugin owns one durable `model-retry-settings` namespace and one `settings.general.item` row. A prepended request-error waterfall listener supplies the captured budget to the existing llm-retry executor and restores the payload after downstream settlement. It does not implement another retry scheduler or mutate registered provider adapters.

The budget is captured at the first `agent/request` event for an Agent step. Subsequent attempts retain it because the executor keys its durable counters by provider policy. Changing that policy during recovery could reset the effective budget. Plugin disposal removes the listeners through Cordis effects; provider registrations remain unchanged.

This local override does not supersede the repository's provider-owned retry policy: disabling it restores that policy. Normal policies retain their eligible errors and backoff. Always policies become bounded transient recovery while this plugin is enabled. Runtime tests exercise the installed executor's durable retry events and disposal behavior.

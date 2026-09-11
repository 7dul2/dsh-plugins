/**
 * Host half of the archived-chats plugin: none. Pure UI plugin — the empty
 * apply exists so the plugin appears in the host Loader as the entry named in
 * the profile's cordis.patch.yml; the browser half ships via exports
 * ["./client"], discovered through the package.json dsh.client declaration
 * (same split as ui-open-in-app). All state this page reads arrives through
 * client services (workspaces, sessions, locale); the host gains no behavior.
 *
 * @module @deepseek-ai/dsh-client-ui-archived-chats
 */

/** Host plugin body — the page lives entirely in the browser bundle. */
export function apply() {}

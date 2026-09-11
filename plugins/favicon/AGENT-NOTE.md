# Browser tab icon selection

The plugin keeps the existing `/favicon.svg` route and adds a `custom-favicon-settings` namespace for a selected local image. The browser reads the file with the File API, stores only validated base64 image bytes and an allowed MIME type, and updates the current tab immediately with a data URL. The Host reads the selected bytes for later requests and falls back to the configured profile icon when the selection is cleared.

The settings validator bounds decoded image size and rejects unsupported types before persistence. Clearing both fields is the reset path; it deliberately leaves the existing fallback file untouched so the user's original icon remains available. The route sends `no-store` because the selected image can change without a process restart.

// Evaluated at startup, before the URL sync drops unknown query parameters:
// `?debug=1` (or the dev server) exposes the map as window.__map for performance checks.
export const DEBUG = import.meta.env.DEV || new URLSearchParams(location.search).has('debug')

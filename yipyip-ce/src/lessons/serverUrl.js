// This URL is public build configuration. Provider credentials stay on the server.
export function serverUrl(value = 'http://127.0.0.1:8787') {
  const url = new URL(value)
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('VITE_AI_SERVER_URL must be an HTTPS origin, or a local HTTP origin, without credentials or a path.')
  }
  return url.origin
}

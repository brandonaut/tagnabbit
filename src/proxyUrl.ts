/**
 * In development, rewrite barbershoptags.com URLs to go through the Vite dev
 * server proxy (/bst-proxy) to avoid CORS restrictions. In production the
 * original URL is returned unchanged.
 */
export function proxyUrl(url: string): string {
  // Proxy rewriting disabled to test CORS headers directly.
  // const BST_ORIGIN = 'https://www.barbershoptags.com';
  // if (import.meta.env.DEV && url.startsWith(BST_ORIGIN)) {
  //   return '/bst-proxy' + url.slice(BST_ORIGIN.length);
  // }
  return url;
}

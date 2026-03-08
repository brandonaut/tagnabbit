// pdfjs-dist uses Map.prototype.getOrInsertComputed which is only in newer browsers
if (!("getOrInsertComputed" in Map.prototype)) {
  ;(Map.prototype as unknown as Record<string, unknown>).getOrInsertComputed = function <K, V>(
    this: Map<K, V>,
    key: K,
    callbackfn: (key: K) => V,
  ): V {
    if (!this.has(key)) this.set(key, callbackfn(key))
    return this.get(key) as V
  }
}

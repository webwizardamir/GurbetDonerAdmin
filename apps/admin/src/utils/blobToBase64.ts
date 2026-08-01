/**
 * Blob → base64 string, for handing a rendered PDF to the send-document-email
 * edge function (which takes `pdf_base64`).
 *
 * The chunking is load-bearing: `String.fromCharCode.apply(null, wholeArray)`
 * blows the argument limit and throws `RangeError: Maximum call stack size
 * exceeded` on anything above a few hundred KB — which a multi-page invoice
 * reaches. 0x8000 bytes per call stays comfortably inside it.
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const chunk = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)))
  }
  return btoa(binary)
}

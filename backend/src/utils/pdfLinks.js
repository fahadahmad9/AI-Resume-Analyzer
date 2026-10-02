async function extractEmbeddedPdfLinks(buffer) {
  try {
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const document = await getDocument({ data: new Uint8Array(buffer) }).promise
    const links = []

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const annotations = await page.getAnnotations()

      for (const annotation of annotations) {
        if (annotation.subtype !== 'Link') continue

        const url = annotation.url || annotation.unsafeUrl
        if (url) links.push(url)
      }
    }

    return links
  } catch (error) {
    console.warn('PDF hyperlink extraction failed:', error.message)
    return []
  }
}

module.exports = { extractEmbeddedPdfLinks }
const XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://elementsmiltonhomes.com/</loc>
    <lastmod>2026-10-05</lastmod>
    <xhtml:link rel="amphtml" href="https://elementsmiltonhomes.com/amp.html"/>
  </url>
  <url>
    <loc>https://elementsmiltonhomes.com/privacy.html</loc>
    <lastmod>2026-10-05</lastmod>
  </url>
  <url>
    <loc>https://elementsmiltonhomes.com/terms.html</loc>
    <lastmod>2026-10-05</lastmod>
  </url>
</urlset>
`

module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/xml; charset=UTF-8')
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
  res.status(200).send(XML)
}

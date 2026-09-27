const XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://elementsmiltonhomes.com/</loc>
    <lastmod>2026-09-27</lastmod>
  </url>
  <url>
    <loc>https://elementsmiltonhomes.com/privacy.html</loc>
    <lastmod>2026-09-27</lastmod>
  </url>
  <url>
    <loc>https://elementsmiltonhomes.com/terms.html</loc>
    <lastmod>2026-09-27</lastmod>
  </url>
</urlset>
`

module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/xml; charset=UTF-8')
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
  res.status(200).send(XML)
}

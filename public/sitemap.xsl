<?xml version="1.0" encoding="UTF-8"?>
<!--
  Human-readable view of the XML sitemap. Browsers apply this stylesheet when
  someone opens /sitemap-index.xml or /sitemap-0.xml; search engines ignore it
  and read the raw XML as before.
-->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"
  exclude-result-prefixes="s">
  <xsl:output method="html" encoding="UTF-8" indent="yes" doctype-system="about:legacy-compat"/>

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta name="robots" content="noindex, follow"/>
        <title>Sitemap | iFIXX Remodeling</title>
        <style>
          :root { --ink: #1f2933; --muted: #6b7280; --line: #e5e7eb; --accent: #b6964a; --bg: #fafaf7; }
          * { box-sizing: border-box; }
          body { margin: 0; background: var(--bg); color: var(--ink);
                 font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          main { max-width: 960px; margin: 0 auto; padding: 40px 16px 64px; }
          header { border-bottom: 3px solid var(--accent); padding-bottom: 16px; margin-bottom: 24px; }
          h1 { margin: 0 0 4px; font-size: 26px; }
          p { margin: 0; color: var(--muted); }
          table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid var(--line); }
          th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
          th { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); background: #f4f4f0; }
          td.num, th.num { text-align: right; white-space: nowrap; }
          td.date { white-space: nowrap; color: var(--muted); }
          a { color: var(--ink); text-decoration: none; word-break: break-all; }
          a:hover { color: var(--accent); text-decoration: underline; }
          tr:last-child td { border-bottom: 0; }
          @media (max-width: 640px) { .opt { display: none; } }
        </style>
      </head>
      <body>
        <main>
          <xsl:choose>
            <xsl:when test="s:sitemapindex">
              <header>
                <h1>iFIXX Remodeling sitemap</h1>
                <p><xsl:value-of select="count(s:sitemapindex/s:sitemap)"/> sitemap file(s). Open one to see its pages.</p>
              </header>
              <table>
                <thead><tr><th>Sitemap</th><th class="opt">Last updated</th></tr></thead>
                <tbody>
                  <xsl:for-each select="s:sitemapindex/s:sitemap">
                    <tr>
                      <td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td>
                      <td class="date opt"><xsl:value-of select="substring(s:lastmod, 1, 10)"/></td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </xsl:when>
            <xsl:otherwise>
              <header>
                <h1>iFIXX Remodeling sitemap</h1>
                <p><xsl:value-of select="count(s:urlset/s:url)"/> pages listed for search engines.</p>
              </header>
              <table>
                <thead><tr><th>Page</th><th class="opt">Last updated</th><th class="num opt">Priority</th></tr></thead>
                <tbody>
                  <xsl:for-each select="s:urlset/s:url">
                    <tr>
                      <td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td>
                      <td class="date opt"><xsl:value-of select="substring(s:lastmod, 1, 10)"/></td>
                      <td class="num opt"><xsl:value-of select="s:priority"/></td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
            </xsl:otherwise>
          </xsl:choose>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>

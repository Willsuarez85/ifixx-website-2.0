import type { APIRoute } from 'astro';

// Returns a real HTTP 410 Gone for retired URLs (services iFIXX does not offer —
// plumbing and electrical). vercel.json rewrites the retired paths here so the
// original URL stays put and Google is told the page is permanently gone (not a
// soft 404, not a redirect to a service we don't provide).
export const prerender = false;

const body = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex" />
  <title>Page no longer available | iFIXX</title>
  <style>
    body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#171717;color:#fff;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:2rem}
    .box{max-width:32rem}
    h1{font-size:1.75rem;margin:0 0 .75rem}
    p{color:#d4d4d4;line-height:1.6;margin:0 0 1.5rem}
    a{display:inline-block;background:#f59e0b;color:#171717;font-weight:700;text-decoration:none;padding:.85rem 1.5rem;border-radius:.6rem;margin:.25rem}
    a.ghost{background:transparent;color:#fff;border:1px solid #404040}
  </style>
</head>
<body>
  <div class="box">
    <h1>This page is no longer available</h1>
    <p>iFIXX is a Charlotte handyman &amp; remodeler. We don't offer this service, but we can still help with drywall, carpentry, painting, decks, doors &amp; windows, and more.</p>
    <a href="/services">See what we do</a>
    <a class="ghost" href="/">Home</a>
    <a class="ghost" href="tel:+19803916833">Call (980) 391-6833</a>
  </div>
</body>
</html>`;

const gone = () =>
  new Response(body, {
    status: 410,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex'
    }
  });

export const GET: APIRoute = gone;
export const ALL: APIRoute = gone;

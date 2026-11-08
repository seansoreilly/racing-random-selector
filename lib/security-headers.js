// Security headers applied to every response served by server.js.
// Keep in sync with the route-level headers in vercel.json.
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  // Report-Only on purpose: violations are logged in the browser console but nothing is blocked.
  "Content-Security-Policy-Report-Only": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://plausible.io",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com",
    "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://plausible.io https://vitals.vercel-insights.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; "),
};

function securityHeadersMiddleware(req, res, next) {
  res.set(securityHeaders);
  next();
}

module.exports = { securityHeaders, securityHeadersMiddleware };

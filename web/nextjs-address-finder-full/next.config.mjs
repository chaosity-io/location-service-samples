/** @type {import('next').NextConfig} */
const nextConfig = {
  // Source maps in production builds make the testbed debuggable in the browser.
  productionBrowserSourceMaps: true,
  // Don't let `next dev` generate AGENTS.md / CLAUDE.md boilerplate in the sample.
  // (A `next.config.js` used to sit beside this file and won — Next loads .js
  // first — so this file was ignored and the boilerplate kept coming back.)
  agentRules: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

export default nextConfig

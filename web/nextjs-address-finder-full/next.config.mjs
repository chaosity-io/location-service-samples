/** @type {import('next').NextConfig} */
const nextConfig = {
  // Source maps in production builds make the testbed debuggable in the browser.
  productionBrowserSourceMaps: true,
  // Don't let `next dev` generate AGENTS.md / CLAUDE.md boilerplate in the sample.
  agentRules: false,
}

export default nextConfig

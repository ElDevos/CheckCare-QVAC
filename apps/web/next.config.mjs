/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The @checkcare/* workspace packages are consumed as raw TypeScript
  // source (not pre-built) and use NodeNext-style relative imports ending
  // in `.js` that actually point at `.ts` files (correct for Node/tsx's
  // real ESM resolver, which apps/edge and the test suite run under).
  // Webpack's resolver doesn't do that `.js` → `.ts` remapping on its own,
  // so we teach it to here rather than changing working, already-tested
  // Node-side import specifiers.
  transpilePackages: ['@checkcare/shared-types', '@checkcare/safety-rules', '@checkcare/ui'],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js']
    }
    return config
  }
}

export default nextConfig

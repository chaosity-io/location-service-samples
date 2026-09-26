import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
      // MapLibre's worker, copied from node_modules by scripts/copy-maplibre-worker.mjs
      'public/maplibre/**',
    ],
  },
]

export default eslintConfig

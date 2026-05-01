import nextConfig from 'eslint-config-next/core-web-vitals'

export default [
  ...nextConfig,
  {
    rules: {
      // New rules added in eslint-config-next@16 / react-hooks@5 that weren't
      // enforced before. Disabling to preserve existing lint baseline —
      // should be revisited and fixed incrementally in follow-up PRs.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/error-boundaries': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/static-components': 'off',
    },
  },
]

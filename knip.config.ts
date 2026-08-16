import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ['src/main.ts'],
  project: ['src/**/*.ts', 'tests/**/*.ts', 'scripts/**/*.ts'],
  exclude: ['**/node_modules/**', '**/.git/**', '**/.synth/**', '**/dist/**'],
};

export default config;

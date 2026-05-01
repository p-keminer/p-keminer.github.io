const truthyFeatureFlagValues = new Set(['1', 'true', 'yes', 'on']);

export const ENABLE_TV_SHOWCASE = truthyFeatureFlagValues.has(
  String(import.meta.env.VITE_ENABLE_TV_SHOWCASE ?? '').toLowerCase()
);

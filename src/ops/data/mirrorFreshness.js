export const DEFAULT_MIRROR_MAX_AGE_MINUTES = 90;

export function getMirrorFreshness(generatedAt, options = {}) {
  const maxAgeMinutes = options.maxAgeMinutes || DEFAULT_MIRROR_MAX_AGE_MINUTES;
  const nowMs = options.nowMs || Date.now();

  if (!generatedAt) {
    return {
      state: 'fallback',
      label: 'Fallback data',
      detail: 'Generated timestamp is missing, so this surface is using bundled fallback data.',
      ageMinutes: null,
      maxAgeMinutes,
    };
  }

  const generatedMs = Date.parse(generatedAt);
  if (Number.isNaN(generatedMs)) {
    return {
      state: 'fallback',
      label: 'Fallback data',
      detail: 'Generated timestamp is invalid, so this surface is using the safest bounded fallback state.',
      ageMinutes: null,
      maxAgeMinutes,
    };
  }

  const ageMinutes = Math.max(0, Math.round((nowMs - generatedMs) / 60000));
  if (ageMinutes > maxAgeMinutes) {
    return {
      state: 'stale',
      label: 'Stale mirror',
      detail: `Mirror is ${ageMinutes} minutes old. Scheduled refresh should update it within ${maxAgeMinutes} minutes.`,
      ageMinutes,
      maxAgeMinutes,
    };
  }

  return {
    state: 'current',
    label: 'Current mirror',
    detail: `Mirror refreshed ${ageMinutes} minutes ago.`,
    ageMinutes,
    maxAgeMinutes,
  };
}

export function freshnessTone(state) {
  if (state === 'current') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }
  if (state === 'stale') {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }
  return 'border-red-200 bg-red-50 text-red-700';
}

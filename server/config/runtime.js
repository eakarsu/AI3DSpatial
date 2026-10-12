'use strict';
function validateRuntime(env = process.env) {
  const errors = [];
  if (!env.DATABASE_URL) errors.push('DATABASE_URL is required');
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) errors.push('JWT_SECRET must contain at least 32 characters');
  if (env.NODE_ENV === 'production' && !env.CLIENT_URL) errors.push('CLIENT_URL is required in production');
  if (env.NODE_ENV === 'production' && env.ENABLE_LEGACY_PROTOTYPE_ROUTES === 'true') errors.push('Legacy prototype routes cannot be enabled in production');
  if (errors.length) throw new Error(errors.join('; '));
  // Archived prototypes are outside the supported product API. An obsolete
  // local flag must never bypass source/approval boundaries at normal startup.
  return { legacyPrototypeRoutesEnabled: false };
}
module.exports = { validateRuntime };

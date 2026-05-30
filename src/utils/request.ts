export type OmitUndefined<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};

/** Omit keys whose values are `undefined` (for exactOptionalPropertyTypes). */
export function omitUndefined<T extends Record<string, unknown>>(
  value: T,
): OmitUndefined<T> {
  const out = {} as OmitUndefined<T>;
  for (const key of Object.keys(value) as (keyof T)[]) {
    if (value[key] !== undefined) {
      (out as unknown as Record<keyof T, unknown>)[key] = value[key];
    }
  }
  return out;
}

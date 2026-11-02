export const UNITS = ["kg", "g", "litre", "ml", "piece", "packet", "box", "bundle", "dozen", "metre"];

// "Kg" and "KG" both become "kg", so the same unit is never spelled two ways.
export const normUnit = (raw: string) => {
  const u = raw.trim();
  return UNITS.find((x) => x.toLowerCase() === u.toLowerCase()) ?? u;
};

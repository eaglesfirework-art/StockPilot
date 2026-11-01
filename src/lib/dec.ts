import { Prisma } from "@prisma/client";

export type Dec = Prisma.Decimal;
export const D = (v: Prisma.Decimal.Value): Dec => new Prisma.Decimal(v);
export const ZERO = D(0);
export const r2 = (v: Dec) => v.toDecimalPlaces(2);
export const r4 = (v: Dec) => v.toDecimalPlaces(4);
export const sum = (xs: Dec[]) => xs.reduce((a, b) => a.plus(b), ZERO);

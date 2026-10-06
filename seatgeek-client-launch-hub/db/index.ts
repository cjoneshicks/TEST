import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

type D1DatabaseBinding = Parameters<typeof drizzle>[0];

type PortalRuntime = typeof globalThis & {
  __SEATGEEK_PORTAL_ENV__?: {
    DB?: D1DatabaseBinding;
  };
};

export function getDb() {
  const binding = (globalThis as PortalRuntime).__SEATGEEK_PORTAL_ENV__?.DB;
  if (!binding) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(binding, { schema });
}

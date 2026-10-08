import { z } from "zod";

export const setupStatus = z.object({
  /** What stops a debate from starting, in words that say which key to add. */
  problems: z.array(z.string()),
  /** Models beyond the roster that the keys in scope unlock, picked by `channel:id` key. */
  catalogue: z.array(
    z.object({ key: z.string(), label: z.string(), vendor: z.string(), via: z.string(), detail: z.string() }),
  ),
  /** Sources whose list could not be read, such as a rejected key. */
  notes: z.array(z.string()),
  models: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      status: z.enum(["available", "missing-key", "unknown-id"]),
      route: z.string().nullable(),
      detail: z.string(),
    }),
  ),
});

export type SetupStatus = z.infer<typeof setupStatus>;

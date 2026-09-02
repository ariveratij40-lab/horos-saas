import {
  describe,
  expect,
  it,
} from "vitest";

import { appRouter } from "./routers";

describe(
  "APP-007E cross-module traceability contract",
  () => {
    const procedures = appRouter._def.procedures;

    it(
      "exposes request to ticket navigation",
      () => {
        expect(
          procedures[
            "serviceTraceability.canonicalForRequest"
          ],
        ).toBeDefined();
      },
    );

    it(
      "exposes ticket to request navigation",
      () => {
        expect(
          procedures[
            "serviceTraceability.canonicalForTicket"
          ],
        ).toBeDefined();
      },
    );
  },
);

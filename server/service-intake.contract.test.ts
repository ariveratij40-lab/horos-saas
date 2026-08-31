import {
  describe,
  expect,
  it,
} from "vitest";

import {
  appRouter,
} from "./routers";

describe(
  "APP-007E canonical Service Intake contract",
  () => {
    const procedures =
      appRouter._def.procedures;

    it(
      "exposes canonical request reads and create",
      () => {
        expect(
          procedures[
            "serviceRequests.canonicalList"
          ],
        ).toBeDefined();

        expect(
          procedures[
            "serviceRequests.canonicalGetById"
          ],
        ).toBeDefined();

        expect(
          procedures[
            "serviceRequests.canonicalCreate"
          ],
        ).toBeDefined();
      },
    );

    it(
      "exposes tenant-safe create context",
      () => {
        expect(
          procedures[
            "serviceRequestContext.canonicalOptions"
          ],
        ).toBeDefined();
      },
    );

    it(
      "exposes canonical lifecycle surfaces",
      () => {
        expect(
          procedures[
            "serviceRequestContext.workflow.canonicalSubmit"
          ],
        ).toBeDefined();

        expect(
          procedures[
            "serviceRequestContext.workflow.canonicalEvents"
          ],
        ).toBeDefined();
      },
    );
  },
);

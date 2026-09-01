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
            "serviceRequestContext.workflow.canonicalCancel"
          ],
        ).toBeDefined();

        expect(
          procedures[
            "serviceRequestContext.workflow.canonicalRequestInformation"
          ],
        ).toBeDefined();

        expect(
          procedures[
            "serviceRequestContext.workflow.canonicalMarkReadyForReview"
          ],
        ).toBeDefined();

        expect(
          procedures[
            "serviceRequestContext.workflow.canonicalEvents"
          ],
        ).toBeDefined();
      },
    );

    it(
      "exposes requester information response separately from review",
      () => {
        expect(
          procedures[
            "serviceRequestContext.requester.canonicalProvideInformation"
          ],
        ).toBeDefined();
      },
    );

    it(
      "exposes administrative review start separately from requester actions",
      () => {
        expect(
          procedures[
            "serviceRequestContext.review.canonicalStartReview"
          ],
        ).toBeDefined();
      },
    );
  },
);

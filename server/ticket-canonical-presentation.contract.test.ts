import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("canonical ticket presentation", () => {
  it("uses the canonical SLA surface instead of legacy SLA fields", () => {
    const detail = source("client/src/pages/TicketDetail.tsx");

    expect(detail).not.toMatch(/ticket\.slaTier/);
    expect(detail).not.toMatch(/ticket\.slaDeadlineHours/);
    expect(detail).not.toMatch(/Nivel SLA/);
    expect(detail).not.toMatch(/Horas objetivo/);
    expect(detail).toMatch(/Facturable/);
    expect(detail).toMatch(/Respondido/);
    expect(detail).toMatch(/Resuelto/);
  });

  it("normalizes serialized event metadata before deriving ledger titles", () => {
    const workflow = source(
      "client/src/components/tickets/CanonicalTicketWorkflowPanel.tsx",
    );

    expect(workflow).toMatch(/typeof normalized === "string"/);
    expect(workflow).toMatch(/JSON\.parse\(normalized\)/);
    expect(workflow).toMatch(/action === "assigned"/);
    expect(workflow).toMatch(/Responsable asignado/);
    expect(workflow).toMatch(/action === "reassigned"/);
    expect(workflow).toMatch(/Responsable reasignado/);
  });
});

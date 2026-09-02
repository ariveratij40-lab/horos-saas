import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string) {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8",
  );
}

describe("canonical policy create UX contract", () => {
  const source = readProjectFile(
    "../client/src/pages/CanonicalPolicies.tsx",
  );

  it("exposes the exact validation issues instead of silently disabling creation", () => {
    expect(source).toContain("const validationIssues = useMemo");
    expect(source).toContain("Formulario listo para crear borrador");
    expect(source).toContain("Falta completar información");
    expect(source).toContain("validationIssues.map");
  });

  it("keeps server submission guarded while allowing the user to request validation feedback", () => {
    expect(source).toContain("if (!formValid)");
    expect(source).toContain("toast.error(validationIssues[0]");
    expect(source).toContain(
      '<Button disabled={create.isPending} onClick={submit}>',
    );
    expect(source).not.toContain(
      "disabled={create.isPending || !formValid}",
    );
  });

  it("validates every canonical SLA priority and annual value explicitly", () => {
    expect(source).toContain("normalizedRules.forEach");
    expect(source).toContain("la resolución no puede ser menor que la respuesta");
    expect(source).toContain("El valor anual debe ser un importe válido mayor o igual a cero");
  });
});

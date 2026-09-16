import { describe, expect, it } from "vitest";
import { classifyAttributeStructure } from "./corrective-diagnostic-detail";

describe("corrective diagnostic structure detection", () => {
  it("recognizes the supported non-JSON structures", () => {
    expect(classifyAttributeStructure('{"Tipo":"AA"}')).toBe("JSON");
    expect(classifyAttributeStructure("{'Tipo': 'AA'}")).toBe("JSON_COMILLAS_SIMPLES");
    expect(classifyAttributeStructure("Tipo: AA | Prioridad: Alta")).toBe("CLAVE_VALOR_DOS_PUNTOS");
    expect(classifyAttributeStructure("Tipo=AA;Prioridad=Alta")).toBe("CLAVE_VALOR_IGUAL");
  });
});

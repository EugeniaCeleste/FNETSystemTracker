import { describe, expect, it } from "vitest";
import { TaskStatus } from "@/contracts/enums";
import {
  ageBucketFrom,
  ageDaysFrom,
  classifyWorkType,
  isActiveCorrectiveStatus,
  isTerminalCorrectiveStatus,
} from "./corrective-rules";

describe("corrective rules", () => {
  it("keeps rejected tasks active and excludes only terminal corrective states", () => {
    expect(isActiveCorrectiveStatus(TaskStatus.REJECTED)).toBe(true);
    expect(isTerminalCorrectiveStatus(TaskStatus.APPROVED)).toBe(true);
    expect(isTerminalCorrectiveStatus(TaskStatus.APPROVED_WITH_PENDING)).toBe(true);
    expect(isTerminalCorrectiveStatus(TaskStatus.CANCELLED)).toBe(true);
  });

  it("calculates age from the supplied origin date and maps the requested bands", () => {
    const now = Date.parse("2026-09-15T12:00:00.000Z");
    expect(ageDaysFrom("2026-09-15T00:00:00.000Z", now)).toBe(0);
    expect(ageDaysFrom("2026-09-01T12:00:00.000Z", now)).toBe(14);
    expect(ageBucketFrom(7)).toBe("0_7");
    expect(ageBucketFrom(14)).toBe("8_14");
    expect(ageBucketFrom(21)).toBe("15_21");
    expect(ageBucketFrom(22)).toBe("OVER_21");
    expect(ageBucketFrom(null)).toBe("NO_DATA");
  });

  it("classifies work from the shared operational rule", () => {
    expect(classifyWorkType(["Revisión de aire acondicionado"])).toBe("AA");
    expect(classifyWorkType(["Service grupo electrógeno"])).toBe("GE");
    expect(classifyWorkType(["Trabajo en altura"])).toBe("ALTURA");
    expect(classifyWorkType(["Adecuación cota 0"])).toBe("COTA_0");
    expect(classifyWorkType(["Mantenimiento general"])).toBe("OTROS");
  });
});

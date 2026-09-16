import { describe, expect, it } from "vitest";
import { crewContainsTechnician, validateCrewPair } from "./task-assignment-rules";

describe("internal crew assignment rules", () => {
  it("accepts two different technicians and gives both the same crew identity", () => {
    const pair = validateCrewPair("A", "B");
    expect(pair?.key).toBe("A + B");
    expect(pair && crewContainsTechnician(pair, "A")).toBe(true);
    expect(pair && crewContainsTechnician(pair, "B")).toBe(true);
  });

  it("rejects assigning the same technician twice", () => {
    expect(validateCrewPair("A", "A")).toBeNull();
    expect(validateCrewPair("A", " a ")).toBeNull();
  });

  it("keeps the crew identity independent of member order", () => {
    expect(validateCrewPair("A", "B")?.key).toBe(validateCrewPair("B", "A")?.key);
  });

  it("treats a new partner as a different historical crew", () => {
    expect(validateCrewPair("A", "B")?.key).not.toBe(validateCrewPair("A", "C")?.key);
  });

  it("rejects incomplete pairs without inventing a second person", () => {
    expect(validateCrewPair("A", "")).toBeNull();
    expect(validateCrewPair("", "B")).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { classifySyncError, SyncError } from "./syncErrors";

describe("classifySyncError", () => {
  it("reconnaît les erreurs de permission", () => {
    expect(classifySyncError({ code: "permission-denied" }).code).toBe("permission");
  });
  it("reconnaît un document trop volumineux", () => {
    expect(classifySyncError(new Error("Document exceeds the maximum size")).code).toBe("too_large");
    expect(classifySyncError({ code: "invalid-argument" }).code).toBe("too_large");
  });
  it("reconnaît les pannes réseau et le quota", () => {
    expect(classifySyncError({ code: "unavailable" }).code).toBe("network");
    expect(classifySyncError({ code: "resource-exhausted" }).code).toBe("quota");
  });
  it("garde les SyncError existantes et gère l'inconnu", () => {
    const e = new SyncError("too_large", "x");
    expect(classifySyncError(e)).toBe(e);
    expect(classifySyncError("bizarre").code).toBe("unknown");
  });
});

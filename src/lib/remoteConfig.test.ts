import { describe, it, expect, vi } from "vitest";

vi.mock("./firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({ doc: vi.fn(), getDoc: vi.fn() }));

import { DEFAULT_REMOTE_CONFIG, sanitizeRemoteConfig, brandLabel } from "./remoteConfig";

// Vérifie uniquement que remoteConfig.ts réexporte correctement le schéma (utilisé par
// RemoteConfigContext.tsx) ; la logique de validation elle-même est testée dans remoteConfigSchema.test.ts.
describe("remoteConfig (réexport)", () => {
  it("réexporte le schéma sans dépendance rompue", () => {
    expect(DEFAULT_REMOTE_CONFIG.brand.name).toBe("SOCADEL");
    expect(sanitizeRemoteConfig(null)).toEqual(DEFAULT_REMOTE_CONFIG);
    expect(brandLabel(DEFAULT_REMOTE_CONFIG)).toBe("SOCADEL (ex-ENEO)");
  });
});

import { describe, it, expect } from "vitest";
import { assessTid } from "./tid";

describe("assessTid", () => {
  it("le code 873 prime sur l'année de pose", () => {
    expect(assessTid("02", 2019).verdict).toBe("done");
    expect(assessTid("01", 2024).verdict).toBe("todo");
  });
  it("estime le risque selon l'année de pose", () => {
    expect(assessTid("unknown", 2017).verdict).toBe("likely");
    expect(assessTid("unknown", 2021).verdict).toBe("likely");
    expect(assessTid("unknown", 2022).verdict).toBe("unlikely");
    expect(assessTid("unknown", 2010).verdict).toBe("unlikely");
  });
  it("demande de vérifier sans information", () => {
    expect(assessTid("unknown").verdict).toBe("unknown");
    expect(assessTid("unknown", NaN).verdict).toBe("unknown");
  });
});

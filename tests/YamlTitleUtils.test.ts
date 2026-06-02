import { aliasesToSignature } from "../src/utils/misc/YamlTitleUtils";

describe("aliasesToSignature", () => {
  it("returns empty string when aliases are missing or empty", () => {
    expect(aliasesToSignature(undefined)).toBe("");
    expect(aliasesToSignature(null)).toBe("");
    expect(aliasesToSignature([])).toBe("");
    expect(aliasesToSignature("")).toBe("");
    expect(aliasesToSignature("   ")).toBe("");
  });

  it("normalizes a single string alias", () => {
    expect(aliasesToSignature("foo.bar")).toBe("foo.bar");
    expect(aliasesToSignature("  foo.bar  ")).toBe("foo.bar");
  });

  it("detects when an alias is added or removed", () => {
    const one = aliasesToSignature(["alpha"]);
    const two = aliasesToSignature(["alpha", "beta"]);
    const none = aliasesToSignature([]);

    expect(one).not.toBe(two);
    expect(one).not.toBe(none);
    expect(two).toBe("alpha\nbeta");
  });

  it("detects when alias order changes", () => {
    const first = aliasesToSignature(["alpha", "beta"]);
    const second = aliasesToSignature(["beta", "alpha"]);

    expect(first).not.toBe(second);
    expect(first).toBe("alpha\nbeta");
    expect(second).toBe("beta\nalpha");
  });

  it("ignores non-string entries in alias arrays", () => {
    expect(aliasesToSignature(["valid", 1, null, "other"])).toBe("valid\nother");
  });
});

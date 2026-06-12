import { redirectToSignature } from "../src/utils/misc/YamlTitleUtils";

describe("redirectToSignature", () => {
  it("returns empty string when redirect is missing or empty", () => {
    expect(redirectToSignature(undefined)).toBe("");
    expect(redirectToSignature(null)).toBe("");
    expect(redirectToSignature("")).toBe("");
    expect(redirectToSignature("   ")).toBe("");
  });

  it("normalizes a redirect path", () => {
    expect(redirectToSignature("notes/target.md")).toBe("notes/target.md");
    expect(redirectToSignature("  notes/foo  ")).toBe("notes/foo.md");
    expect(redirectToSignature("[[notes/bar]]")).toBe("notes/bar.md");
  });

  it("detects when redirect target changes", () => {
    const first = redirectToSignature("notes/a.md");
    const second = redirectToSignature("notes/b.md");

    expect(first).not.toBe(second);
  });
});

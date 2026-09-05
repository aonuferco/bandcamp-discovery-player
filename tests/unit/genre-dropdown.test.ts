import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  normalizeSearchValue,
  fuzzyScore,
  findMatchingGenres,
} from "../../public/js/ui/genre-dropdown";

describe("genre search matching", () => {
  it("treats hyphens and spaces as the same", () => {
    expect(normalizeSearchValue("indie rock")).toBe(
      normalizeSearchValue("indie-rock"),
    );
    expect(findMatchingGenres("indie rock")).toContain("indie-rock");
  });

  it("ranks prefix matches above substring matches", () => {
    const matches = findMatchingGenres("pop");
    const prefix = matches.indexOf("pop-folk");
    const substring = matches.indexOf("inde-pop");
    expect(prefix).toBeGreaterThanOrEqual(0);
    expect(substring).toBeGreaterThanOrEqual(0);
    expect(prefix).toBeLessThan(substring);
  });

  it("tolerates a single typo in queries of 3+ characters", () => {
    expect(findMatchingGenres("brekcore")).toContain("breakcore");
  });

  it("does not match unrelated short noise", () => {
    expect(findMatchingGenres("zz")).toEqual([]);
  });

  it("returns null when the query is empty after normalize", () => {
    expect(fuzzyScore("  ", "house")).toBeNull();
  });
});

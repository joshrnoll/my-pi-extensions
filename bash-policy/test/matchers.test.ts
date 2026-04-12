import test from "node:test";
import assert from "node:assert/strict";
import { findFirstMatchingPattern, matchesCommandSubstring, normalizeCommand } from "../src/matchers.ts";

test("normalizeCommand trims leading and trailing whitespace", () => {
  assert.equal(normalizeCommand("  git status  \n"), "git status");
});

test("matchesCommandSubstring matches full commands and substring commands", () => {
  assert.equal(matchesCommandSubstring("kubectl get pods", "kubectl get *"), true);
  assert.equal(matchesCommandSubstring("kubectl get pods -A", "kubectl get *"), true);
  assert.equal(matchesCommandSubstring("echo hi && kubectl get pods", "kubectl get *"), true);
});

test("matchesCommandSubstring does not match near misses", () => {
  assert.equal(matchesCommandSubstring("kubectl describe pods", "kubectl get *"), false);
  assert.equal(matchesCommandSubstring("git status", "kubectl get *"), false);
});

test("matchesCommandSubstring is case-sensitive", () => {
  assert.equal(matchesCommandSubstring("kubectl get pods", "Kubectl get *"), false);
});

test("findFirstMatchingPattern returns the first matching pattern", () => {
  const pattern = findFirstMatchingPattern("echo hi && kubectl get pods", ["git status", "kubectl get *", "kubectl *"]);
  assert.equal(pattern, "kubectl get *");
});

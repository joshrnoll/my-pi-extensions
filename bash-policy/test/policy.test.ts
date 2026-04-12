import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePolicy } from "../src/policy.ts";

test("evaluatePolicy returns allow when only allow matches", () => {
  const decision = evaluatePolicy("kubectl get pods", {
    allow: ["kubectl get *"],
    deny: [],
  });

  assert.equal(decision.action, "allow");
  assert.equal(decision.pattern, "kubectl get *");
});

test("evaluatePolicy returns deny when only deny matches", () => {
  const decision = evaluatePolicy("rm -rf dist", {
    allow: [],
    deny: ["rm -rf *"],
  });

  assert.equal(decision.action, "deny");
  assert.equal(decision.pattern, "rm -rf *");
  assert.equal(decision.reason, 'Blocked by policy (deny pattern: "rm -rf *")');
});

test("deny wins over allow when both patterns match", () => {
  const decision = evaluatePolicy("kubectl delete pod foo", {
    allow: ["kubectl *"],
    deny: ["kubectl delete *"],
  });

  assert.equal(decision.action, "deny");
  assert.equal(decision.pattern, "kubectl delete *");
});

test("evaluatePolicy returns ask when nothing matches", () => {
  const decision = evaluatePolicy("git status", {
    allow: ["kubectl get *"],
    deny: ["rm -rf *"],
  });

  assert.equal(decision.action, "ask");
  assert.equal(decision.command, "git status");
});

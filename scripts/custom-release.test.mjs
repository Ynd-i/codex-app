import assert from "node:assert/strict";
import test from "node:test";
import { newestUpstreamTag, nextBetaTag, planRelease } from "./custom-release.mjs";

test("the newest upstream tag orders betas before their release and ignores our tags", () => {
  const tags = ["v0.10.3", "v0.11.0-beta.2", "v0.11.0-beta.10", "v0.10.3-v4", "v0.10.3-v5-beta1"];
  assert.equal(newestUpstreamTag(tags), "v0.11.0-beta.10");
  assert.equal(newestUpstreamTag(tags, { stableOnly: true }), "v0.10.3");
  assert.equal(newestUpstreamTag(["v0.11.0-beta.3", "v0.11.0", "desktop-v0.12.0"]), "v0.11.0");
});

test("betas count up within a release, and a stable release starts the next one", () => {
  assert.equal(nextBetaTag("v0.10.3", ["v0.10.3", "v0.11.0-v1-beta1"]), "v0.10.3-v1-beta1");
  assert.equal(
    nextBetaTag("v0.10.3", ["v0.10.3-v1-beta1", "v0.10.3-v1-beta2"]),
    "v0.10.3-v1-beta3",
  );
  assert.equal(nextBetaTag("v0.10.3", ["v0.10.3-v1-beta2", "v0.10.3-v1"]), "v0.10.3-v2-beta1");
});

test("sync merges only a newer upstream stable release and starts at v1-beta1", () => {
  const tags = ["v0.10.3", "v0.11.0-beta.1", "v0.11.0"];
  assert.deepEqual(
    planRelease({ mode: "sync", current: "v0.11.0-beta.1", upstreamStable: "v0.11.0", tags }),
    { merge: "v0.11.0", backend: "v0.11.0", tag: "v0.11.0-v1-beta1", from: "HEAD", reason: "" },
  );
  const onBeta = { mode: "sync", current: "v0.11.0-beta.1", upstreamStable: "v0.10.3", tags };
  assert.equal(planRelease(onBeta).merge, "");
});

test("nothing is released while the branch is on an upstream beta", () => {
  for (const mode of ["beta", "stable"]) {
    assert.equal(planRelease({ mode, current: "v0.11.0-beta.1", tags: [] }).tag, "");
  }
});

test("a beta release needs changes, and stable promotes the latest beta's commit", () => {
  const tags = ["v0.11.0", "v0.11.0-v1-beta1", "v0.11.0-v1-beta2"];
  const current = "v0.11.0";
  assert.equal(planRelease({ mode: "beta", current, tags }).tag, "v0.11.0-v1-beta3");
  assert.equal(planRelease({ mode: "beta", current, tags, latestIsHead: true }).tag, "");
  const stable = planRelease({ mode: "stable", current, tags });
  assert.equal(stable.tag, "v0.11.0-v1");
  assert.equal(stable.from, "v0.11.0-v1-beta2");
  assert.equal(planRelease({ mode: "stable", current, tags: [...tags, "v0.11.0-v1"] }).tag, "");
});

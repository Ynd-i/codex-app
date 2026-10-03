import assert from "node:assert/strict";
import test from "node:test";
import { newestUpstreamTag, nextReleaseTag, planRelease } from "./custom-release.mjs";

test("the newest upstream tag orders betas before their release and ignores our tags", () => {
  assert.equal(
    newestUpstreamTag(["v0.10.3", "v0.11.0-beta.2", "v0.11.0-beta.10", "v0.11.0-beta.3-v4"]),
    "v0.11.0-beta.10",
  );
  assert.equal(newestUpstreamTag(["v0.11.0-beta.3", "v0.11.0", "desktop-v0.12.0"]), "v0.11.0");
});

test("release numbers count our releases on one backend", () => {
  assert.equal(nextReleaseTag("v0.11.0-beta.1", ["v0.11.0-beta.1"]), "v0.11.0-beta.1-v1");
  assert.equal(
    nextReleaseTag("v0.11.0-beta.1", ["v0.11.0-beta.1-v1", "v0.11.0-beta.1-v2", "v0.11.0-v9"]),
    "v0.11.0-beta.1-v3",
  );
});

test("sync merges only a newer upstream release and starts its count at v1", () => {
  const tags = ["v0.11.0-beta.1", "v0.11.0-beta.1-v2", "v0.11.0-beta.3"];
  assert.deepEqual(
    planRelease({ mode: "sync", current: "v0.11.0-beta.1", upstream: "v0.11.0-beta.3", tags }),
    { merge: "v0.11.0-beta.3", backend: "v0.11.0-beta.3", tag: "v0.11.0-beta.3-v1", reason: "" },
  );
  assert.equal(
    planRelease({ mode: "sync", current: "v0.11.0-beta.3", upstream: "v0.11.0-beta.3", tags }).tag,
    "",
  );
});

test("a UI release bumps the count on the current backend unless nothing changed", () => {
  const tags = ["v0.11.0-beta.1", "v0.11.0-beta.1-v1"];
  const current = "v0.11.0-beta.1";
  assert.equal(planRelease({ mode: "ui", current, tags }).tag, "v0.11.0-beta.1-v2");
  assert.equal(planRelease({ mode: "ui", current, tags, lastReleaseIsHead: true }).tag, "");
});

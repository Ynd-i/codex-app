#!/usr/bin/env node
// Plans Paseo Custom releases. A release is tagged v<upstream>-v<N>: <upstream> is the newest
// upstream Paseo release merged into the branch, and N counts our releases on that backend.
//
//   node scripts/custom-release.mjs sync <upstream-ref>  merge the newest upstream release, if any
//   node scripts/custom-release.mjs ui                   release UI changes on the current backend
//
// Prints key=value lines for $GITHUB_OUTPUT: merge, backend, tag, prerelease, reason.
import { execFileSync } from "node:child_process";
import { isMainModule } from "./is-main-module.mjs";
import { parseReleaseVersion } from "./release-version-utils.mjs";

function parseUpstreamTag(tag) {
  if (!tag.startsWith("v")) return null;
  try {
    return parseReleaseVersion(tag.slice(1));
  } catch {
    return null;
  }
}

function versionKey(version) {
  return [version.major, version.minor, version.patch, version.betaNumber ?? Infinity];
}

export function compareUpstreamTags(a, b) {
  const left = versionKey(parseUpstreamTag(a));
  const right = versionKey(parseUpstreamTag(b));
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
  }
  return 0;
}

export function newestUpstreamTag(tags) {
  return (
    tags
      .filter((tag) => parseUpstreamTag(tag))
      .sort(compareUpstreamTags)
      .at(-1) ?? null
  );
}

export function nextReleaseTag(backend, tags) {
  const prefix = `${backend}-v`;
  const counts = tags
    .filter((tag) => tag.startsWith(prefix) && /^\d+$/.test(tag.slice(prefix.length)))
    .map((tag) => Number(tag.slice(prefix.length)));
  return `${prefix}${Math.max(0, ...counts) + 1}`;
}

export function planRelease({ mode, current, upstream, tags, lastReleaseIsHead }) {
  if (!current) throw new Error("No upstream release tag is merged into this branch");
  if (mode === "sync") {
    if (!upstream || compareUpstreamTags(upstream, current) <= 0) {
      return { merge: "", backend: current, tag: "", reason: `backend is current at ${current}` };
    }
    return { merge: upstream, backend: upstream, tag: nextReleaseTag(upstream, tags), reason: "" };
  }
  if (mode === "ui") {
    if (lastReleaseIsHead) {
      return { merge: "", backend: current, tag: "", reason: "no changes since the last release" };
    }
    return { merge: "", backend: current, tag: nextReleaseTag(current, tags), reason: "" };
  }
  throw new Error(`Unknown mode "${mode}"; use sync or ui`);
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function tagsMergedInto(ref) {
  return git("tag", "--merged", ref).split("\n").filter(Boolean);
}

function main([mode, upstreamRef]) {
  const tags = git("tag", "--list").split("\n").filter(Boolean);
  const current = newestUpstreamTag(tagsMergedInto("HEAD"));
  const releaseCount = current ? Number(nextReleaseTag(current, tags).split("-v").at(-1)) - 1 : 0;
  const lastRelease = releaseCount > 0 ? `${current}-v${releaseCount}` : null;
  const plan = planRelease({
    mode,
    current,
    upstream: mode === "sync" ? newestUpstreamTag(tagsMergedInto(upstreamRef)) : null,
    tags,
    lastReleaseIsHead:
      Boolean(lastRelease) &&
      git("rev-parse", `${lastRelease}^{commit}`) === git("rev-parse", "HEAD"),
  });
  const prerelease = plan.tag ? String(parseUpstreamTag(plan.backend).isPrerelease) : "false";
  for (const [key, value] of Object.entries({ ...plan, prerelease })) {
    console.log(`${key}=${value}`);
  }
}

if (isMainModule(import.meta.url)) {
  main(process.argv.slice(2));
}

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const packageDirectory = join(root, "packages/camb-ai-provider");
const artifactsDirectory = join(root, "artifacts");
const archiveName = "camb-ai-vercel-ai-sdk-provider-0.1.0.tgz";
const archivePath = join(artifactsDirectory, archiveName);

function run(command: string[], cwd: string) {
  const result = Bun.spawnSync(command, {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (!result.success) {
    throw new Error(`${command.join(" ")} failed with exit code ${result.exitCode}.`);
  }
}

run(["bun", "run", "build"], packageDirectory);
run(
  [
    "bun",
    "pm",
    "pack",
    "--destination",
    artifactsDirectory,
    "--quiet",
  ],
  packageDirectory,
);

const listing = Bun.spawnSync(["tar", "-tf", archivePath], {
  stdout: "pipe",
  stderr: "inherit",
});
if (!listing.success) throw new Error("Could not inspect the package archive.");

const files = listing.stdout.toString().trim().split("\n");
for (const required of [
  "package/package.json",
  "package/dist/index.js",
  "package/dist/index.d.ts",
  "package/README.md",
  "package/LICENSE",
]) {
  if (!files.includes(required)) {
    throw new Error(`Published package is missing ${required}.`);
  }
}

if (files.some((file) => file.includes("/src/") || file.includes("/tests/"))) {
  throw new Error("Published package unexpectedly contains source files or tests.");
}

const extractionDirectory = await mkdtemp(join(tmpdir(), "camb-provider-pack-"));
try {
  run(["tar", "-xzf", archivePath, "-C", extractionDirectory], root);
  const packageEntry = join(extractionDirectory, "package/dist/index.js");
  const exports = await import(packageEntry);
  const model = exports.createCamb({ apiKey: "package-test" }).speech("mars-flash");
  if (model.specificationVersion !== "v4" || model.modelId !== "mars-flash") {
    throw new Error("The packed package entry point returned an invalid speech model.");
  }
} finally {
  await rm(extractionDirectory, { recursive: true, force: true });
}

console.log(`Verified publishable package: ${archivePath}`);

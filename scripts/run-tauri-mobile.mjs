import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node scripts/run-tauri-mobile.mjs <tauri args>");
  process.exit(1);
}

function defaultAndroidSdkHome() {
  if (process.platform === "win32") {
    const localAppData =
      process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    return path.join(localAppData, "Android", "Sdk");
  }

  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Android", "sdk");
  }

  return path.join(os.homedir(), "Android", "Sdk");
}

function findLatestNdk(androidHome) {
  const ndkDir = path.join(androidHome, "ndk");
  if (!existsSync(ndkDir)) {
    return null;
  }

  const versions = readdirSync(ndkDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) =>
      left.localeCompare(right, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );

  const latest = versions.at(-1);
  return latest ? path.join(ndkDir, latest) : null;
}

function detectJavaHome() {
  const candidates = [
    process.platform === "win32"
      ? "C:\\Program Files\\Android\\Android Studio\\jbr"
      : null,
    process.platform === "darwin"
      ? "/Applications/Android Studio.app/Contents/jbr/Contents/Home"
      : null,
    process.env.JAVA_HOME,
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate)) || null;
}

const androidHome =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  defaultAndroidSdkHome();
const ndkHome = process.env.NDK_HOME || findLatestNdk(androidHome);
const javaHome = detectJavaHome();

const missing = [];

if (!existsSync(androidHome)) {
  missing.push(`ANDROID_HOME not found at ${androidHome}`);
}

if (!ndkHome || !existsSync(ndkHome)) {
  missing.push("NDK_HOME could not be detected from your Android SDK");
}

if (!javaHome || !existsSync(javaHome)) {
  missing.push("JAVA_HOME could not be detected from Android Studio");
}

if (missing.length > 0) {
  console.error("Android prerequisites are missing:");
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  console.error(
    "Install Android Studio with SDK + NDK, or set ANDROID_HOME, NDK_HOME, and JAVA_HOME manually.",
  );
  process.exit(1);
}

const tauriBin = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tauri.cmd" : "tauri",
);

if (!existsSync(tauriBin)) {
  console.error("Tauri CLI is not installed. Run `npm install` first.");
  process.exit(1);
}

console.log(`[tauri-mobile] JAVA_HOME=${javaHome}`);
console.log(`[tauri-mobile] ANDROID_HOME=${androidHome}`);
console.log(`[tauri-mobile] NDK_HOME=${ndkHome}`);

const child = spawn(tauriBin, args, {
  cwd: process.cwd(),
  env: {
    ...process.env,
    JAVA_HOME: javaHome,
    ANDROID_HOME: androidHome,
    NDK_HOME: ndkHome,
  },
  shell: process.platform === "win32",
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

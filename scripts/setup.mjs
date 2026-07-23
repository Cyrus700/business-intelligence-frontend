#!/usr/bin/env node

import { existsSync, copyFileSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const args = process.argv.slice(2);
const CHECK_ENV = args.includes("--check-env");

function print(msg) {
  process.stdout.write(`[setup] ${msg}\n`);
}

function error(msg) {
  process.stderr.write(`[setup] ERROR: ${msg}\n`);
}

// ── 1. Ensure .env.local exists ──────────────────────────────────
const envPath = resolve(ROOT, ".env.local");
const examplePath = resolve(ROOT, ".env.example");

if (!existsSync(envPath)) {
  if (existsSync(examplePath)) {
    copyFileSync(examplePath, envPath);
    print("Created .env.local from .env.example");
  } else {
    writeFileSync(envPath, "# Business Intelligence Frontend\nNEXT_PUBLIC_API_URL=http://localhost:8000/api/v1\n");
    print("Created .env.local with defaults");
  }
} else if (!CHECK_ENV) {
  print(".env.local already exists");
}

// ── 2. Check NEXT_PUBLIC_DEV_API_TOKEN ───────────────────────────
const envContent = readFileSync(envPath, "utf-8");
if (!envContent.includes("NEXT_PUBLIC_DEV_API_TOKEN=") || envContent.includes("NEXT_PUBLIC_DEV_API_TOKEN=\n")) {
  // Try to read the backend's .dev-token
  const backendTokenPath = resolve(ROOT, "..", "business-intelligence-backend", ".dev-token");
  if (existsSync(backendTokenPath)) {
    const token = readFileSync(backendTokenPath, "utf-8").trim();
    if (token) {
      const updated = envContent.replace(
        /^# NEXT_PUBLIC_DEV_API_TOKEN=.*$/m,
        `NEXT_PUBLIC_DEV_API_TOKEN=${token}`
      );
      if (updated === envContent) {
        writeFileSync(envPath, `${envContent.trim()}\nNEXT_PUBLIC_DEV_API_TOKEN=${token}\n`);
      } else {
        writeFileSync(envPath, updated);
      }
      print(`Dev token injected from backend/.dev-token`);
    }
  } else if (!CHECK_ENV) {
    print(
      "No NEXT_PUBLIC_DEV_API_TOKEN set. Run the backend setup first:\n" +
      "  cd ../business-intelligence-backend && uv run python scripts/setup.py --quick"
    );
  }
}

// ── 3. Install deps (only on explicit `setup`) ───────────────────
if (!CHECK_ENV) {
  print("Installing dependencies...");
  execSync("bun install", { cwd: ROOT, stdio: "inherit" });
  print("Setup complete! Run: bun dev");
}

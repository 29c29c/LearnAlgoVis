import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const command = process.argv[2];
if (!command || !["dev", "start"].includes(command)) {
  console.error("Usage: node scripts/next-with-env-port.mjs <dev|start>");
  process.exit(1);
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((values, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return values;

      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) return values;

      const [, key, rawValue] = match;
      values[key] = rawValue.trim().replace(/^(['"])(.*)\1$/, "$2");
      return values;
    }, {});
}

const cwd = process.cwd();
const fileEnv = {
  ...readEnvFile(path.join(cwd, ".env")),
  ...readEnvFile(path.join(cwd, ".env.local")),
};
const port = process.env.PORT || fileEnv.PORT || "3000";

if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  console.error(`Invalid PORT value: ${port}`);
  process.exit(1);
}

const nextBin = path.join(cwd, "node_modules", ".bin", "next");
const child = spawn(nextBin, [command, "-p", port], {
  cwd,
  env: { ...fileEnv, ...process.env, PORT: port },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});

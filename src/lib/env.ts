import path from "node:path";

export const env = {
  databaseUrl: process.env.DATABASE_URL || "./learnalgovis.sqlite",
  sessionSecret: process.env.SESSION_SECRET || "dev-only-change-me",
  adminEmail: (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase(),
  storageDir: process.env.STORAGE_DIR || "./storage",
  maxHtmlBytes: Number(process.env.MAX_HTML_BYTES || 2 * 1024 * 1024),
  appName: process.env.NEXT_PUBLIC_APP_NAME || "LearnAlgoVis",
};

export function resolveFromRoot(inputPath: string) {
  return path.isAbsolute(inputPath) ? inputPath : path.join(process.cwd(), inputPath);
}

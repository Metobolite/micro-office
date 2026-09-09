import nextEnv from "@next/env";
import { getDeploymentErrors } from "../lib/deployment-env.mjs";

// Match Next.js production file precedence, including .env.production.local.
nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error: console.error });
const errors = getDeploymentErrors({ ...process.env, NODE_ENV: "production" });

if (errors.length > 0) {
  console.error("Deployment environment check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("Deployment environment check passed.");
  if (!process.env.RESEND_API_KEY?.trim()) {
    console.log("Invitation emails are disabled until Resend is configured.");
  }
}

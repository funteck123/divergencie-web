// scratch/run_sandbox_etl.ts
import { runSandboxETL } from '../src/lib/db-sandbox-etl';

async function main() {
  console.log("=== Launching Sandbox ETL Pipeline ===");
  try {
    const result = await runSandboxETL();
    console.log("Pipeline result:", result);
  } catch (err) {
    console.error("Pipeline crashed:", err);
    process.exit(1);
  }
}

main();

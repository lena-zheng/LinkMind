import { refreshBriefings } from "../src/lib/briefing";

async function main() {
  const result = await refreshBriefings();
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});

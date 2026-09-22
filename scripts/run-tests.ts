import { runProductionSecuritySuite } from '../tests/production-security-suite.js';

async function main() {
  const summary = await runProductionSecuritySuite();
  if (summary.failed > 0) {
    console.error(`\n❌ ${summary.failed} tests failed!`);
    process.exit(1);
  } else {
    console.log(`\n🎉 All ${summary.passed} security & hardening tests passed successfully!`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});

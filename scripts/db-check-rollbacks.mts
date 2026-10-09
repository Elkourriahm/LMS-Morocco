// Échoue si une migration n'a pas son fichier de rollback (ADR 0006).
// Lancé par `pnpm db:check-rollbacks`, donc par `pnpm lint`. Sans Docker.
import { formatRollbackIssue, readRollbackIssues } from './lib/migrations.mts';

const issues = readRollbackIssues();
if (issues.length > 0) {
  for (const issue of issues) {
    console.error(`db:check-rollbacks : ${formatRollbackIssue(issue)}`);
  }
  process.exitCode = 1;
} else {
  console.log('db:check-rollbacks : chaque migration a son rollback.');
}

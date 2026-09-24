/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Engine-aware database backup command generator for the scheduled-jobs feature.
 * The scheduler (server/lib/schedulerService.ts) runs a shell command stored on
 * each job.
 */

export type BackupEngine = 'postgres' | 'mysql';

export function detectBackupEngine(): BackupEngine {
  const url = process.env.DATABASE_URL?.trim() ?? '';
  if (url.startsWith('mysql://') || url.startsWith('mariadb://')) return 'mysql';
  return 'postgres';
}

/**
 * Returns a backup shell command for the active engine. `$PWD` is expanded by
 * the scheduler; output lands in `<outDir>/<engine>-YYYYMMDD-HHMMSS.(sql|archive)`.
 */
export function getDefaultBackupCommand(outDir = '$PWD/backups'): string {
  const engine = detectBackupEngine();
  const stamp = '$(date +%Y%m%d-%H%M%S)';

  switch (engine) {
    case 'mysql':
      // mysqldump reads credentials from DATABASE_URL via a small parse; adjust to your ops setup.
      return `mkdir -p ${outDir} && mysqldump --result-file=${outDir}/mysql-${stamp}.sql "$MYSQL_DATABASE"`;
    case 'postgres':
    default:
      // Requires DATABASE_URL in the scheduler environment.
      return `mkdir -p ${outDir} && pg_dump "$DATABASE_URL" -Fc -f ${outDir}/postgres-${stamp}.dump`;
  }
}

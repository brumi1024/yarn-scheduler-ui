/**
 * Dialog component for migrating legacy placement rules to JSON format
 */

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { migrateLegacyRules } from '../utils/migration';
import { SPECIAL_VALUES } from '~/types/constants/special-values';
import type { MigrationResult } from '~/types/features/placement-rules';

export const PlacementRulesMigrationDialog = () => {
  const { showMigrationDialog, legacyRules, setShowMigrationDialog, stageGlobalChange } =
    useSchedulerStore();

  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  const handleMigrate = async () => {
    if (!legacyRules) return;

    setIsMigrating(true);
    try {
      const result = migrateLegacyRules(legacyRules);
      setMigrationResult(result);

      if (result.success) {
        // Stage the migration using existing system with proper format
        const rulesConfig = { rules: result.rules };
        stageGlobalChange(SPECIAL_VALUES.MAPPING_RULE_JSON_PROPERTY, rulesConfig);

        // Close dialog after successful migration
        setTimeout(() => {
          setShowMigrationDialog(false);
          setMigrationResult(null);
        }, 2000);
      }
    } catch (error) {
      setMigrationResult({
        success: false,
        rules: [],
        errors: [error instanceof Error ? error.message : 'Migration failed'],
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleCancel = () => {
    setShowMigrationDialog(false);
    setMigrationResult(null);
  };

  return (
    <Dialog open={showMigrationDialog} onOpenChange={setShowMigrationDialog}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Migrate Legacy Placement Rules</DialogTitle>
          <DialogDescription>
            Legacy placement rules have been detected. We recommend migrating to the new JSON format
            for better flexibility and features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The migration will automatically convert your existing rules and stage the changes for
              review. You can review and modify the migrated rules before applying them.
            </AlertDescription>
          </Alert>

          {legacyRules && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Current Legacy Rules:</h4>
              <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto max-h-40">
                {legacyRules}
              </pre>
            </div>
          )}

          {migrationResult && (
            <div className="space-y-2">
              {migrationResult.success ? (
                <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    Successfully converted {migrationResult.rules.length} rules. Changes have been
                    staged for review.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertDescription>
                    Migration failed:
                    <ul className="mt-2 list-disc list-inside">
                      {migrationResult.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isMigrating}>
            Keep Legacy Rules
          </Button>
          <Button
            onClick={handleMigrate}
            disabled={isMigrating || !legacyRules || migrationResult?.success}
          >
            {isMigrating ? 'Migrating...' : 'Migrate to JSON'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { AUTO_CREATION_PROPS } from '~/types/constants/auto-creation';
import type { TemplateScope, TemplateScopeType } from '../types';
import { buildTemplateScopeGroups, createTemplateScope } from '../utils/scopeUtils';
import { TemplateScopeForm } from './TemplateScopeForm';
import { AddTemplateScopeDialog } from './AddTemplateScopeDialog';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Badge } from '~/components/ui/badge';
import { cn } from '~/utils/cn';
import { formatQueuePathLabel } from '../utils/queuePathLabel';

interface TemplateConfigDialogProps {
  open: boolean;
  queuePath: string;
  onClose: () => void;
}

const GROUP_FALLBACK_LABEL: Record<'legacy' | 'flexible', string> = {
  legacy: 'Legacy auto-created queues',
  flexible: 'Flexible auto-created queues',
};

export const TemplateConfigDialog: React.FC<TemplateConfigDialogProps> = ({
  open,
  queuePath,
  onClose,
}) => {
  const getQueuePropertyValue = useSchedulerStore((state) => state.getQueuePropertyValue);
  const stagedChanges = useSchedulerStore((state) => state.stagedChanges);
  const configData = useSchedulerStore((state) => state.configData);

  const [pendingScopes, setPendingScopes] = useState<
    Array<{ queuePath: string; type: TemplateScopeType }>
  >([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedScopeId, setSelectedScopeId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPendingScopes([]);
      setAddDialogOpen(false);
    }
  }, [open]);

  const legacyEnabled = useMemo(() => {
    const { value } = getQueuePropertyValue(queuePath, AUTO_CREATION_PROPS.LEGACY_ENABLED);
    return value === 'true';
  }, [getQueuePropertyValue, queuePath]);

  const flexibleEnabled = useMemo(() => {
    const { value } = getQueuePropertyValue(queuePath, AUTO_CREATION_PROPS.FLEXIBLE_ENABLED);
    return value === 'true';
  }, [getQueuePropertyValue, queuePath]);

  const baseGroups = useMemo(
    () =>
      buildTemplateScopeGroups({
        queuePath,
        configData,
        stagedChanges,
        legacyEnabled,
        flexibleEnabled,
      }),
    [queuePath, configData, stagedChanges, legacyEnabled, flexibleEnabled],
  );

  const mergedGroups = useMemo(() => {
    const map = new Map<'legacy' | 'flexible', { label: string; scopes: TemplateScope[] }>();

    baseGroups.forEach((group) => {
      map.set(group.type, {
        label: group.label,
        scopes: [...group.scopes],
      });
    });

    pendingScopes.forEach((scope) => {
      const groupKey = scope.type === 'legacyLeaf' ? 'legacy' : 'flexible';
      const existing = map.get(groupKey);
      const label = existing?.label ?? GROUP_FALLBACK_LABEL[groupKey];
      if (!existing) {
        map.set(groupKey, { label, scopes: [] });
      }
      const updated = map.get(groupKey);
      if (!updated) {
        return;
      }
      const alreadyPresent = updated.scopes.some((item) => item.queuePath === scope.queuePath);
      if (!alreadyPresent) {
        updated.scopes.push(createTemplateScope(queuePath, scope.queuePath, scope.type));
      }
    });

    return Array.from(map.entries())
      .map(([type, value]) => ({
        type,
        label: value.label,
        scopes: value.scopes.sort((a, b) => a.queuePath.localeCompare(b.queuePath)),
      }))
      .sort((a, b) => (a.type === 'legacy' ? -1 : b.type === 'legacy' ? 1 : 0));
  }, [baseGroups, pendingScopes, queuePath]);

  const existingScopePaths = useMemo(
    () => mergedGroups.flatMap((group) => group.scopes.map((scope) => scope.queuePath)),
    [mergedGroups],
  );

  const handleAddScope = useCallback((scope: { queuePath: string; type: TemplateScopeType }) => {
    setPendingScopes((current) => {
      if (current.some((item) => item.queuePath === scope.queuePath)) {
        return current;
      }
      return [...current, scope];
    });
  }, []);

  const showFlexibleHelpers =
    flexibleEnabled || mergedGroups.some((group) => group.type === 'flexible');

  const allScopes = useMemo(() => mergedGroups.flatMap((group) => group.scopes), [mergedGroups]);

  useEffect(() => {
    if (allScopes.length === 0) {
      setSelectedScopeId(null);
      return;
    }
    setSelectedScopeId((current) => {
      if (current && allScopes.some((scope) => scope.id === current)) {
        return current;
      }
      return allScopes[0]?.id ?? null;
    });
  }, [allScopes]);

  const selectedScope = useMemo(
    () => allScopes.find((scope) => scope.id === selectedScopeId) ?? null,
    [allScopes, selectedScopeId],
  );

  return (
    <>
      <Dialog open={open} onOpenChange={(value) => (value ? undefined : onClose())}>
        <DialogContent className="sm:max-w-5xl lg:max-w-6xl max-h-[85vh] overflow-hidden !flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Template configuration</DialogTitle>
            <DialogDescription>
              Define default properties applied to auto-created queues under{' '}
              <code>{queuePath}</code>.
            </DialogDescription>
          </DialogHeader>

          {!legacyEnabled && !flexibleEnabled && mergedGroups.length === 0 ? (
            <Alert className="shrink-0">
              <AlertTitle>No template scopes available</AlertTitle>
              <AlertDescription>
                Templates are available when legacy or flexible auto queue creation is enabled.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 overflow-hidden">
              <div className="lg:w-72 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold tracking-wide text-muted-foreground">
                      Template scopes
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Select a scope to edit its default properties.
                    </p>
                  </div>
                  {flexibleEnabled && (
                    <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
                      Add wildcard
                    </Button>
                  )}
                </div>

                <ScrollArea
                  className="max-h-[48vh] pr-2"
                  style={{ scrollbarGutter: 'stable both-edges' }}
                >
                  <div className="space-y-4">
                    {mergedGroups.map((group, index) => (
                      <div key={group.type} className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {group.label}
                        </div>
                        <div className="space-y-2">
                          {group.scopes.map((scope) => {
                            const isSelected = scope.id === selectedScopeId;
                            const queuePathLabel =
                              scope.displayQueuePath && scope.isWildcard
                                ? formatQueuePathLabel(scope.displayQueuePath)
                                : scope.displayQueuePath;
                            return (
                              <button
                                key={scope.id}
                                type="button"
                                onClick={() => setSelectedScopeId(scope.id)}
                                className={cn(
                                  'w-full rounded-md border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                  isSelected
                                    ? 'border-primary bg-primary/5 text-primary'
                                    : 'border-border hover:border-primary/50',
                                )}
                              >
                                <div className="flex items-center justify-between gap-2 min-w-0">
                                  <span className="text-sm font-medium truncate">
                                    {scope.displayName}
                                  </span>
                                  {scope.isWildcard && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] uppercase tracking-wide"
                                    >
                                      wildcard
                                    </Badge>
                                  )}
                                </div>
                                {scope.displayQueuePath && (
                                  <div
                                    className="text-xs text-muted-foreground truncate font-mono"
                                    title={scope.displayQueuePath}
                                  >
                                    {queuePathLabel}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {index < mergedGroups.length - 1 && <Separator />}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {showFlexibleHelpers && (
                  <Alert variant="secondary" className="text-xs">
                    <AlertTitle>Wildcard templates</AlertTitle>
                    <AlertDescription>
                      Use wildcard scopes (for example <code>{queuePath}.*</code>) to apply shared
                      defaults. Specific scopes override shared values when both are present.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="flex flex-1 min-w-0 min-h-0">
                {selectedScope ? (
                  <div className="flex-1 min-h-0">
                    <TemplateScopeForm scope={selectedScope} baseQueuePath={queuePath} />
                  </div>
                ) : (
                  <Alert variant="secondary" className="flex-1">
                    <AlertTitle>Select a scope</AlertTitle>
                    <AlertDescription>
                      Choose a template scope from the list to view and edit its properties.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AddTemplateScopeDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        queuePath={queuePath}
        onConfirm={(scope) => {
          handleAddScope(scope);
          const newScopeId = `${scope.type}:${scope.queuePath}`;
          setSelectedScopeId(newScopeId);
        }}
        existingQueuePaths={existingScopePaths}
      />
    </>
  );
};

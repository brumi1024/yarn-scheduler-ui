import { useState, useRef, useEffect } from 'react';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { ChevronDown, ChevronUp, Edit2, Trash2, GripVertical } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import type { PlacementRule } from '~/types/features/placement-rules';
import { cn } from '~/utils/cn';

interface PlacementRuleItemProps {
  rule: PlacementRule;
  index: number;
  isSelected: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSelect: () => void;
  onReorder: (startIndex: number, finishIndex: number) => void;
}

export function PlacementRuleItem({
  rule,
  index,
  isSelected,
  onEdit,
  onDelete,
  onSelect,
  onReorder,
}: PlacementRuleItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cardEl = cardRef.current;
    const dragHandleEl = dragHandleRef.current;
    if (!cardEl || !dragHandleEl) return;

    // Make the card draggable
    const cleanup = draggable({
      element: cardEl,
      dragHandle: dragHandleEl,
      getInitialData: () => ({
        type: 'placement-rule',
        index,
        ruleId: `rule-${index}`,
      }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
    });

    // Make the card a drop target
    const dropCleanup = dropTargetForElements({
      element: cardEl,
      getData: () => ({ index }),
      onDragEnter: ({ source }) => {
        if (source.data.type === 'placement-rule' && source.data.index !== index) {
          setIsDraggedOver(true);
        }
      },
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: ({ source }) => {
        setIsDraggedOver(false);
        if (source.data.type === 'placement-rule' && source.data.index !== index) {
          const sourceIndex = source.data.index as number;
          onReorder(sourceIndex, index);
        }
      },
    });

    return () => {
      cleanup();
      dropCleanup();
    };
  }, [index, onReorder]);

  const getPolicyDisplay = (policy: string): string => {
    const policyMap: Record<string, string> = {
      user: 'User Queue',
      primaryGroup: 'Primary Group',
      primaryGroupUser: 'Primary Group → User',
      secondaryGroup: 'Secondary Group',
      secondaryGroupUser: 'Secondary Group → User',
      specified: 'Specified Queue',
      defaultQueue: 'Default Queue',
      setDefaultQueue: 'Set as Default Queue',
      reject: 'Reject Application',
      custom: 'Custom Placement',
    };
    return policyMap[policy] || policy;
  };

  const getRuleTypeColor = (type: string) => {
    switch (type) {
      case 'user':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'group':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'application':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Card
      ref={cardRef}
      className={cn(
        'transition-all',
        isDragging && 'opacity-50 shadow-2xl',
        isDraggedOver && 'ring-2 ring-blue-500',
        isSelected && 'ring-2 ring-primary',
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div ref={dragHandleRef} className="cursor-grab hover:bg-accent rounded p-1">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>

            <span className="text-sm text-muted-foreground">#{index + 1}</span>

            <Badge className={getRuleTypeColor(rule.type)}>{rule.type}</Badge>

            <span className="font-mono text-sm">{rule.matches}</span>

            <span className="text-sm text-muted-foreground">→</span>

            <span className="font-medium">{getPolicyDisplay(rule.policy)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Edit2 className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Placement Rule</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete this placement rule? This action will be staged
                    and can be reverted before applying.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      onDelete();
                      setShowDeleteDialog(false);
                    }}
                  >
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <Collapsible open={isExpanded}>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Type:</dt>
                <dd className="font-medium">{rule.type}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Matches:</dt>
                <dd className="font-mono">{rule.matches}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Policy:</dt>
                <dd className="font-medium">{rule.policy}</dd>
              </div>
              {rule.parentQueue && (
                <div>
                  <dt className="text-muted-foreground">Parent Queue:</dt>
                  <dd className="font-mono">{rule.parentQueue}</dd>
                </div>
              )}
              {rule.value && (
                <div>
                  <dt className="text-muted-foreground">Queue Value:</dt>
                  <dd className="font-mono">{rule.value}</dd>
                </div>
              )}
              {rule.customPlacement && (
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Custom Placement:</dt>
                  <dd className="font-mono">{rule.customPlacement}</dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Create Queue:</dt>
                <dd>{rule.create ? 'Yes' : 'No'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fallback:</dt>
                <dd>{rule.fallbackResult || 'skip'}</dd>
              </div>
            </dl>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

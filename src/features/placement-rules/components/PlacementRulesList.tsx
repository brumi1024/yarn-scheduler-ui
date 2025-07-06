import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Plus, InfoIcon, HelpCircle } from 'lucide-react';
import { PlacementRuleForm } from './PlacementRuleForm';
import { PlacementRulesTable } from './PlacementRulesTable';
import { PolicyReferenceDialog } from './PolicyReferenceDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { useSchedulerStore } from '~/stores/schedulerStore';
import type { PlacementRule } from '~/types/features/placement-rules';

export function PlacementRulesList() {
  const { rules, selectedRuleIndex, addRule, deleteRule, reorderRules, selectRule } =
    useSchedulerStore();

  const [showAddForm, setShowAddForm] = useState(false);

  const handleAdd = (data: PlacementRule) => {
    addRule(data);
    setShowAddForm(false);
  };

  if (showAddForm) {
    return <PlacementRuleForm onSubmit={handleAdd} onCancel={() => setShowAddForm(false)} />;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Rules are evaluated from top to bottom. The first matching rule determines the queue
              assignment. Drag rules to reorder them.
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help ml-2 flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Placement rules determine how the queue path is constructed for matching
                applications
              </TooltipContent>
            </Tooltip>
          </AlertDescription>
        </Alert>

        <div className="flex justify-end gap-2">
          <PolicyReferenceDialog />
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>
      </div>

      {rules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">No placement rules configured</h3>
              <p className="text-muted-foreground mb-4">
                Applications will use the default queue assignment behavior
              </p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Rule
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <PlacementRulesTable
          rules={rules}
          selectedRuleIndex={selectedRuleIndex}
          onDelete={deleteRule}
          onSelect={selectRule}
          onReorder={reorderRules}
        />
      )}
    </div>
  );
}

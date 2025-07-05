import { useState, useEffect } from 'react';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Plus, InfoIcon } from 'lucide-react';
import { PlacementRuleItem } from './PlacementRuleItem';
import { PlacementRuleForm } from './PlacementRuleForm';
import { useSchedulerStore } from '~/stores/schedulerStore';
import type { PlacementRule } from '~/types/features/placement-rules';

export function PlacementRulesList() {
  const { rules, selectedRuleIndex, addRule, updateRule, deleteRule, reorderRules, selectRule } =
    useSchedulerStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Monitor for drag events globally
  useEffect(() => {
    return monitorForElements({
      onDrop({ source, location }) {
        if (!location.current.dropTargets.length) return;

        const draggedIndex = source.data.index;
        const targetIndex = location.current.dropTargets[0].data.index;

        if (draggedIndex !== undefined && targetIndex !== undefined) {
          reorderRules(draggedIndex as number, targetIndex as number);
        }
      },
    });
  }, [reorderRules]);

  const handleAdd = (data: PlacementRule) => {
    addRule(data);
    setShowAddForm(false);
  };

  const handleUpdate = (data: PlacementRule, index?: number) => {
    if (index !== undefined) {
      updateRule(index, data);
      setEditingIndex(null);
    }
  };

  if (editingIndex !== null) {
    return (
      <PlacementRuleForm
        rule={rules[editingIndex]}
        ruleIndex={editingIndex}
        onSubmit={handleUpdate}
        onCancel={() => setEditingIndex(null)}
      />
    );
  }

  if (showAddForm) {
    return <PlacementRuleForm onSubmit={handleAdd} onCancel={() => setShowAddForm(false)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Rules are evaluated from top to bottom. The first matching rule determines the queue
            assignment. Drag rules to reorder them.
          </AlertDescription>
        </Alert>

        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
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
        <div className="space-y-2">
          {rules.map((rule, index) => (
            <PlacementRuleItem
              key={`rule-${index}`}
              rule={rule}
              index={index}
              isSelected={selectedRuleIndex === index}
              onEdit={() => setEditingIndex(index)}
              onDelete={() => deleteRule(index)}
              onSelect={() => selectRule(index)}
              onReorder={reorderRules}
            />
          ))}
        </div>
      )}
    </div>
  );
}

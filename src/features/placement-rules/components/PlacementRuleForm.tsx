import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField } from '~/components/ui/form';
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldLabel,
  FieldMessage,
} from '~/components/ui/field';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Switch } from '~/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Combobox } from '~/components/ui/combobox';
import { useSchedulerStore } from '~/stores/schedulerStore';
import {
  placementRuleFormSchema,
  type PlacementRuleFormData,
  formDataToPlacementRule,
} from '../schemas/placement-rule-schema';
import { CustomPlacementHelpDialog } from './CustomPlacementHelpDialog';
import { getPolicyDescription, POLICY_DISPLAY_NAMES } from '../constants/policy-descriptions';
import { getAllParentQueues, getAllQueues } from '../utils/queue-utils';
import type { PlacementRule } from '~/types/features/placement-rules';

interface PlacementRuleFormProps {
  rule?: PlacementRule;
  ruleIndex?: number;
  onSubmit: (data: PlacementRule, index?: number) => void;
  onCancel: () => void;
}

export function PlacementRuleForm({ rule, ruleIndex, onSubmit, onCancel }: PlacementRuleFormProps) {
  const schedulerData = useSchedulerStore((state) => state.schedulerData);
  const parentQueues = getAllParentQueues(schedulerData);
  const allQueues = getAllQueues(schedulerData);

  const form = useForm<PlacementRuleFormData>({
    resolver: zodResolver(placementRuleFormSchema) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    defaultValues: rule
      ? {
          type: rule.type,
          matches: rule.matches,
          policy: rule.policy,
          parentQueue: rule.parentQueue,
          value: rule.value,
          customPlacement: rule.customPlacement,
          create: rule.create ?? false,
          fallbackResult: rule.fallbackResult ?? 'skip',
        }
      : {
          type: 'user',
          matches: '*',
          policy: 'user',
          create: false,
        },
  });

  const selectedPolicy = form.watch('policy');
  const selectedType = form.watch('type');
  const requiresParentQueue = ['primaryGroupUser', 'secondaryGroupUser', 'custom'].includes(
    selectedPolicy,
  );
  const requiresValue = selectedPolicy === 'specified' || selectedPolicy === 'setDefaultQueue';
  const requiresCustomPlacement = selectedPolicy === 'custom';
  const showCreateOption = !['reject', 'defaultQueue', 'setDefaultQueue'].includes(selectedPolicy);

  const handleSubmit: SubmitHandler<PlacementRuleFormData> = (data) => {
    const placementRule = formDataToPlacementRule(data);
    onSubmit(placementRule, ruleIndex);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{rule ? 'Edit' : 'Add'} Placement Rule</CardTitle>
        <CardDescription>
          Define how applications are assigned to queues based on user, group, or application
          attributes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                name="type"
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>Rule Type</FieldLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FieldControl aria-invalid={Boolean(fieldState.error)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rule type" />
                        </SelectTrigger>
                      </FieldControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="group">Group</SelectItem>
                        <SelectItem value="application">Application</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      Match applications based on submitting user, group, or application name
                    </FieldDescription>
                    {fieldState.error && (
                      <FieldMessage>{String(fieldState.error.message ?? '')}</FieldMessage>
                    )}
                  </Field>
                )}
              />

              <FormField
                control={form.control as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                name="matches"
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>Match Pattern</FieldLabel>
                    <FieldControl>
                      <Input
                        {...field}
                        placeholder="* for all, or specific pattern"
                        aria-invalid={Boolean(fieldState.error)}
                      />
                    </FieldControl>
                    <FieldDescription>
                      {selectedType === 'user' && 'Use * to match all users, or specify usernames'}
                      {selectedType === 'group' &&
                        'Use * to match all groups, or specify group names'}
                      {selectedType === 'application' &&
                        'Use * to match all apps, or patterns like spark-*'}
                    </FieldDescription>
                    {fieldState.error && (
                      <FieldMessage>{String(fieldState.error.message ?? '')}</FieldMessage>
                    )}
                  </Field>
                )}
              />
            </div>

            <FormField
              control={form.control as any} // eslint-disable-line @typescript-eslint/no-explicit-any
              name="policy"
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>Placement Policy</FieldLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FieldControl aria-invalid={Boolean(fieldState.error)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select placement policy" />
                      </SelectTrigger>
                    </FieldControl>
                    <SelectContent>
                      {Object.entries(POLICY_DISPLAY_NAMES).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    {(() => {
                      const policy = getPolicyDescription(field.value);
                      return policy
                        ? policy.description
                        : 'Determines how the queue path is constructed for matching applications';
                    })()}
                  </FieldDescription>
                  {fieldState.error && (
                    <FieldMessage>{String(fieldState.error.message ?? '')}</FieldMessage>
                  )}
                </Field>
              )}
            />

            {requiresValue && (
              <FormField
                control={form.control as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                name="value"
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>
                      {selectedPolicy === 'setDefaultQueue' ? 'Default Queue' : 'Queue Value'}
                    </FieldLabel>
                    <FieldControl aria-invalid={Boolean(fieldState.error)}>
                      <Combobox
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        items={allQueues}
                        placeholder="Select a queue..."
                        searchPlaceholder="Search queues..."
                        emptyText="No queues found."
                        aria-label={
                          selectedPolicy === 'setDefaultQueue' ? 'Default Queue' : 'Queue Value'
                        }
                      />
                    </FieldControl>
                    <FieldDescription>
                      {selectedPolicy === 'setDefaultQueue'
                        ? 'The new default queue path that will be used by subsequent defaultQueue policies'
                        : 'The specific queue path where matching applications will be placed'}
                    </FieldDescription>
                    {fieldState.error && (
                      <FieldMessage>{String(fieldState.error.message ?? '')}</FieldMessage>
                    )}
                  </Field>
                )}
              />
            )}

            {requiresParentQueue && (
              <FormField
                control={form.control as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                name="parentQueue"
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>Parent Queue</FieldLabel>
                    <FieldControl aria-invalid={Boolean(fieldState.error)}>
                      <Combobox
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        items={parentQueues}
                        placeholder="Select a parent queue..."
                        searchPlaceholder="Search queues..."
                        emptyText="No parent queues found."
                        aria-label="Parent Queue"
                      />
                    </FieldControl>
                    <FieldDescription>
                      The parent queue under which user/group queues will be created
                    </FieldDescription>
                    {fieldState.error && (
                      <FieldMessage>{String(fieldState.error.message ?? '')}</FieldMessage>
                    )}
                  </Field>
                )}
              />
            )}

            {requiresCustomPlacement && (
              <FormField
                control={form.control as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                name="customPlacement"
                render={({ field, fieldState }) => (
                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel>Custom Placement Pattern</FieldLabel>
                      <CustomPlacementHelpDialog triggerText="View Variables" />
                    </div>
                    <FieldControl>
                      <Input
                        {...field}
                        placeholder="e.g., root.%primary_group.%user"
                        aria-invalid={Boolean(fieldState.error)}
                      />
                    </FieldControl>
                    <FieldDescription>
                      Use variables to construct dynamic queue paths based on user attributes
                    </FieldDescription>
                    {fieldState.error && (
                      <FieldMessage>{String(fieldState.error.message ?? '')}</FieldMessage>
                    )}
                  </Field>
                )}
              />
            )}

            <div className="space-y-4">
              {showCreateOption && (
                <FormField
                  control={form.control as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                  name="create"
                  render={({ field }) => (
                    <Field className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FieldLabel className="text-base">
                          Create queue if it doesn't exist
                        </FieldLabel>
                        <FieldDescription>
                          Automatically create the target queue with default settings if not found
                        </FieldDescription>
                      </div>
                      <FieldControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FieldControl>
                    </Field>
                  )}
                />
              )}

              <FormField
                control={form.control as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                name="fallbackResult"
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel>Fallback Behavior</FieldLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FieldControl aria-invalid={Boolean(fieldState.error)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select fallback behavior" />
                        </SelectTrigger>
                      </FieldControl>
                      <SelectContent>
                        <SelectItem value="skip">Skip to next rule</SelectItem>
                        <SelectItem value="placeDefault">Place in default queue</SelectItem>
                        <SelectItem value="reject">Reject application</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      What happens if this rule matches but cannot place the application
                    </FieldDescription>
                    {fieldState.error && (
                      <FieldMessage>{String(fieldState.error.message ?? '')}</FieldMessage>
                    )}
                  </Field>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">{rule ? 'Update' : 'Add'} Rule</Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

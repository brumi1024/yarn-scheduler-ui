import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form';
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rule Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rule type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="group">Group</SelectItem>
                        <SelectItem value="application">Application</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Match applications based on submitting user, group, or application name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                name="matches"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Match Pattern</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="* for all, or specific pattern" />
                    </FormControl>
                    <FormDescription>
                      {selectedType === 'user' && 'Use * to match all users, or specify usernames'}
                      {selectedType === 'group' &&
                        'Use * to match all groups, or specify group names'}
                      {selectedType === 'application' &&
                        'Use * to match all apps, or patterns like spark-*'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control as any} // eslint-disable-line @typescript-eslint/no-explicit-any
              name="policy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Placement Policy</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select placement policy" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(POLICY_DISPLAY_NAMES).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {(() => {
                      const policy = getPolicyDescription(field.value);
                      return policy
                        ? policy.description
                        : 'Determines how the queue path is constructed for matching applications';
                    })()}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {requiresValue && (
              <FormField
                control={form.control as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {selectedPolicy === 'setDefaultQueue' ? 'Default Queue' : 'Queue Value'}
                    </FormLabel>
                    <FormControl>
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
                    </FormControl>
                    <FormDescription>
                      {selectedPolicy === 'setDefaultQueue'
                        ? 'The new default queue path that will be used by subsequent defaultQueue policies'
                        : 'The specific queue path where matching applications will be placed'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {requiresParentQueue && (
              <FormField
                control={form.control as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                name="parentQueue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Queue</FormLabel>
                    <FormControl>
                      <Combobox
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        items={parentQueues}
                        placeholder="Select a parent queue..."
                        searchPlaceholder="Search queues..."
                        emptyText="No parent queues found."
                        aria-label="Parent Queue"
                      />
                    </FormControl>
                    <FormDescription>
                      The parent queue under which user/group queues will be created
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {requiresCustomPlacement && (
              <FormField
                control={form.control as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                name="customPlacement"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Custom Placement Pattern</FormLabel>
                      <CustomPlacementHelpDialog triggerText="View Variables" />
                    </div>
                    <FormControl>
                      <Input {...field} placeholder="e.g., root.%primary_group.%user" />
                    </FormControl>
                    <FormDescription>
                      Use variables to construct dynamic queue paths based on user attributes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="space-y-4">
              {showCreateOption && (
                <FormField
                  control={form.control as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                  name="create"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Create queue if it doesn't exist
                        </FormLabel>
                        <FormDescription>
                          Automatically create the target queue with default settings if not found
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control as any} // eslint-disable-line @typescript-eslint/no-explicit-any
                name="fallbackResult"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fallback Behavior</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select fallback behavior" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="skip">Skip to next rule</SelectItem>
                        <SelectItem value="placeDefault">Place in default queue</SelectItem>
                        <SelectItem value="reject">Reject application</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      What happens if this rule matches but cannot place the application
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
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

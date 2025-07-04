import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useSchedulerStore } from '~/stores/schedulerStore';
import { globalPropertyDefinitions } from '~/config/properties/global-properties';
import { SPECIAL_VALUES } from '~/types';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion';
import { PropertyInput } from './PropertyInput';
import type { PropertyDescriptor } from '~/types/property-descriptor';

export const GlobalSettings: React.FC = () => {
  const { getGlobalPropertyValue, stageGlobalChange, stagedChanges } = useSchedulerStore();

  const getGlobalPropertyCategories = () => {
    const categories = new Set(globalPropertyDefinitions.map((prop) => prop.category));
    return Array.from(categories).sort();
  };

  const getGlobalPropertiesByCategory = (category: string) => {
    return globalPropertyDefinitions.filter((prop) => prop.category === category);
  };

  const categories = getGlobalPropertyCategories();
  const globalStagedChanges = stagedChanges.filter(
    (c) => c.queuePath === SPECIAL_VALUES.GLOBAL_QUEUE_PATH,
  );

  const handlePropertyChange = (propertyKey: string, value: string) => {
    stageGlobalChange(propertyKey, value);
  };

  return (
    <div className="space-y-6">
      {globalStagedChanges.length > 0 && (
        <Alert>
          <AlertDescription>
            You have {globalStagedChanges.length} unsaved global setting
            {globalStagedChanges.length !== 1 ? 's' : ''}. Apply changes to make them active.
          </AlertDescription>
        </Alert>
      )}

      {categories.length > 0 ? (
        <Accordion type="multiple" defaultValue={categories} className="space-y-4">
          {categories.map((category) => {
            const categoryProperties = getGlobalPropertiesByCategory(category);
            const hasChanges = categoryProperties.some((property) =>
              globalStagedChanges.some((c) => c.property === property.name),
            );

            return (
              <AccordionItem key={category} value={category} className="border rounded-lg">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium capitalize">{category} Settings</h3>
                    {hasChanges && (
                      <Badge variant="outline" className="border-warning text-warning">
                        Has Changes
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-6">
                    {categoryProperties.map((property, index) => {
                      const { value, isStaged } = getGlobalPropertyValue(property.name);

                      return (
                        <div key={property.name}>
                          <PropertyInput
                            property={property}
                            value={value}
                            isStaged={isStaged}
                            onChange={(newValue) => handlePropertyChange(property.name, newValue)}
                          />
                          {index < categoryProperties.length - 1 && <hr className="mt-6" />}
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-2 text-lg font-medium">No Global Properties Available</h3>
            <p className="text-sm text-muted-foreground">
              Global properties configuration is not available. Please check the configuration
              setup.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

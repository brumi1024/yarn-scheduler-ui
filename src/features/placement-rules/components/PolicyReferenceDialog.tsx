import { BookOpen } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion';
import { ScrollArea } from '~/components/ui/scroll-area';
import { POLICY_DESCRIPTIONS } from '~/features/placement-rules/constants/policy-descriptions';

export function PolicyReferenceDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <BookOpen className="h-4 w-4 mr-2" />
          Policy Reference
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:!max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Policy Types Reference</DialogTitle>
          <DialogDescription>
            Reference guide for all available placement rule policies. Each policy determines how
            the queue path is constructed for matching applications.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[600px] pr-4 mt-4">
          <Accordion type="single" collapsible className="w-full">
            {POLICY_DESCRIPTIONS.map((policy) => (
              <AccordionItem key={policy.id} value={policy.id} className="border-b last:border-b-0">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full mr-2">
                    <span className="text-sm font-medium text-left">{policy.name}</span>
                    <Badge variant="outline" className="text-xs ml-2">
                      {policy.id}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    <p className="text-sm text-muted-foreground">{policy.description}</p>

                    {policy.note && (
                      <p className="text-xs text-amber-600 dark:text-amber-500">{policy.note}</p>
                    )}

                    {policy.example && (
                      <div className="rounded bg-muted px-3 py-2">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Example:</span> {policy.example}
                        </p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

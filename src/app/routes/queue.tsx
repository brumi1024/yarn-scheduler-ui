import { useParams } from "react-router";
import { PropertyPanel } from "~/features/property-editor/components/PropertyPanel";

export default function QueueDetails() {
  const { queuePath } = useParams();
  
  return (
    <>
      <div className="p-6">
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">
            Queue details and property editor will be shown here
          </p>
        </div>
      </div>
      <PropertyPanel />
    </>
  );
}
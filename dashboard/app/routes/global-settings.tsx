export default function GlobalSettings() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-card px-6 py-4">
        <h2 className="text-2xl font-semibold">Global Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure global scheduler settings
        </p>
      </div>
      
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="rounded-lg border p-6">
            <h3 className="mb-4 text-lg font-medium">Scheduler Configuration</h3>
            <p className="text-sm text-muted-foreground">
              Global scheduler settings will be implemented here
            </p>
          </div>
          
          <div className="rounded-lg border p-6">
            <h3 className="mb-4 text-lg font-medium">Resource Calculator</h3>
            <p className="text-sm text-muted-foreground">
              Resource calculator settings will be shown here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
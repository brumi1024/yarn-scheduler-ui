export default function NodeLabels() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-card px-6 py-4">
        <h2 className="text-2xl font-semibold">Node Labels</h2>
        <p className="text-sm text-muted-foreground">
          Manage node labels and their assignments
        </p>
      </div>
      
      <div className="flex-1 p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border p-6">
            <h3 className="mb-4 text-lg font-medium">Labels</h3>
            <p className="text-sm text-muted-foreground">
              Node label management will be implemented here
            </p>
          </div>
          
          <div className="rounded-lg border p-6">
            <h3 className="mb-4 text-lg font-medium">Node Assignments</h3>
            <p className="text-sm text-muted-foreground">
              Node to label mappings will be shown here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
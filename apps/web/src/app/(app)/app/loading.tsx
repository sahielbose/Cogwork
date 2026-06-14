import { Card } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-app space-y-8 p-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="h-3 w-20 animate-pulse rounded bg-paper-3" />
            <div className="mt-3 h-7 w-16 animate-pulse rounded bg-paper-3" />
          </Card>
        ))}
      </div>
      <Card className="divide-y divide-line">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="h-4 flex-1 animate-pulse rounded bg-paper-3" />
            <div className="h-6 w-16 animate-pulse rounded-full bg-paper-3" />
          </div>
        ))}
      </Card>
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import { INTERNAL_STATUS_LABELS, type BillingInternalStatus } from "../types";

const VARIANT: Record<BillingInternalStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  ready: "bg-blue-100 text-blue-800 border-blue-200",
  queued: "bg-blue-100 text-blue-800 border-blue-200",
  issuing: "bg-amber-100 text-amber-800 border-amber-200",
  issued: "bg-emerald-100 text-emerald-800 border-emerald-200",
  paid: "bg-emerald-600 text-white",
  partially_paid: "bg-amber-100 text-amber-800 border-amber-200",
  credited: "bg-purple-100 text-purple-800 border-purple-200",
  cancelled: "bg-gray-200 text-gray-700",
  error: "bg-red-100 text-red-800 border-red-200",
};

export function BillingDocumentStatusBadge({
  internalStatus,
  externalStatus,
}: {
  internalStatus: BillingInternalStatus;
  externalStatus?: string | null;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Badge className={VARIANT[internalStatus]} variant="outline">
        {INTERNAL_STATUS_LABELS[internalStatus]}
      </Badge>
      {externalStatus && (
        <Badge variant="outline" className="text-xs">
          ext: {externalStatus}
        </Badge>
      )}
    </div>
  );
}

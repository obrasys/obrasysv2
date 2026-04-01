import { Badge } from '@/components/ui/badge';
import { STATUS_LABELS, STATUS_COLORS, INVITE_STATUS_LABELS, INVITE_STATUS_COLORS } from '@/types/team';
import type { MemberStatus, InviteStatus } from '@/types/team';

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  return (
    <Badge variant="outline" className={`text-[11px] font-medium ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function InviteStatusBadge({ status }: { status: InviteStatus }) {
  return (
    <Badge variant="outline" className={`text-[11px] font-medium ${INVITE_STATUS_COLORS[status]}`}>
      {INVITE_STATUS_LABELS[status]}
    </Badge>
  );
}

import { useLocation } from "wouter";

import { trpc } from "@/lib/trpc";
import {
  CanonicalTicketAssignmentPanel,
} from "./CanonicalTicketAssignmentPanel";

const TICKET_DETAIL_RE =
  /^\/tickets\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/?$/i;

export function TicketAssignmentRoutePanel() {
  const [location] = useLocation();
  const match = location.match(TICKET_DETAIL_RE);
  const ticketId = match?.[1];

  const {
    data: current,
  } = trpc.ticketAssignment.canonicalCurrent.useQuery(
    {
      id: ticketId ?? "00000000-0000-4000-8000-000000000000",
    },
    {
      enabled: Boolean(ticketId),
      retry: false,
    },
  );

  if (!ticketId || !current) {
    return null;
  }

  return (
    <div className="mb-5">
      <CanonicalTicketAssignmentPanel
        ticketId={ticketId}
        ticketNumber={current.ticketNumber}
        operationalStatus={current.operationalStatus}
      />
    </div>
  );
}

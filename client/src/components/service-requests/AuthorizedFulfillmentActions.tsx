import { Building2, TicketCheck } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  ConvertToTicketDialog,
} from "@/components/service-requests/ConvertToTicketDialog";
import {
  OperationalContextDialog,
} from "@/components/service-requests/OperationalContextDialog";

type AuthorizedFulfillmentActionsProps = {
  requestId: string;
  requestNumber: string;
  requestType: string;
  branchId?: string | null;
  branchName?: string | null;
  departmentId?: string | null;
  branchSystemId?: string | null;
  assetId?: string | null;
  estimatedAmount?: string | null;
  disabled?: boolean;
};

function formatMoney(value: string | null | undefined) {
  if (!value) return "No estimado";

  const amount = Number(value);
  if (Number.isNaN(amount)) return value;

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
}

export function AuthorizedFulfillmentActions({
  requestId,
  requestNumber,
  requestType,
  branchId,
  branchName,
  departmentId,
  branchSystemId,
  assetId,
  estimatedAmount,
  disabled = false,
}: AuthorizedFulfillmentActionsProps) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [contextOpen, setContextOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  const refreshRequest = async () => {
    await Promise.all([
      utils.serviceRequests.canonicalGetById.invalidate({
        id: requestId,
      }),
      utils.serviceRequests.canonicalList.invalidate(),
      utils.serviceRequestContext.workflow.canonicalEvents.invalidate({
        id: requestId,
      }),
    ]);
  };

  const setOperationalContext =
    trpc.serviceRequestContext.fulfillment.canonicalSetOperationalContext.useMutation({
      onSuccess: async () => {
        setContextOpen(false);
        await refreshRequest();
        toast.success("Contexto operativo actualizado");
      },
      onError: mutationError => toast.error(mutationError.message),
    });

  const convertToTicket =
    trpc.serviceRequestContext.fulfillment.canonicalConvertToTicket.useMutation({
      onSuccess: async result => {
        setConvertOpen(false);

        await Promise.all([
          utils.serviceRequests.canonicalList.invalidate(),
          utils.tickets.canonicalList.invalidate(),
        ]);

        toast.success(
          `Ticket ${result.ticket.ticketNumber} creado`,
        );

        navigate(`/tickets/${result.ticket.id}`);
      },
      onError: mutationError => toast.error(mutationError.message),
    });

  const pending =
    disabled
    || setOperationalContext.isPending
    || convertToTicket.isPending;

  const convertible =
    Boolean(branchId)
    && requestType !== "meeting";

  return (
    <>
      <Button
        variant={branchId ? "outline" : "default"}
        className={branchId ? "gap-2" : "gap-2 gradient-horos text-white"}
        disabled={pending}
        onClick={() => setContextOpen(true)}
      >
        <Building2 className="w-4 h-4" />
        {branchId ? "Actualizar contexto" : "Completar contexto operativo"}
      </Button>

      {convertible && (
        <Button
          className="gap-2 gradient-horos text-white"
          disabled={pending}
          onClick={() => setConvertOpen(true)}
        >
          <TicketCheck className="w-4 h-4" />
          Convertir a ticket
        </Button>
      )}

      <OperationalContextDialog
        open={contextOpen}
        onOpenChange={setContextOpen}
        requestNumber={requestNumber}
        currentBranchId={branchId}
        currentDepartmentId={departmentId}
        currentBranchSystemId={branchSystemId}
        currentAssetId={assetId}
        isPending={setOperationalContext.isPending}
        onConfirm={input =>
          setOperationalContext.mutate({
            id: requestId,
            ...input,
          })
        }
      />

      <ConvertToTicketDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        requestNumber={requestNumber}
        branchName={branchName ?? "Sucursal seleccionada"}
        amountLabel={formatMoney(estimatedAmount)}
        isPending={convertToTicket.isPending}
        onConfirm={input =>
          convertToTicket.mutate({
            id: requestId,
            ...input,
          })
        }
      />
    </>
  );
}

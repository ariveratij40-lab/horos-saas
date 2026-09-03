import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

type Asset = { id:string; assetCode:string; aliases:Array<{value:string;type:string}> };
const PORT_TYPES=["ETHERNET","FIBER","POWER","RELAY_INPUT","RELAY_OUTPUT","ALARM_INPUT","AUDIO_INPUT","AUDIO_OUTPUT","SERIAL","WIRELESS","LOGICAL","OTHER"] as const;
const MEDIA=["COPPER","FIBER","WIRELESS","ELECTRICAL","AUDIO","LOGICAL","OTHER"] as const;
const RELATIONS=["POWERED_BY","CONTROLLED_BY","RECORDED_BY","MONITORED_BY","HOSTED_ON","DEPENDS_ON","SERVES","BACKED_UP_BY","PARENT_OF","CONNECTED_TO","OTHER"] as const;
function errorMessage(error:unknown){return typeof error==="object"&&error&&"message" in error?String(error.message):"No fue posible completar la operación";}

export function TopologyManager({branchId,solutionId,assets,canManage}:{branchId:string;solutionId:string;assets:Asset[];canManage:boolean}){
  const utils=trpc.useUtils();
  const topologyContext=trpc.topology.context.useQuery({branchId});
  const topologyAssets=((topologyContext.data?.assets??assets) as Array<Asset&{systemSolutionId?:string|null}>).filter(asset=>asset.systemSolutionId===undefined||asset.systemSolutionId===solutionId);
  const [assetId,setAssetId]=useState("");
  const [portCode,setPortCode]=useState(""); const [portName,setPortName]=useState(""); const [portType,setPortType]=useState<typeof PORT_TYPES[number]>("ETHERNET"); const [medium,setMedium]=useState<typeof MEDIA[number]>("COPPER");
  const [linkCode,setLinkCode]=useState(""); const [endpointA,setEndpointA]=useState(""); const [endpointB,setEndpointB]=useState("");
  const [targetId,setTargetId]=useState(""); const [relationshipType,setRelationshipType]=useState<typeof RELATIONS[number]>("DEPENDS_ON");
  const ports=trpc.topology.listPorts.useQuery({branchId,assetId},{enabled:Boolean(assetId)});
  const available=trpc.topology.listAvailablePorts.useQuery({branchId});
  const links=trpc.topology.listLinks.useQuery({branchId,systemSolutionId:solutionId});
  const relationships=trpc.topology.listRelationships.useQuery({branchId,assetId},{enabled:Boolean(assetId)});
  const refresh=async()=>Promise.all([utils.topology.listPorts.invalidate(),utils.topology.listAvailablePorts.invalidate(),utils.topology.listLinks.invalidate(),utils.topology.listRelationships.invalidate()]);
  const options=(success:string)=>({onSuccess:async()=>{toast.success(success);await refresh();},onError:(e:unknown)=>toast.error(errorMessage(e))});
  const createPort=trpc.topology.createPort.useMutation(options("Puerto creado"));
  const updatePort=trpc.topology.updatePort.useMutation(options("Puerto actualizado"));
  const setPort=trpc.topology.setPortActive.useMutation(options("Estado del puerto actualizado"));
  const createLink=trpc.topology.createLink.useMutation(options("Enlace creado"));
  const setLink=trpc.topology.setLinkActive.useMutation(options("Estado del enlace actualizado"));
  const createRelationship=trpc.topology.createRelationship.useMutation(options("Relación creada"));
  const setRelationship=trpc.topology.setRelationshipActive.useMutation(options("Estado de la relación actualizado"));
  const loading=ports.isLoading||links.isLoading||relationships.isLoading;
  const error=ports.error||available.error||links.error||relationships.error;
  return <section className="space-y-4 overflow-x-hidden" aria-busy={loading}>
    <div><h3 className="text-lg font-medium">Conectividad y topología</h3><p className="text-sm text-muted-foreground">Puertos, enlaces físicos o lógicos y relaciones funcionales. El contexto proviene de la sesión.</p></div>
    {error&&<p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{errorMessage(error)}</p>}
    <Label htmlFor="topology-asset">Activo</Label><select id="topology-asset" className="h-10 w-full rounded-md border bg-background px-3" value={assetId} onChange={e=>setAssetId(e.target.value)}><option value="">Seleccione un activo</option>{topologyAssets.map(a=><option key={a.id} value={a.id}>{a.assetCode}{a.aliases?.[0]?` · ${a.aliases[0].value}`:""}</option>)}</select>
    {!assetId&&<p className="rounded-md border p-5 text-center text-muted-foreground">Seleccione un activo para consultar su topología.</p>}
    {assetId&&<div className="grid min-w-0 gap-4 xl:grid-cols-3">
      <Card className="min-w-0"><CardHeader><CardTitle>Puertos</CardTitle></CardHeader><CardContent className="space-y-3">
        {!ports.isLoading&&(ports.data?.length??0)===0&&<p className="text-sm text-muted-foreground">Este activo todavía no tiene puertos.</p>}
        {(ports.data??[]).map((p:any)=><div key={p.id} className="rounded-md border p-3 text-sm"><b>{p.code}</b> · {p.name}<p className="break-words text-muted-foreground">{p.portType} · {p.medium} · {p.active?"Activo":"Inactivo"}</p>{canManage&&<div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={()=>{const name=window.prompt("Nombre del puerto",p.name);if(name?.trim())updatePort.mutate({branchId,id:p.id,name:name.trim(),portType:p.portType,direction:p.direction,medium:p.medium,connectorType:p.connectorType,status:p.status,description:p.description});}}>Editar</Button><Button size="sm" variant="outline" onClick={()=>{if(window.confirm(`¿${p.active?"Desactivar":"Activar"} este puerto?`))setPort.mutate({branchId,id:p.id,active:!p.active});}}>{p.active?"Desactivar":"Activar"}</Button></div>}</div>)}
        {canManage&&<div className="space-y-2 border-t pt-3"><Label htmlFor="port-code">Código</Label><Input id="port-code" value={portCode} onChange={e=>setPortCode(e.target.value.toUpperCase())}/><Label htmlFor="port-name">Nombre</Label><Input id="port-name" value={portName} onChange={e=>setPortName(e.target.value)}/><select aria-label="Tipo de puerto" className="h-10 w-full rounded-md border bg-background px-2" value={portType} onChange={e=>setPortType(e.target.value as any)}>{PORT_TYPES.map(v=><option key={v}>{v}</option>)}</select><select aria-label="Medio del puerto" className="h-10 w-full rounded-md border bg-background px-2" value={medium} onChange={e=>setMedium(e.target.value as any)}>{MEDIA.map(v=><option key={v}>{v}</option>)}</select><Button disabled={!portCode||!portName} onClick={()=>createPort.mutate({branchId,assetId,code:portCode,name:portName,portType,direction:"BIDIRECTIONAL",medium})}>Crear puerto</Button></div>}
      </CardContent></Card>
      <Card className="min-w-0"><CardHeader><CardTitle>Enlaces</CardTitle></CardHeader><CardContent className="space-y-3">
        {(links.data??[]).length===0&&<p className="text-sm text-muted-foreground">No hay enlaces en esta solución.</p>}{(links.data??[]).map((l:any)=><div key={l.id} className="rounded-md border p-3 text-sm"><b>{l.code}</b> · {l.name}<p className="text-muted-foreground">{l.medium} · {l.active?"Activo":"Inactivo"}</p><div className="flex flex-wrap gap-2"><Button size="sm" variant="ghost" onClick={()=>setAssetId(l.assetAId)}>Ver activo A</Button><Button size="sm" variant="ghost" onClick={()=>setAssetId(l.assetBId)}>Ver activo B</Button>{canManage&&l.active&&<Button size="sm" variant="outline" onClick={()=>{if(window.confirm("¿Desactivar este enlace? Se conservará el historial."))setLink.mutate({branchId,id:l.id,active:false});}}>Desactivar</Button>}</div></div>)}
        {canManage&&<div className="space-y-2 border-t pt-3"><Input aria-label="Código del enlace" placeholder="LINK-001" value={linkCode} onChange={e=>setLinkCode(e.target.value.toUpperCase())}/><select aria-label="Extremo A" className="h-10 w-full rounded-md border bg-background px-2" value={endpointA} onChange={e=>setEndpointA(e.target.value)}><option value="">Extremo A</option>{(available.data??[]).filter((p:any)=>p.available).map((p:any)=><option key={p.id} value={p.id}>{p.assetCode} · {p.code} · {p.medium}</option>)}</select><select aria-label="Extremo B compatible" className="h-10 w-full rounded-md border bg-background px-2" value={endpointB} onChange={e=>setEndpointB(e.target.value)}><option value="">Extremo B compatible</option>{(available.data??[]).filter((p:any)=>p.available&&p.id!==endpointA&&p.assetId!==(available.data as any[])?.find(x=>x.id===endpointA)?.assetId&&p.medium===(available.data as any[])?.find(x=>x.id===endpointA)?.medium).map((p:any)=><option key={p.id} value={p.id}>{p.assetCode} · {p.code} · {p.medium}</option>)}</select><p className="text-xs text-muted-foreground">Los puertos ocupados o incompatibles no aparecen; PostgreSQL vuelve a validar la operación.</p><Button disabled={!linkCode||!endpointA||!endpointB} onClick={()=>createLink.mutate({branchId,code:linkCode,name:linkCode,linkType:"PHYSICAL",endpointAPortId:endpointA,endpointBPortId:endpointB,medium:(available.data as any[])?.find(p=>p.id===endpointA)?.medium??"OTHER"})}>Crear enlace</Button></div>}
      </CardContent></Card>
      <Card className="min-w-0"><CardHeader><CardTitle>Relaciones</CardTitle></CardHeader><CardContent className="space-y-3">
        {(relationships.data??[]).length===0&&<p className="text-sm text-muted-foreground">No hay relaciones entrantes ni salientes.</p>}{(relationships.data??[]).map((r:any)=><div key={r.id} className="rounded-md border p-3 text-sm"><b>{r.relationshipType}</b><p className="break-all text-muted-foreground">{r.sourceAssetId===assetId?"Saliente":"Entrante"} · {r.sourceAssetId} → {r.targetAssetId}</p>{canManage&&r.active&&<Button size="sm" variant="outline" onClick={()=>{if(window.confirm("¿Desactivar esta relación? Se conservará el historial."))setRelationship.mutate({branchId,id:r.id,active:false});}}>Desactivar</Button>}</div>)}
        {canManage&&<div className="space-y-2 border-t pt-3"><select aria-label="Tipo de relación" className="h-10 w-full rounded-md border bg-background px-2" value={relationshipType} onChange={e=>setRelationshipType(e.target.value as any)}>{RELATIONS.map(v=><option key={v}>{v}</option>)}</select><select aria-label="Activo destino" className="h-10 w-full rounded-md border bg-background px-2" value={targetId} onChange={e=>setTargetId(e.target.value)}><option value="">Activo destino</option>{topologyAssets.filter(a=>a.id!==assetId).map(a=><option key={a.id} value={a.id}>{a.assetCode}{a.aliases?.[0]?` · ${a.aliases[0].value}`:""}</option>)}</select><Button disabled={!targetId} onClick={()=>createRelationship.mutate({branchId,sourceAssetId:assetId,targetAssetId:targetId,relationshipType})}>Crear relación</Button></div>}
      </CardContent></Card>
    </div>}
  </section>;
}

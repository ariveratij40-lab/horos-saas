import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight, Wrench, CheckCircle2, Clock, Network } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const STATUS_COLOR: Record<string, string> = {
  scheduled: "bg-blue-500", in_progress: "bg-amber-500", completed: "bg-emerald-500", cancelled: "bg-gray-400",
};

export default function CablingCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { data: events = [] } = trpc.cabledMaintenance.calendarEvents.useQuery();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const eventsByDay: Record<number, any[]> = {};
  events.forEach((ev: any) => {
    const dateStr = ev.scheduledDate ?? ev.date;
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(ev);
    }
  });

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const totalEvents = events.length;
  const thisMonthEvents = Object.values(eventsByDay).flat().length;
  const completedThisMonth = Object.values(eventsByDay).flat().filter((e: any) => e.status === "completed").length;
  const pendingThisMonth = Object.values(eventsByDay).flat().filter((e: any) => e.status === "scheduled").length;
  const selectedDayEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-primary" />Calendario — Cableado Estructurado
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Programación de visitas de mantenimiento del sistema de cableado estructurado</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total visitas", value: totalEvents, icon: Wrench, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Este mes", value: thisMonthEvents, icon: CalendarDays, color: "text-indigo-500", bg: "bg-indigo-50" },
          { label: "Pendientes", value: pendingThisMonth, icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "Completadas", value: completedThisMonth, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
        ].map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div><p className="text-2xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-border/50">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">{MONTHS[month]} {year}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="w-8 h-8" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="outline" size="sm" onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); }}>Hoy</Button>
                  <Button variant="outline" size="icon" className="w-8 h-8" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-7 mb-2">
                {DAYS.map((d) => <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, idx) => {
                  const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                  const isSelected = day === selectedDay;
                  const dayEvents = day ? (eventsByDay[day] ?? []) : [];
                  return (
                    <div key={idx} onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
                      className={cn("min-h-[80px] rounded-lg p-1.5 border transition-colors",
                        day ? "cursor-pointer" : "border-transparent",
                        isToday ? "border-primary/50 bg-primary/5" : "border-border/30",
                        isSelected ? "border-primary bg-primary/10 ring-1 ring-primary/30" : day ? "hover:border-primary/30 hover:bg-muted/20" : "",
                      )}>
                      {day && (
                        <>
                          <span className={cn("text-xs font-semibold block text-right mb-1", isToday ? "text-primary" : "text-muted-foreground")}>{day}</span>
                          <div className="space-y-0.5">
                            {dayEvents.slice(0, 2).map((ev: any, i: number) => (
                              <div key={i} className={cn("text-[10px] font-medium px-1 py-0.5 rounded truncate text-white", STATUS_COLOR[ev.status] ?? "bg-gray-400")} title={ev.title}>
                                {ev.itemName ?? ev.title}
                              </div>
                            ))}
                            {dayEvents.length > 2 && <div className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 2} más</div>}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {selectedDay ? `${selectedDay} de ${MONTHS[month]} ${year}` : "Selecciona un día"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {!selectedDay ? (
                <p className="text-sm text-muted-foreground text-center py-8">Haz clic en un día del calendario para ver las visitas programadas</p>
              ) : selectedDayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sin visitas para este día</p>
              ) : (
                <div className="space-y-3">
                  {selectedDayEvents.map((ev: any) => (
                    <div key={ev.id} className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{ev.title}</p>
                          {ev.itemName && <p className="text-xs text-muted-foreground">{ev.itemName}</p>}
                        </div>
                        <span className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", STATUS_COLOR[ev.status] ?? "bg-gray-400")} />
                      </div>
                      {ev.technician && <p className="text-xs text-muted-foreground">Técnico: {ev.technician}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

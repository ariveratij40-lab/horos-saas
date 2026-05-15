import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ChevronLeft, ChevronRight, Wrench, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const TYPE_COLOR: Record<string, string> = {
  preventive: "bg-blue-500",
  corrective: "bg-red-500",
  inspection: "bg-amber-500",
};

export default function CCTVCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const { data: plans = [] } = trpc.maintenance.listPlans.useQuery();

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Group events by day
  const eventsByDay: Record<number, any[]> = {};
  plans.forEach((p: any) => {
    if (!p.startDate) return;
    const d = new Date(p.startDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(p);
    }
  });

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const totalEvents = plans.length;
  const thisMonthEvents = Object.values(eventsByDay).flat().length;
  const completedThisMonth = Object.values(eventsByDay).flat().filter((e: any) => e.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-blue-500" />
            Calendario CCTV
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Programación de actividades de mantenimiento del sistema CCTV</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total programadas", value: totalEvents, icon: Wrench, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Este mes", value: thisMonthEvents, icon: CalendarDays, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "Completadas este mes", value: completedThisMonth, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
        ].map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calendar */}
      <Card className="border-border/50">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              {MONTHS[month]} {year}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="w-8 h-8" onClick={prevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); }}>
                Hoy
              </Button>
              <Button variant="outline" size="icon" className="w-8 h-8" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
            ))}
          </div>
          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const events = day ? (eventsByDay[day] ?? []) : [];
              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[80px] rounded-lg p-1.5 border transition-colors",
                    day ? "border-border/30 hover:border-primary/30 hover:bg-muted/20 cursor-pointer" : "border-transparent",
                    isToday ? "border-primary/50 bg-primary/5" : ""
                  )}
                >
                  {day && (
                    <>
                      <span className={cn(
                        "text-xs font-semibold block text-right mb-1",
                        isToday ? "text-primary" : "text-muted-foreground"
                      )}>
                        {day}
                      </span>
                      <div className="space-y-0.5">
                        {events.slice(0, 3).map((ev: any, i: number) => (
                          <div
                            key={i}
                            className={cn(
                              "text-[10px] font-medium px-1 py-0.5 rounded truncate text-white",
                              TYPE_COLOR[ev.type] ?? "bg-gray-400"
                            )}
                            title={ev.name}
                          >
                            {ev.name}
                          </div>
                        ))}
                        {events.length > 3 && (
                          <div className="text-[10px] text-muted-foreground pl-1">+{events.length - 3} más</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border/30">
            <span className="text-xs text-muted-foreground font-medium">Leyenda:</span>
            {[
              { color: "bg-blue-500", label: "Preventivo" },
              { color: "bg-red-500", label: "Correctivo" },
              { color: "bg-amber-500", label: "Inspección" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded ${l.color}`} />
                <span className="text-xs text-muted-foreground">{l.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

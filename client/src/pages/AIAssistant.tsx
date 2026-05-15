import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import {
  Bot, Send, Plus, MessageSquare, Sparkles, User,
  FileText, Package, Shield, Wrench, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTED_QUESTIONS = [
  { icon: FileText, text: "¿Qué coberturas incluye una póliza de mantenimiento integral?" },
  { icon: Shield, text: "¿Cómo se calcula el incumplimiento de SLA en un ticket crítico?" },
  { icon: Package, text: "¿Cuándo se recomienda reemplazar un activo por obsolescencia?" },
  { icon: Wrench, text: "¿Cuál es la frecuencia recomendada para mantenimiento preventivo de cámaras IP?" },
  { icon: Clock, text: "¿Qué diferencia hay entre estado operativo y estado contractual de un ticket?" },
];

function MessageBubble({ message }: { message: { role: string; content: string; createdAt: any } }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3 mb-4", isUser ? "flex-row-reverse" : "flex-row")}>
      <div className={cn(
        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
        isUser ? "bg-primary text-primary-foreground" : "bg-gradient-to-br from-blue-500 to-purple-600 text-white"
      )}>
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
        isUser
          ? "bg-primary text-primary-foreground rounded-tr-sm"
          : "bg-card border border-border/50 text-foreground rounded-tl-sm shadow-sm"
      )}>
        {isUser ? (
          <p className="leading-relaxed">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Streamdown>{message.content}</Streamdown>
          </div>
        )}
        <p className={cn("text-[10px] mt-1.5", isUser ? "text-primary-foreground/60 text-right" : "text-muted-foreground")}>
          {new Date(message.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

export default function AIAssistant() {
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: sessions, isLoading: sessionsLoading } = trpc.ai.getSessions.useQuery();
  const { data: messages, isLoading: messagesLoading } = trpc.ai.getMessages.useQuery(
    { sessionId: activeSessionId! },
    { enabled: !!activeSessionId }
  );

  const createSession = trpc.ai.createSession.useMutation({
    onSuccess: (data) => {
      utils.ai.getSessions.invalidate();
      setActiveSessionId(data.id);
    },
    onError: (e) => toast.error(e.message),
  });

  const sendMessage = trpc.ai.sendMessage.useMutation({
    onSuccess: () => {
      utils.ai.getMessages.invalidate({ sessionId: activeSessionId! });
      setIsSending(false);
    },
    onError: (e) => { toast.error(e.message); setIsSending(false); },
  });

  useEffect(() => {
    if (sessions && sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    if (!activeSessionId) {
      toast.error("Selecciona o crea una sesión primero");
      return;
    }
    setIsSending(true);
    const msg = input;
    setInput("");
    sendMessage.mutate({ sessionId: activeSessionId, message: msg });
  };

  const handleNewSession = () => {
    createSession.mutate({ title: `Sesión ${new Date().toLocaleDateString("es-MX")}` });
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <div className="animate-fade-up h-[calc(100vh-8rem)] flex gap-4">
      {/* Sidebar: Sessions */}
      <div className="w-64 shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold font-display text-foreground">Conversaciones</h2>
          <Button size="sm" variant="outline" onClick={handleNewSession} disabled={createSession.isPending} className="h-7 w-7 p-0">
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-1.5">
            {sessionsLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)
            ) : sessions?.length === 0 ? (
              <div className="text-center py-6">
                <MessageSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No hay conversaciones</p>
              </div>
            ) : (
              sessions?.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all",
                    activeSessionId === session.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate text-xs">{session.title ?? `Sesión #${session.id}`}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 pl-5">
                    {new Date(session.createdAt).toLocaleDateString("es-MX")}
                  </p>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-card rounded-xl border border-border/50 card-elevated overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold font-display text-foreground">HOROS AI</p>
            <p className="text-xs text-muted-foreground">Asistente inteligente de gestión de pólizas y servicios</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            En línea
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-5">
          {!activeSessionId ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold font-display text-foreground mb-1">Bienvenido a HOROS AI</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Tu asistente inteligente para consultas sobre pólizas, activos, SLA, procedimientos técnicos y más.
                </p>
              </div>
              <Button onClick={handleNewSession} className="gap-2 gradient-horos text-white">
                <Plus className="w-4 h-4" /> Iniciar conversación
              </Button>
              <div className="w-full max-w-lg">
                <p className="text-xs text-muted-foreground text-center mb-3">Preguntas sugeridas</p>
                <div className="space-y-2">
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => { handleNewSession(); setTimeout(() => setInput(q.text), 500); }}
                      className="w-full text-left px-3 py-2.5 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all text-sm text-muted-foreground hover:text-foreground flex items-center gap-2.5"
                    >
                      <q.icon className="w-4 h-4 shrink-0 text-primary" />
                      {q.text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : messagesLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={cn("flex gap-3", i % 2 === 0 ? "flex-row" : "flex-row-reverse")}>
                  <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                  <Skeleton className={cn("h-16 rounded-2xl", i % 2 === 0 ? "w-2/3" : "w-1/2")} />
                </div>
              ))}
            </div>
          ) : messages?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
              <Bot className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Escribe tu primera pregunta para comenzar</p>
              <div className="w-full max-w-md space-y-2">
                {SUGGESTED_QUESTIONS.slice(0, 3).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q.text)}
                    className="w-full text-left px-3 py-2 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all text-xs text-muted-foreground hover:text-foreground flex items-center gap-2"
                  >
                    <q.icon className="w-3.5 h-3.5 shrink-0 text-primary" />
                    {q.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {(messages ?? []).map((msg) => <MessageBubble key={msg.id} message={msg} />)}
              {isSending && (
                <div className="flex gap-3 mb-4">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-card border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={activeSessionId ? "Escribe tu pregunta..." : "Crea una sesión para comenzar"}
              disabled={!activeSessionId || isSending}
              className="text-sm flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || !activeSessionId || isSending}
              size="icon"
              className="w-9 h-9 gradient-horos text-white shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            HOROS AI puede cometer errores. Verifica información crítica con la documentación oficial.
          </p>
        </div>
      </div>
    </div>
  );
}

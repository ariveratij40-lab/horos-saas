import React, { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import {
  ArrowLeft, Upload, FileSpreadsheet, FileText, File,
  CheckCircle2, AlertCircle, ChevronRight, RotateCcw,
  Download, Loader2, Camera, Server, Wifi, Monitor,
  Shield, Zap, Package, RefreshCw, SkipForward,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = "cameras" | "idfs" | "licenses" | "monitors" | "servers" | "switches" | "ups";
type Step = 1 | 2 | 3 | 4;

interface ParseResult {
  headers: string[];
  previewRows: Record<string, string>[];
  totalRows: number;
  suggestedMapping: Record<string, string>;
  targetColumns: { key: string; label: string }[];
}

// ─── Category metadata ────────────────────────────────────────────────────────

const CATEGORY_META: Record<Category, { label: string; icon: React.ReactNode; cols: number; color: string }> = {
  cameras:  { label: "Cámaras",             icon: <Camera className="w-5 h-5" />,       cols: 22, color: "text-blue-400" },
  idfs:     { label: "IDF / MDF",           icon: <Package className="w-5 h-5" />,      cols: 18, color: "text-purple-400" },
  licenses: { label: "Licencias",           icon: <Shield className="w-5 h-5" />,       cols: 15, color: "text-amber-400" },
  monitors: { label: "Monitores / Pantallas",icon: <Monitor className="w-5 h-5" />,     cols: 17, color: "text-cyan-400" },
  servers:  { label: "Servidores",          icon: <Server className="w-5 h-5" />,       cols: 28, color: "text-green-400" },
  switches: { label: "Switches",            icon: <Wifi className="w-5 h-5" />,         cols: 20, color: "text-orange-400" },
  ups:      { label: "UPS",                 icon: <Zap className="w-5 h-5" />,          cols: 17, color: "text-red-400" },
};

const ACCEPTED_EXTENSIONS = ".csv,.xlsx,.xls,.docx,.doc,.pdf";
const ACCEPTED_MIME = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/pdf",
];

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["xlsx", "xls", "csv"].includes(ext ?? "")) return <FileSpreadsheet className="w-8 h-8 text-green-400" />;
  if (["docx", "doc"].includes(ext ?? "")) return <FileText className="w-8 h-8 text-blue-400" />;
  return <File className="w-8 h-8 text-red-400" />;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { n: 1, label: "Seleccionar categoría" },
    { n: 2, label: "Subir archivo" },
    { n: 3, label: "Mapear columnas" },
    { n: 4, label: "Resultado" },
  ];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
              ${current === s.n ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" :
                current > s.n ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>
              {current > s.n ? <CheckCircle2 className="w-4 h-4" /> : s.n}
            </div>
            <span className={`text-sm font-medium hidden sm:block ${current === s.n ? "text-foreground" : "text-muted-foreground"}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-px w-8 sm:w-16 mx-2 transition-all ${current > s.n ? "bg-green-500" : "bg-border"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ImportInventory() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>(1);
  const [category, setCategory] = useState<Category | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [duplicateMode, setDuplicateMode] = useState<"skip" | "update">("skip");
  const [importResult, setImportResult] = useState<{ inserted: number; updated: number; skipped: number; skippedNames: string[]; errors: string[]; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseMut = trpc.cctvImport.parseFile.useMutation({
    onSuccess: (data) => {
      setParseResult(data);
      setMapping(data.suggestedMapping);
      setStep(3);
    },
    onError: (e) => toast.error(`Error al procesar archivo: ${e.message}`),
  });

  const importMut = trpc.cctvImport.importRows.useMutation({
    onSuccess: (data) => {
      setImportResult(data);
      setStep(4);
    },
    onError: (e) => toast.error(`Error al importar: ${e.message}`),
  });

  // File → base64
  const loadFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = (e.target?.result as string).split(",")[1] ?? "";
      setFileBase64(b64);
    };
    reader.readAsDataURL(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) loadFile(f);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) loadFile(f);
  };

  const handleParse = () => {
    if (!file || !category || !fileBase64) return;
    parseMut.mutate({ fileBase64, fileName: file.name, category });
  };

  const handleImport = () => {
    if (!file || !category || !fileBase64) return;
    importMut.mutate({ fileBase64, fileName: file.name, category, mapping, duplicateMode });
  };

  const reset = () => {
    setStep(1); setCategory(null); setFile(null); setFileBase64("");
    setParseResult(null); setMapping({}); setDuplicateMode("skip"); setImportResult(null);
  };

  // ── Step 1: Select category ──────────────────────────────────────────────
  const renderStep1 = () => (
    <div>
      <h2 className="text-lg font-semibold mb-1">Seleccionar categoría de inventario</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Elige la categoría que corresponde a tu archivo de plantilla. Cada categoría tiene columnas específicas.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(Object.entries(CATEGORY_META) as [Category, typeof CATEGORY_META[Category]][]).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={`p-4 rounded-xl border text-left transition-all hover:border-primary/50 hover:bg-primary/5
              ${category === key ? "border-primary bg-primary/10 shadow-md shadow-primary/10" : "border-border bg-card"}`}
          >
            <div className={`mb-2 ${meta.color}`}>{meta.icon}</div>
            <div className="font-semibold text-sm">{meta.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{meta.cols} columnas</div>
          </button>
        ))}
      </div>
      <div className="flex justify-end mt-6">
        <Button onClick={() => setStep(2)} disabled={!category} className="gap-2">
          Continuar <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  // ── Step 2: Upload file ──────────────────────────────────────────────────
  const renderStep2 = () => (
    <div>
      <h2 className="text-lg font-semibold mb-1">Subir archivo de inventario</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Acepta archivos <strong>Excel (.xlsx/.xls)</strong>, <strong>CSV</strong>, <strong>Word (.docx)</strong> y <strong>PDF</strong>.
        El sistema detectará automáticamente las columnas.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
          ${isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
      >
        <input ref={fileRef} type="file" accept={ACCEPTED_EXTENSIONS} onChange={handleFileChange} className="hidden" />
        <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium">Arrastra tu archivo aquí o haz clic para seleccionar</p>
        <p className="text-sm text-muted-foreground mt-1">PDF, Excel (.xlsx/.xls), Word (.docx), CSV</p>
      </div>

      {/* Selected file */}
      {file && (
        <div className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border">
          {fileIcon(file.name)}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setFile(null); setFileBase64(""); }}>
            ✕
          </Button>
        </div>
      )}

      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={() => setStep(1)}>Atrás</Button>
        <Button onClick={handleParse} disabled={!file || parseMut.isPending} className="gap-2">
          {parseMut.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</> : <>Analizar archivo <ChevronRight className="w-4 h-4" /></>}
        </Button>
      </div>
    </div>
  );

  // ── Step 3: Map columns ──────────────────────────────────────────────────
  const renderStep3 = () => {
    if (!parseResult) return null;
    const { headers, previewRows, totalRows, targetColumns } = parseResult;
    return (
      <div>
        <h2 className="text-lg font-semibold mb-1">Mapear columnas</h2>
        <p className="text-sm text-muted-foreground mb-1">
          El sistema sugirió las correspondencias automáticamente. Ajusta si es necesario.
        </p>
        <div className="flex gap-2 mb-4">
          <Badge variant="secondary">{totalRows} filas detectadas</Badge>
          <Badge variant="secondary">{headers.length} columnas en archivo</Badge>
          <Badge variant="outline" className="text-green-400 border-green-400/30">
            {Object.values(mapping).filter(v => v && v !== "null").length} columnas mapeadas
          </Badge>
        </div>

        {/* Mapping table */}
        <div className="rounded-xl border border-border overflow-hidden mb-4">
          <div className="grid grid-cols-[1fr_2rem_1fr] gap-0 bg-muted/20 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border">
            <span>Columna en archivo</span>
            <span></span>
            <span>Campo en sistema</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {headers.map(h => (
              <div key={h} className="grid grid-cols-[1fr_2rem_1fr] gap-0 px-4 py-2 border-b border-border/30 items-center hover:bg-muted/10">
                <span className="text-sm font-medium truncate">{h}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground mx-auto" />
                <select
                  value={mapping[h] ?? ""}
                  onChange={(e) => setMapping(prev => ({ ...prev, [h]: e.target.value }))}
                  className="text-sm bg-background border border-border rounded-md px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">— No mapear —</option>
                  {targetColumns.map(tc => (
                    <option key={tc.key} value={tc.key}>{tc.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        {previewRows.length > 0 && (
          <details className="mb-4">
            <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
              Vista previa de datos ({previewRows.length} filas)
            </summary>
            <div className="mt-2 overflow-x-auto rounded-lg border border-border">
              <table className="text-xs w-full">
                <thead className="bg-muted/20">
                  <tr>{headers.map(h => <th key={h} className="px-2 py-1 text-left font-medium text-muted-foreground">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-t border-border/30">
                      {headers.map(h => <td key={h} className="px-2 py-1 truncate max-w-[120px]">{row[h]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}

        {/* Duplicate mode selector */}
        <div className="mb-4 p-4 rounded-xl border border-border bg-muted/20">
          <p className="text-sm font-semibold mb-3">Manejo de duplicados</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setDuplicateMode("skip")}
              className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                duplicateMode === "skip"
                  ? "border-amber-500/50 bg-amber-500/10 shadow-sm"
                  : "border-border hover:border-border/80 hover:bg-muted/30"
              }`}
            >
              <SkipForward className={`w-5 h-5 mt-0.5 shrink-0 ${duplicateMode === "skip" ? "text-amber-400" : "text-muted-foreground"}`} />
              <div>
                <p className={`text-sm font-semibold ${duplicateMode === "skip" ? "text-amber-400" : ""}`}>Omitir duplicados</p>
                <p className="text-xs text-muted-foreground mt-0.5">Los registros que ya existen en el inventario serán ignorados.</p>
              </div>
            </button>
            <button
              onClick={() => setDuplicateMode("update")}
              className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                duplicateMode === "update"
                  ? "border-blue-500/50 bg-blue-500/10 shadow-sm"
                  : "border-border hover:border-border/80 hover:bg-muted/30"
              }`}
            >
              <RefreshCw className={`w-5 h-5 mt-0.5 shrink-0 ${duplicateMode === "update" ? "text-blue-400" : "text-muted-foreground"}`} />
              <div>
                <p className={`text-sm font-semibold ${duplicateMode === "update" ? "text-blue-400" : ""}`}>Actualizar duplicados</p>
                <p className="text-xs text-muted-foreground mt-0.5">Los registros existentes serán actualizados con los datos del archivo.</p>
              </div>
            </button>
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setStep(2)}>Atrás</Button>
          <Button onClick={handleImport} disabled={importMut.isPending} className="gap-2">
            {importMut.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</>
              : <><Download className="w-4 h-4" /> Importar {totalRows} registros</>}
          </Button>
        </div>
      </div>
    );
  };

  // ── Step 4: Result ───────────────────────────────────────────────────────
  const renderStep4 = () => {
    if (!importResult) return null;
    const { inserted, skipped, skippedNames, errors, total } = importResult;
    const updatedCount = importResult.updated ?? 0;
    const success = inserted > 0 || updatedCount > 0;
    return (
      <div className="text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4
          ${success ? "bg-green-500/20" : "bg-red-500/20"}`}>
          {success
            ? <CheckCircle2 className="w-8 h-8 text-green-400" />
            : <AlertCircle className="w-8 h-8 text-red-400" />}
        </div>
        <h2 className="text-xl font-bold mb-2">
          {success ? "¡Importación completada!" : "Importación con errores"}
        </h2>
        <p className="text-muted-foreground mb-6">
          Se procesaron <strong>{total}</strong> registros del archivo.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 max-w-lg mx-auto">
          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="text-2xl font-bold text-green-400">{inserted}</div>
            <div className="text-xs text-muted-foreground">Nuevos</div>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="text-2xl font-bold text-blue-400">{updatedCount}</div>
            <div className="text-xs text-muted-foreground">Actualizados</div>
          </div>
          <div className={`p-3 rounded-xl border ${skipped > 0 ? "bg-amber-500/10 border-amber-500/20" : "bg-muted/30 border-border"}`}>
            <div className={`text-2xl font-bold ${skipped > 0 ? "text-amber-400" : ""}`}>{skipped}</div>
            <div className="text-xs text-muted-foreground">Omitidos</div>
          </div>
          <div className={`p-3 rounded-xl border ${errors.length > 0 ? "bg-red-500/10 border-red-500/20" : "bg-muted/30 border-border"}`}>
            <div className={`text-2xl font-bold ${errors.length > 0 ? "text-red-400" : ""}`}>{errors.length}</div>
            <div className="text-xs text-muted-foreground">Errores</div>
          </div>
        </div>

        {skipped > 0 && (
          <details className="mb-4 text-left">
            <summary className="text-sm text-amber-400 cursor-pointer">Ver duplicados omitidos ({skipped})</summary>
            <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              {skippedNames.slice(0, 30).map((n, i) => (
                <p key={i} className="text-xs text-amber-300 mb-1">{i + 1}. {n} — ya existe en el inventario</p>
              ))}
              {skippedNames.length > 30 && <p className="text-xs text-muted-foreground">... y {skippedNames.length - 30} más</p>}
            </div>
          </details>
        )}

        {errors.length > 0 && (
          <details className="mb-6 text-left">
            <summary className="text-sm text-red-400 cursor-pointer">Ver errores ({errors.length})</summary>
            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              {errors.slice(0, 20).map((e, i) => (
                <p key={i} className="text-xs text-red-300 mb-1">{i + 1}. {e}</p>
              ))}
            </div>
          </details>
        )}

        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={reset} className="gap-2">
            <RotateCcw className="w-4 h-4" /> Nueva importación
          </Button>
          <Button onClick={() => navigate("/cctv")} className="gap-2">
            Ver inventario <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/cctv")} className="gap-1 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Atrás
          </Button>
          <span className="text-muted-foreground">/</span>
          <h1 className="font-semibold">Importar Inventario</h1>
          {category && (
            <>
              <span className="text-muted-foreground">/</span>
              <Badge variant="secondary" className={CATEGORY_META[category].color}>
                {CATEGORY_META[category].label}
              </Badge>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <StepIndicator current={step} />
        <Card className="border-border/50 shadow-xl">
          <CardContent className="p-6 sm:p-8">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

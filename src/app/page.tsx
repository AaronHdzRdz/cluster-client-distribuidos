"use client";

import { useState } from "react";

const BROKER_URL =
  process.env.NEXT_PUBLIC_BROKER_URL || "http://localhost:8001";

type StatusResponse = {
  video_id: string;
  status: string;
};

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setError(null);
    setVideoId(null);
    setStatus(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Primero selecciona un video, reina.");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setStatus("processing"); // Mostrar que está procesando

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${BROKER_URL}/upload-video`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("El broker me dijo que no, revisa el servidor.");
      }

      const data: StatusResponse = await res.json();
      setVideoId(data.video_id);
      setStatus(data.status);

      // Auto-actualizar estado cada 2 segundos
      const interval = setInterval(async () => {
        try {
          const statusRes = await fetch(`${BROKER_URL}/status/${data.video_id}`);
          if (statusRes.ok) {
            const statusData: StatusResponse = await statusRes.json();
            setStatus(statusData.status);
            
            if (statusData.status === "done" || statusData.status === "error") {
              clearInterval(interval);
            }
          }
        } catch (err) {
          console.error("Error actualizando estado:", err);
        }
      }, 2000);

      // Limpiar interval después de 5 minutos
      setTimeout(() => clearInterval(interval), 300000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Algo falló hablando con el broker.");
      setStatus(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!videoId) return;

    try {
      const res = await fetch(`${BROKER_URL}/status/${videoId}`);
      if (!res.ok) throw new Error("No pude obtener el estado del video.");

      const data: StatusResponse = await res.json();
      setStatus(data.status);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al consultar el estado.");
    }
  };

  const handleDownload = () => {
    if (!videoId) return;
    window.location.href = `${BROKER_URL}/download/${videoId}`;
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50"
    >
      <div className="w-full max-w-xl p-6 rounded-2xl bg-slate-900/80 border border-slate-700 shadow-xl space-y-6">
        <h1 className="text-2xl font-bold text-sky-400">
          Procesador de Video en Clúster
        </h1>

        <p className="text-sm text-slate-300">
          Sube un video (≈ 15s), el broker lo manda al clúster y aquí descargas
          la versión procesada.
        </p>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-200">
            Archivo de video
          </label>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-200
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-full file:border-0
                       file:text-sm file:font-semibold
                       file:bg-sky-500 file:text-white
                       hover:file:bg-sky-400
                       cursor-pointer"
          />
          {file && (
            <p className="text-xs text-slate-400">
              Seleccionado: <span className="font-semibold">{file.name}</span>
            </p>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={isUploading || !file}
          className="w-full py-2 rounded-xl font-semibold
                     bg-sky-500 disabled:bg-slate-600
                     hover:bg-sky-400 transition-colors"
        >
          {isUploading ? "Subiendo y mandando al clúster..." : "Subir y procesar"}
        </button>

        {/* Pantalla de carga mientras procesa */}
        {status === "processing" && (
          <div className="border border-sky-700 rounded-xl p-6 bg-sky-950/30">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400"></div>
              <div>
                <p className="text-sm font-semibold text-sky-400">
                  Procesando video en el clúster...
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Los workers están procesando los frames. Esto puede tomar un momento.
                </p>
              </div>
            </div>
          </div>
        )}

        {videoId && (
          <div className="space-y-3 border border-slate-700 rounded-xl p-4">
            <p className="text-xs text-slate-400">
              ID de video: <span className="font-mono">{videoId}</span>
            </p>
            <p className="text-sm">
              Estado actual:{" "}
              <span
                className={
                  status === "done"
                    ? "text-emerald-400 font-semibold"
                    : status === "error"
                      ? "text-rose-400 font-semibold"
                      : "text-amber-300 font-semibold"
                }
              >
                {status === "done" ? "✓ Completado" : 
                 status === "error" ? "✗ Error" : 
                 status === "processing" ? "⏳ Procesando..." : 
                 status ?? "desconocido"}
              </span>
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleCheckStatus}
                className="flex-1 py-2 rounded-xl text-sm font-semibold
                           bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Actualizar estado
              </button>

              <button
                onClick={handleDownload}
                disabled={status !== "done"}
                className="flex-1 py-2 rounded-xl text-sm font-semibold
                         bg-emerald-500 disabled:bg-slate-700
                         hover:bg-emerald-400 transition-colors"
              >
                Descargar procesado
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-rose-400 bg-rose-950/40 border border-rose-800 rounded-lg p-3">
            {error}
          </p>
        )}

        <p className="text-[11px] text-slate-500 text-center">
          Broker: <span className="font-mono">{BROKER_URL}</span>
        </p>
      </div>
    </main>
  );
}

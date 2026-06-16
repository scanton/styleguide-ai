"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { X, Upload, ImageIcon, ExternalLink, Clipboard } from "lucide-react";
import { useSession } from "next-auth/react";

interface Props {
  prompt: string;
  toolOrigin: string;
  toolContext?: string;
  onClose: () => void;
  onUploaded?: () => void;
}

type AspectRatioClass = "portrait" | "square" | "landscape";

function classifyAspectRatio(w: number, h: number): AspectRatioClass {
  const ratio = w / h;
  if (ratio < 0.85) return "portrait";
  if (ratio > 1.18) return "landscape";
  return "square";
}

// Vercel serverless functions cap request bodies at 4.5 MB regardless of plan.
// We target 3.5 MB to leave headroom for multipart framing + other fields.
const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;
const MAX_DIM = 2400; // px — preserves AI render detail while compressing

// Compress an image file to fit under maxBytes using Canvas.
// Tries quality 0.88, then 0.72, then shrinks dimensions if still too big.
function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("load")); };
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth;
      let h = img.naturalHeight;

      // Scale down if either dimension exceeds MAX_DIM
      if (w > MAX_DIM || h > MAX_DIM) {
        const scale = MAX_DIM / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas")); return; }
      ctx.drawImage(img, 0, 0, w, h);

      const outputName = file.name.replace(/\.[^.]+$/, ".jpg");

      function tryQuality(quality: number, shrink: boolean) {
        if (shrink) {
          w = Math.round(w * 0.75);
          h = Math.round(h * 0.75);
          canvas.width = w;
          canvas.height = h;
          ctx!.drawImage(img, 0, 0, w, h);
        }
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error("blob")); return; }
          if (blob.size <= MAX_UPLOAD_BYTES) {
            resolve(new File([blob], outputName, { type: "image/jpeg" }));
          } else if (quality > 0.5) {
            tryQuality(quality - 0.16, false);
          } else {
            // Shrink dimensions and retry
            tryQuality(0.82, true);
          }
        }, "image/jpeg", quality);
      }

      tryQuality(0.88, false);
    };
    img.src = url;
  });
}

export function ShareToRisingModal({ prompt, toolOrigin, toolContext, onClose, onUploaded }: Props) {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [aspectRatioClass, setAspectRatioClass] = useState<AspectRatioClass>("square");
  const [caption, setCaption] = useState(prompt);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pasteFlash, setPasteFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please upload an image file (JPEG, PNG, WebP, or GIF).");
      return;
    }
    setError(null);

    let ready = f;
    if (f.size > MAX_UPLOAD_BYTES) {
      setCompressing(true);
      try {
        ready = await compressImage(f);
      } catch {
        setError("Could not process this image. Please try a different file.");
        setCompressing(false);
        return;
      }
      setCompressing(false);
    }

    setFile(ready);
    const url = URL.createObjectURL(ready);
    setPreview(url);

    const img = new Image();
    img.onload = () => {
      setAspectRatioClass(classifyAspectRatio(img.naturalWidth, img.naturalHeight));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  // Clipboard paste — Ctrl/Cmd+V anywhere while the modal is open
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) {
            handleFile(f);
            setPasteFlash(true);
            setTimeout(() => setPasteFlash(false), 800);
          }
          break;
        }
      }
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [handleFile]);

  async function handleSubmit() {
    if (!file) return;
    setUploading(true);
    setError(null);

    const form = new FormData();
    form.append("file", file);
    form.append("caption", caption);
    form.append("toolOrigin", toolOrigin);
    if (toolContext) form.append("toolContext", toolContext);
    form.append("aspectRatioClass", aspectRatioClass);

    try {
      const res = await fetch("/api/rising/upload", { method: "POST", body: form });
      let data: { ok?: boolean; error?: string } = {};
      try { data = await res.json(); } catch { /* empty or non-JSON body */ }
      if (!res.ok) throw new Error(data.error ?? `Upload failed (${res.status})`);
      setSuccess(true);
      onUploaded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (!session?.user) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-3 right-3 text-stone-400 hover:text-stone-700">
            <X size={18} />
          </button>
          <p className="font-semibold text-stone-800 mb-2">Sign in to share</p>
          <p className="text-stone-500 text-sm">You need to be signed in to share to Rising.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-100">
          <div>
            <h2 className="font-bold text-stone-900 text-lg">Share to Rising</h2>
            <p className="text-stone-400 text-xs mt-0.5">Upload your rendered image to the community gallery</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {success ? (
            <div className="text-center py-8 space-y-4">
              <div className="text-4xl">🎉</div>
              <p className="font-semibold text-stone-800">Your image is live on Rising!</p>
              <p className="text-stone-500 text-sm">It will be visible for 30 days and can earn likes from the community.</p>
              <a
                href="/rising"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[oklch(0.42_0.22_285)] hover:underline"
              >
                View Rising <ExternalLink size={13} />
              </a>
            </div>
          ) : (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-colors flex items-center justify-center overflow-hidden
                  ${pasteFlash ? "border-[oklch(0.42_0.22_285)] bg-purple-50" : dragging ? "border-[oklch(0.42_0.22_285)] bg-purple-50" : "border-stone-200 hover:border-stone-400 bg-stone-50"}
                  ${preview ? "h-56" : "h-40"}`}
              >
                {compressing ? (
                  <div className="flex flex-col items-center gap-2 text-stone-400 pointer-events-none">
                    <div className="w-6 h-6 border-2 border-stone-300 border-t-[oklch(0.42_0.22_285)] rounded-full animate-spin" />
                    <p className="text-sm font-medium">Compressing image…</p>
                  </div>
                ) : preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-stone-400 pointer-events-none">
                    <ImageIcon size={28} />
                    <p className="text-sm font-medium">Drop, click, or paste an image</p>
                    <p className="text-xs">JPEG, PNG, WebP, GIF — any size</p>
                    <div className="flex items-center gap-1 mt-1 text-[11px] text-stone-300">
                      <Clipboard size={11} />
                      <span>Ctrl/Cmd+V to paste from clipboard</span>
                    </div>
                  </div>
                )}
                {preview && (
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                    <span className="text-white text-sm font-semibold bg-black/50 px-3 py-1 rounded-full flex items-center gap-1.5">
                      <Upload size={13} /> Replace
                    </span>
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>

              {/* Caption */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Prompt / Caption
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-800 resize-none focus:outline-none focus:ring-2 focus:ring-[oklch(0.42_0.22_285)] focus:border-transparent"
                  placeholder="The prompt you used to generate this image…"
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={!file || uploading || compressing}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-opacity
                  bg-[oklch(0.42_0.22_285)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {compressing ? "Processing…" : uploading ? "Uploading…" : "Share to Rising"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

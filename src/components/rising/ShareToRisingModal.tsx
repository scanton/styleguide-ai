"use client";
import { useState, useRef, useCallback } from "react";
import { X, Upload, ImageIcon, ExternalLink } from "lucide-react";
import { useSession } from "next-auth/react";

interface Props {
  prompt: string;
  toolOrigin: string;
  toolContext?: string;
  onClose: () => void;
}

type AspectRatioClass = "portrait" | "square" | "landscape";

function classifyAspectRatio(w: number, h: number): AspectRatioClass {
  const ratio = w / h;
  if (ratio < 0.85) return "portrait";
  if (ratio > 1.18) return "landscape";
  return "square";
}

export function ShareToRisingModal({ prompt, toolOrigin, toolContext, onClose }: Props) {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [aspectRatioClass, setAspectRatioClass] = useState<AspectRatioClass>("square");
  const [caption, setCaption] = useState(prompt);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Please upload an image file (JPEG, PNG, WebP, or GIF).");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("Image must be under 10 MB.");
      return;
    }
    setError(null);
    setFile(f);

    const url = URL.createObjectURL(f);
    setPreview(url);

    // Measure dimensions for aspect ratio classification
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
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setSuccess(true);
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
                  ${dragging ? "border-[oklch(0.42_0.22_285)] bg-purple-50" : "border-stone-200 hover:border-stone-400 bg-stone-50"}
                  ${preview ? "h-56" : "h-40"}`}
              >
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-stone-400 pointer-events-none">
                    <ImageIcon size={28} />
                    <p className="text-sm font-medium">Drop image here or click to browse</p>
                    <p className="text-xs">JPEG, PNG, WebP, GIF — max 10 MB</p>
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
                disabled={!file || uploading}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-opacity
                  bg-[oklch(0.42_0.22_285)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {uploading ? "Uploading…" : "Share to Rising"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

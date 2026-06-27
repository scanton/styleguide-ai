"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X, Upload } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";

const VALID_TYPES = [
  "artist", "movement", "media", "technique",
  "subject", "setting", "inspiration",
] as const;

const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;
const MAX_DIM = 2400;

function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("load")); };
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > MAX_DIM || h > MAX_DIM) {
        const scale = MAX_DIM / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const outputName = file.name.replace(/\.[^.]+$/, ".jpg");
      function tryQuality(quality: number, shrink: boolean) {
        if (shrink) {
          w = Math.round(w * 0.75); h = Math.round(h * 0.75);
          canvas.width = w; canvas.height = h;
          ctx!.drawImage(img, 0, 0, w, h);
        }
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error("blob")); return; }
          if (blob.size <= MAX_UPLOAD_BYTES) {
            resolve(new File([blob], outputName, { type: "image/jpeg" }));
          } else if (quality > 0.5) {
            tryQuality(quality - 0.16, false);
          } else {
            tryQuality(0.82, true);
          }
        }, "image/jpeg", quality);
      }
      tryQuality(0.88, false);
    };
    img.src = url;
  });
}

interface Props {
  onClose: () => void;
  onSubmitted: () => void;
}

export function AddCardModal({ onClose, onSubmitted }: Props) {
  const { data: session } = useSession();
  const t = useTranslations("styletarot");

  const displayName =
    (session?.user as { displayName?: string } | null | undefined)?.displayName ??
    session?.user?.name ??
    "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("subject");
  const [creator, setCreator] = useState(displayName);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pasteFlash, setPasteFlash] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Keep creator in sync with session on first load
  useEffect(() => {
    if (displayName && !creator) setCreator(displayName);
  }, [displayName, creator]);

  const handleFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setError(t("addCardImageTypeError"));
      return;
    }
    setError(null);
    let ready = f;
    if (f.size > MAX_UPLOAD_BYTES) {
      setCompressing(true);
      try { ready = await compressImage(f); } catch { setError(t("addCardImageProcessError")); setCompressing(false); return; }
      setCompressing(false);
    }
    setFile(ready);
    const url = URL.createObjectURL(ready);
    setPreview(url);
  }, [t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  // Paste support
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) { handleFile(f); setPasteFlash(true); setTimeout(() => setPasteFlash(false), 800); }
          break;
        }
      }
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [handleFile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim() || !description.trim() || !creator.trim()) return;
    setSubmitting(true); setError(null);

    const form = new FormData();
    form.append("file", file);
    form.append("title", title.trim());
    form.append("description", description.trim());
    form.append("type", type);
    form.append("creator", creator.trim());

    try {
      const res = await fetch("/api/styletarot/community-cards", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setSuccess(true);
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("addCardError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="text-4xl mb-3">🎴</div>
          <h2 className="font-heading text-xl text-stone-900 mb-2">{t("addCardSuccessTitle")}</h2>
          <p className="text-sm text-stone-600 mb-6">{t("addCardSuccess")}</p>
          <button onClick={onClose} className="px-6 py-2 rounded-full bg-[oklch(0.42_0.22_285)] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
            {t("addCardClose")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <div>
            <h2 className="font-heading text-lg text-stone-900">{t("addCardModalTitle")}</h2>
            <p className="text-xs text-stone-500 mt-0.5">{t("addCardModalSubtitle")}</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 transition-colors p-1" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">{t("cardTitleLabel")} *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("cardTitlePlaceholder")}
              maxLength={100}
              required
              className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[oklch(0.42_0.22_285)] focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">{t("cardDescriptionLabel")} *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("cardDescriptionPlaceholder")}
              maxLength={500}
              required
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[oklch(0.42_0.22_285)] focus:border-transparent resize-none"
            />
          </div>

          {/* Type + Creator row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">{t("cardTypeLabel")} *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[oklch(0.42_0.22_285)] focus:border-transparent bg-white"
              >
                {VALID_TYPES.map((cardType) => (
                  <option key={cardType} value={cardType}>{cardType.charAt(0).toUpperCase() + cardType.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">{t("cardCreatorLabel")} *</label>
              <input
                type="text"
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                maxLength={100}
                required
                className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[oklch(0.42_0.22_285)] focus:border-transparent"
              />
            </div>
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">{t("cardImageLabel")} *</label>
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Preview" className="w-full max-h-48 object-contain rounded-lg border border-stone-200 bg-stone-50" />
                <button
                  type="button"
                  onClick={() => { setFile(null); setPreview(null); }}
                  className="absolute top-2 right-2 bg-white/90 rounded-full p-1 text-stone-500 hover:text-stone-800 shadow"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div
                className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  pasteFlash || dragging
                    ? "border-[oklch(0.42_0.22_285)] bg-purple-50"
                    : "border-stone-200 hover:border-stone-400 bg-stone-50"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                {compressing ? (
                  <p className="text-sm text-stone-500">Compressing…</p>
                ) : (
                  <>
                    <Upload size={24} className="mx-auto text-stone-400 mb-2" />
                    <p className="text-sm font-medium text-stone-600">{t("addCardImageHint")}</p>
                    <p className="text-xs text-stone-400 mt-1">Ctrl/Cmd+V {t("addCardImagePaste")}</p>
                  </>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !file || !title.trim() || !description.trim() || !creator.trim()}
            className="w-full py-2.5 rounded-full bg-[oklch(0.42_0.22_285)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {submitting ? t("addCardSubmitting") : t("addCardSubmit")}
          </button>
        </form>
      </div>
    </div>
  );
}

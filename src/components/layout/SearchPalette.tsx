"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

interface SearchResult {
  id: string;
  type: "artist" | "movement" | "article" | "theme";
  title: string;
  subtitle?: string;
  href: string;
}

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  artist: "Artist",
  movement: "Movement",
  article: "Article",
  theme: "Theme",
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SearchPalette({ open, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(data.results);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const navigate = (href: string) => {
    router.push(href);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="p-0 gap-0 max-w-lg">
        <DialogTitle className="sr-only">Search StyleGuideAI</DialogTitle>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search artists, movements, articles…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching…
              </div>
            )}
            {!loading && query && results.length === 0 && (
              <CommandEmpty>No results for &ldquo;{query}&rdquo;</CommandEmpty>
            )}
            {!loading && results.length > 0 && (
              <CommandGroup heading="Results">
                {results.map((r) => (
                  <CommandItem
                    key={r.id}
                    value={r.id}
                    onSelect={() => navigate(r.href)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      {r.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {TYPE_LABELS[r.type]}
                    </Badge>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {!query && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Start typing to search artists, art movements, and articles.
              </div>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

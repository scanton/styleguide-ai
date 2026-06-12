import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getMovements,
  getArtists,
  getArtworks,
  getGalleryKeys,
} from "@/lib/museum-data";
import EditorialGallery, {
  type GalleryWork,
} from "@/components/museum/EditorialGallery";

export const dynamic = "force-static";

interface GalleryParams {
  kind: string;
  id: string;
}

function buildGallery(kind: string, id: string) {
  const artworks = getArtworks();
  const artists = getArtists();
  const movements = getMovements();
  const artistById = new Map(artists.map((a) => [a.id, a]));

  if (kind === "artist") {
    const artist = artistById.get(id);
    if (!artist) return null;
    const works = artworks
      .filter((w) => w.artistId === id)
      .sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
    if (works.length === 0) return null;
    const movement = movements.find((m) => m.id === artist.movements[0]);
    return {
      eyebrow: "Editorial Gallery",
      title: artist.name,
      subtitle: `${artist.birthYear < 0 ? `${Math.abs(artist.birthYear)} BCE` : artist.birthYear} – ${
        artist.deathYear === null
          ? "today"
          : artist.deathYear < 0
            ? `${Math.abs(artist.deathYear)} BCE`
            : artist.deathYear
      } · ${artist.nationality.join(", ")}`,
      description: artist.description,
      accentColor: movement?.color ?? "#6B46C1",
      works: works.map(
        (w): GalleryWork => ({
          id: w.id,
          title: w.title,
          year: w.year,
          imageUrl: w.imageUrl,
          width: w.width,
          height: w.height,
          description: w.description,
          source: w.source,
          licenseType: w.licenseType,
        })
      ),
    };
  }

  if (kind === "movement") {
    const movement = movements.find((m) => m.id === id);
    if (!movement) return null;
    const memberIds = new Set(movement.keyArtists);
    const works = artworks
      .filter(
        (w) =>
          w.movementId === id || (w.artistId !== null && memberIds.has(w.artistId))
      )
      .sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
    if (works.length === 0) return null;
    return {
      eyebrow: "Editorial Gallery",
      title: movement.name,
      subtitle: `${movement.startYear < 0 ? `${Math.abs(movement.startYear).toLocaleString("en-US")} BCE` : movement.startYear} – ${
        movement.endYear ?? "today"
      } · ${movement.region.join(", ")}`,
      description: movement.description,
      accentColor: movement.color,
      works: works.map(
        (w): GalleryWork => ({
          id: w.id,
          title: w.title,
          year: w.year,
          imageUrl: w.imageUrl,
          width: w.width,
          height: w.height,
          description: w.description,
          artistName: w.artistId ? artistById.get(w.artistId)?.name : undefined,
          source: w.source,
          licenseType: w.licenseType,
        })
      ),
    };
  }

  return null;
}

export function generateStaticParams(): GalleryParams[] {
  return getGalleryKeys().map((key) => {
    const [kind, id] = key.split(":");
    return { kind, id };
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<GalleryParams>;
}): Promise<Metadata> {
  const { kind, id } = await params;
  const gallery = buildGallery(kind, id);
  if (!gallery) return { title: "Gallery | StyleGuideAI" };
  return {
    title: `${gallery.title} — Editorial Gallery | StyleGuideAI`,
    description: gallery.description,
  };
}

export default async function GalleryPage({
  params,
}: {
  params: Promise<GalleryParams>;
}) {
  const { kind, id } = await params;
  const gallery = buildGallery(kind, id);
  if (!gallery) notFound();

  return <EditorialGallery {...gallery} />;
}

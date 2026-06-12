export interface ArtMovement {
  id: string;
  name: string;
  startYear: number;
  endYear: number | null;
  color: string;
  description: string;
  wikipediaUrl: string;
  influences: string[];
  influencedBy: string[];
  keyArtists: string[];
  region: string[];
  tags: string[];
}

export interface Artist {
  id: string;
  name: string;
  birthYear: number;
  deathYear: number | null;
  nationality: string[];
  movements: string[];
  description: string;
  wikipediaUrl: string;
  portraitUrl: string;
  artworkIds: string[];
  timelineYear: number;
}

export interface WorldEvent {
  id: string;
  name: string;
  year: number; // negative = BCE
  description: string;
  influencedMovements: string[]; // ArtMovement IDs
}

export interface ArtistConnection {
  a: string; // Artist ID
  b: string; // Artist ID
  label: string; // e.g. "teacher and student"
}

export interface Artwork {
  id: string;
  artistId: string | null;
  movementId: string | null;
  title: string;
  year: number | null;
  imageUrl: string;
  source: "wikimedia" | "rijksmuseum" | "ai-generated" | "other";
  licenseType: string;
  width: number;
  height: number;
  description: string | null;
}

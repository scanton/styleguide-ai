import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { type CommunityEvent, fetchEvents } from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";

const TAG_COLORS: Record<string, string> = {
  "Daily Theme": "#5B2FA0",
  "Contest":     "#3A9B8E",
  "Challenge":   "#C45C2E",
  "Special":     "#B89A20",
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function EventCard({ item }: { item: CommunityEvent }) {
  const primaryTag = item.discordTags[0];
  const tagColor = primaryTag ? (TAG_COLORS[primaryTag] ?? "#756B5C") : "#756B5C";

  return (
    <Pressable
      onPress={() => item.threadUrl && Linking.openURL(item.threadUrl)}
      disabled={!item.threadUrl}
      className="bg-white border border-border rounded-xl mb-3 overflow-hidden active:opacity-70"
    >
      {item.imageUrl && (
        <Image
          source={{ uri: item.imageUrl }}
          style={{ width: "100%", height: 140 }}
          resizeMode="cover"
          // Discord CDN URLs can expire; show nothing on error
        />
      )}
      <View className="p-4">
        <View className="flex-row flex-wrap gap-1.5 mb-2">
          {item.discordTags.map((tag) => (
            <View
              key={tag}
              style={{ backgroundColor: TAG_COLORS[tag] ?? "#756B5C", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}
            >
              <Text style={{ color: "#fff", fontSize: 10, fontFamily: "Inter_600SemiBold" }}>{tag}</Text>
            </View>
          ))}
        </View>
        <Text className="font-sans-semibold text-base text-cream-foreground leading-snug mb-1" numberOfLines={2}>
          {item.title}
        </Text>
        {item.description && (
          <Text className="font-sans text-sm text-muted-foreground leading-relaxed mb-2" numberOfLines={3}>
            {item.description}
          </Text>
        )}
        <View className="flex-row items-center justify-between">
          <Text className="font-sans text-xs text-muted-foreground">{formatDate(item.postedAt)}</Text>
          {item.threadUrl && (
            <Text style={{ color: tagColor, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
              View on Discord ›
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function ThemesScreen() {
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string, pg: number, append: boolean) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    const data = await fetchEvents({ q, page: pg, limit: 24 });
    if (append) setEvents((prev) => [...prev, ...data.events]);
    else setEvents(data.events);
    setTotal(data.total);
    setPage(pg);
    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => { load("", 1, false); }, [load]);

  function handleSearch(q: string) {
    setQuery(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(q, 1, false), 350);
  }

  function handleLoadMore() {
    if (loadingMore || events.length >= total) return;
    load(query, page + 1, true);
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <AppHeader title="Themes & Events" right={
        <Pressable onPress={() => router.back()} className="active:opacity-70">
          <Text className="font-sans text-white text-base">← Back</Text>
        </Pressable>
      } />

      <View className="px-4 py-3 bg-white border-b border-border">
        <View className="flex-row items-center bg-cream border border-border rounded-xl px-3 gap-2" style={{ height: 42 }}>
          <Text className="text-muted-foreground">🔍</Text>
          <TextInput
            value={query}
            onChangeText={handleSearch}
            placeholder="Search themes and events…"
            placeholderTextColor="#A89E8C"
            className="flex-1 font-sans text-cream-foreground text-base"
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
        </View>
        {total > 0 && (
          <Text className="font-sans text-xs text-muted-foreground mt-1.5">{total} events</Text>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5B2FA0" />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <EventCard item={item} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color="#5B2FA0" style={{ marginVertical: 16 }} />
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <Text className="font-sans-semibold text-lg text-muted-foreground">No events found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

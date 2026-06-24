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
import { type Article, fetchArticles } from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function ArticleCard({ item }: { item: Article }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(item.mediumUrl)}
      className="bg-white border border-border rounded-xl mb-3 overflow-hidden active:opacity-70"
    >
      {item.thumbnailUrl && (
        <Image
          source={{ uri: item.thumbnailUrl }}
          style={{ width: "100%", height: 160 }}
          resizeMode="cover"
        />
      )}
      <View className="p-4">
        {item.tags.length > 0 && (
          <View className="flex-row flex-wrap gap-1.5 mb-2">
            {item.tags.slice(0, 3).map((tag) => (
              <View key={tag} className="bg-cream border border-border rounded-full px-2 py-0.5">
                <Text className="font-sans text-xs text-muted-foreground">{tag}</Text>
              </View>
            ))}
          </View>
        )}
        <Text className="font-sans-semibold text-base text-cream-foreground leading-snug mb-1" numberOfLines={2}>
          {item.title}
        </Text>
        {item.summary && (
          <Text className="font-sans text-sm text-muted-foreground leading-relaxed mb-2" numberOfLines={3}>
            {item.summary}
          </Text>
        )}
        <Text className="font-sans text-xs text-muted-foreground">{formatDate(item.publishedAt)}</Text>
      </View>
    </Pressable>
  );
}

export default function ArticlesScreen() {
  const [query, setQuery] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (q: string, pg: number, append: boolean) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    const data = await fetchArticles({ q, page: pg, limit: 24 });
    if (append) {
      setArticles((prev) => [...prev, ...data.articles]);
    } else {
      setArticles(data.articles);
    }
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
    if (loadingMore || articles.length >= total) return;
    load(query, page + 1, true);
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <AppHeader title="Articles" right={
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
            placeholder="Search articles…"
            placeholderTextColor="#A89E8C"
            className="flex-1 font-sans text-cream-foreground text-base"
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
        </View>
        {total > 0 && (
          <Text className="font-sans text-xs text-muted-foreground mt-1.5">{total} articles</Text>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5B2FA0" />
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <ArticleCard item={item} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color="#5B2FA0" style={{ marginVertical: 16 }} />
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <Text className="font-sans-semibold text-lg text-muted-foreground">No articles found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useState } from "react";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/components/AppHeader";
import { type SearchResult, searchContent } from "@/lib/api";

const TYPE_COLORS: Record<SearchResult["type"], { bg: string; label: string }> = {
  artist:   { bg: "#2B8FA0", label: "Artist" },
  movement: { bg: "#5B2FA0", label: "Movement" },
  article:  { bg: "#B89A20", label: "Article" },
};

function ResultRow({ item }: { item: SearchResult }) {
  const colors = TYPE_COLORS[item.type];

  function handlePress() {
    if (item.type === "article") {
      // Articles link to Medium — open externally
      const mediumHref = item.href.startsWith("http")
        ? item.href
        : `https://www.styleguideai.com${item.href}`;
      Linking.openURL(mediumHref);
    } else {
      // Artists and movements open the museum web page for now (M6 will add native museum)
      Linking.openURL(`https://www.styleguideai.com${item.href}`);
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      className="flex-row items-center px-4 py-3.5 bg-white border-b border-border active:opacity-70"
      style={{ minHeight: 60 }}
    >
      <View
        style={{ backgroundColor: colors.bg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginRight: 12 }}
      >
        <Text style={{ color: "#fff", fontSize: 9, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" }}>
          {colors.label}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="font-sans-semibold text-cream-foreground text-sm" numberOfLines={1}>
          {item.title}
        </Text>
        {item.subtitle ? (
          <Text className="font-sans text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
            {item.subtitle}
          </Text>
        ) : null}
      </View>
      <Text className="text-muted-foreground text-lg ml-2">›</Text>
    </Pressable>
  );
}

export default function SearchScreen() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    const data = await searchContent(q);
    setResults(data);
    setLoading(false);
    setSearched(true);
  }, []);

  // Group results by type for section headers
  const artists = results.filter((r) => r.type === "artist");
  const movements = results.filter((r) => r.type === "movement");
  const articles = results.filter((r) => r.type === "article");

  const sections: { title: string; data: SearchResult[] }[] = [
    { title: "Artists", data: artists },
    { title: "Art Movements", data: movements },
    { title: "Articles", data: articles },
  ].filter((s) => s.data.length > 0);

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <AppHeader title={t("nav.search", "Search")} />

      {/* Search input */}
      <View className="px-4 py-3 bg-white border-b border-border">
        <View className="flex-row items-center bg-cream border border-border rounded-xl px-3 gap-2" style={{ height: 42 }}>
          <Text className="text-muted-foreground text-base">🔍</Text>
          <TextInput
            value={query}
            onChangeText={handleSearch}
            placeholder={t("search.placeholder", "Artists, movements, articles…")}
            placeholderTextColor="#A89E8C"
            className="flex-1 font-sans text-cream-foreground text-base"
            autoFocus={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Results */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5B2FA0" />
        </View>
      ) : !searched ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="font-sans-semibold text-xl text-purple text-center mb-2">
            {t("search.headline", "Discover the art world")}
          </Text>
          <Text className="font-sans text-sm text-muted-foreground text-center">
            {t("search.subtitle", "Search artists, art movements, and articles. Type at least 2 characters.")}
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="font-sans-semibold text-lg text-cream-foreground text-center">
            {t("search.noResults", "No results for")} "{query}"
          </Text>
          <Text className="font-sans text-sm text-muted-foreground text-center mt-2">
            {t("search.tryDifferent", "Try a different spelling or a broader term.")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(s) => s.title}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item: section }) => (
            <View>
              <Text className="font-sans-semibold text-xs text-muted-foreground uppercase tracking-widest px-4 py-2 bg-cream">
                {section.title}
              </Text>
              {section.data.map((result) => (
                <ResultRow key={result.id} item={result} />
              ))}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

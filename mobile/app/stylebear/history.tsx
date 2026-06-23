import { FlatList, Pressable, Text, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/components/AppHeader";
import { useSession } from "@/lib/SessionContext";
import { fetchStyleBearHistory, deleteStyleBearHistory } from "@/lib/api";

interface HistoryEntry {
  id: string;
  prompt: string;
  inputs: string;
  createdAt: string;
}

export default function StyleBearHistoryScreen() {
  const { t } = useTranslation();
  const { sessionToken } = useSession();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionToken) return;
    fetchStyleBearHistory(sessionToken).then((h) => {
      setHistory(h);
      setLoading(false);
    });
  }, [sessionToken]);

  async function handleCopy(entry: HistoryEntry) {
    await Clipboard.setStringAsync(entry.prompt);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleDelete(entry: HistoryEntry) {
    Alert.alert("Delete prompt?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!sessionToken) return;
          await deleteStyleBearHistory(entry.id, sessionToken);
          setHistory((prev) => prev.filter((e) => e.id !== entry.id));
        },
      },
    ]);
  }

  function parseInputs(inputs: string): string {
    try {
      const parsed = JSON.parse(inputs);
      const parts: string[] = [];
      if (parsed.promptStyle) parts.push(parsed.promptStyle);
      if (parsed.movements?.length) parts.push(parsed.movements.join(", "));
      if (parsed.media?.length) parts.push(parsed.media.join(", "));
      return parts.join(" · ") || "StyleBear";
    } catch {
      return "StyleBear";
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <AppHeader
        title={t("account.stylebearHistory", "StyleBear History")}
        right={
          <Pressable onPress={() => router.back()} className="active:opacity-70">
            <Text className="text-white font-sans text-sm">Back</Text>
          </Pressable>
        }
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="font-sans text-muted-foreground">{t("common.loading", "Loading…")}</Text>
        </View>
      ) : history.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="font-sans-semibold text-xl text-purple mb-2">No history yet</Text>
          <Text className="font-sans text-muted-foreground text-center">
            Generate prompts with StyleBear and they'll appear here.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-6 bg-purple rounded-full px-8 py-3 active:opacity-80"
          >
            <Text className="font-sans-semibold text-white">Open StyleBear</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View className="bg-white border border-border rounded-xl p-4 mb-3">
              <Text className="font-sans text-xs text-muted-foreground mb-2">
                {parseInputs(item.inputs)}
              </Text>
              <Text className="font-sans text-cream-foreground text-sm leading-relaxed" numberOfLines={4}>
                {item.prompt}
              </Text>
              <View className="flex-row gap-2 mt-3">
                <Pressable
                  onPress={() => handleCopy(item)}
                  className="flex-1 bg-teal rounded-full py-2 items-center active:opacity-80"
                >
                  <Text className="font-sans-semibold text-white text-sm">
                    {copiedId === item.id ? "Copied!" : "Copy"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(item)}
                  className="border border-border rounded-full px-4 py-2 items-center active:opacity-70"
                >
                  <Text className="font-sans text-muted-foreground text-sm">Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

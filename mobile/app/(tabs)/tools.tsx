import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/components/AppHeader";

const TOOLS = [
  {
    key: "stylebear",
    title: "StyleBear",
    subtitle: "AI art prompt generator",
    route: "/stylebear" as const,
    ready: true,
  },
  {
    key: "styledice",
    title: "StyleDice",
    subtitle: "Roll for creative inspiration",
    route: "/styledice" as const,
    ready: true,
  },
  {
    key: "styletarot",
    title: "StyleTarot",
    subtitle: "Draw your artistic destiny",
    route: "/styletarot" as const,
    ready: true,
  },
];

export default function ToolsScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <AppHeader title={t("nav.tools", "Tools")} />
      <View className="flex-1 p-4">
        {TOOLS.map((tool) => (
          <Pressable
            key={tool.key}
            onPress={() => tool.ready && router.push(tool.route as never)}
            disabled={!tool.ready}
            className={`bg-white border border-border rounded-xl p-4 mb-3 flex-row items-center justify-between active:opacity-70 ${!tool.ready ? "opacity-40" : ""}`}
            style={{ minHeight: 72 }}
          >
            <View>
              <Text className="font-sans-semibold text-lg text-purple">{tool.title}</Text>
              <Text className="font-sans text-sm text-muted-foreground mt-0.5">{tool.subtitle}</Text>
            </View>
            <Text className="text-muted-foreground text-xl">›</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

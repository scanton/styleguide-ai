import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/components/AppHeader";

export default function SearchScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <AppHeader title={t("nav.search", "Search")} />
      <View className="flex-1 items-center justify-center">
        <Text className="font-sans-semibold text-xl text-purple">Search — coming in M5</Text>
      </View>
    </SafeAreaView>
  );
}

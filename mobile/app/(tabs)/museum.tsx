import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/components/AppHeader";

export default function MuseumScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <AppHeader title={t("nav.museum", "Museum")} />
      <View className="flex-1 items-center justify-center">
        <Text className="font-sans-semibold text-xl text-purple">Museum — coming in M6</Text>
      </View>
    </SafeAreaView>
  );
}

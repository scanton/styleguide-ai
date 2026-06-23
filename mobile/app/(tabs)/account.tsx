import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/components/AppHeader";
import { useSession } from "@/lib/SessionContext";

function AccountRow({
  label,
  onPress,
  destructive = false,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-border active:opacity-70"
      style={{ minHeight: 52 }}
    >
      <Text
        className={`font-sans text-base ${destructive ? "text-red-600" : "text-cream-foreground"}`}
      >
        {label}
      </Text>
      {!destructive && (
        <Text className="text-muted-foreground text-base">›</Text>
      )}
    </Pressable>
  );
}

export default function AccountScreen() {
  const { t } = useTranslation();
  const { user, loading, signOut } = useSession();

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
        <AppHeader title={t("nav.account", "Account")} />
        <View className="flex-1 items-center justify-center">
          <Text className="font-sans text-muted-foreground">{t("common.loading", "Loading…")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
        <AppHeader title={t("nav.account", "Account")} />
        <View className="flex-1 items-center justify-center px-6 gap-4">
          <Text className="font-sans-semibold text-2xl text-purple text-center">
            {t("account.signInCta", "Sign in to StyleGuideAI")}
          </Text>
          <Text className="font-sans text-base text-muted-foreground text-center">
            {t("account.signInDesc", "Save your generated prompts, vote on Rising, and sync your preferences.")}
          </Text>
          <Pressable
            onPress={() => router.push("/sign-in")}
            className="mt-4 bg-purple px-8 py-3 rounded-full active:opacity-80"
            style={{ minHeight: 52 }}
          >
            <Text className="font-sans-semibold text-white text-base">
              {t("account.signIn", "Sign in with Google")}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <AppHeader title={t("nav.account", "Account")} />
      <ScrollView>
        {/* Profile card */}
        <View className="bg-purple px-6 py-8 items-center gap-3">
          {user.image ? (
            <Image
              source={{ uri: user.image }}
              className="w-20 h-20 rounded-full border-2 border-white"
            />
          ) : (
            <View className="w-20 h-20 rounded-full bg-purple-light items-center justify-center border-2 border-white">
              <Text className="font-sans-bold text-white text-3xl">
                {(user.name ?? user.email ?? "?")[0].toUpperCase()}
              </Text>
            </View>
          )}
          <Text className="font-sans-semibold text-white text-xl">
            {user.name ?? t("account.noName", "Member")}
          </Text>
          {user.email ? (
            <Text className="font-sans text-purple-light text-sm">{user.email}</Text>
          ) : null}
        </View>

        {/* History links */}
        <View className="mt-6">
          <Text className="font-sans-semibold text-xs text-muted-foreground uppercase tracking-widest px-4 pb-2">
            {t("account.history", "History")}
          </Text>
          <AccountRow label={t("account.stylebearHistory", "StyleBear History")} onPress={() => {}} />
          <AccountRow label={t("account.stylediceHistory", "StyleDice History")} onPress={() => {}} />
          <AccountRow label={t("account.styletarotHistory", "StyleTarot History")} onPress={() => {}} />
        </View>

        {/* Settings */}
        <View className="mt-6">
          <Text className="font-sans-semibold text-xs text-muted-foreground uppercase tracking-widest px-4 pb-2">
            {t("account.settings", "Settings")}
          </Text>
          <AccountRow label={t("account.language", "Language")} onPress={() => {}} />
        </View>

        {/* Sign out */}
        <View className="mt-6 mb-12">
          <AccountRow
            label={t("account.signOut", "Sign Out")}
            onPress={signOut}
            destructive
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

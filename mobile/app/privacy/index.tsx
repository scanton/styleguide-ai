import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AppHeader } from "@/components/AppHeader";

const PRIVACY_URL = "https://www.styleguideai.com/privacy";

export default function PrivacyScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <AppHeader title="Privacy Policy" right={
        <Pressable onPress={() => router.back()} className="active:opacity-70">
          <Text className="font-sans text-white">← Back</Text>
        </Pressable>
      } />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <Text className="font-sans text-base text-cream-foreground leading-relaxed mb-6">
          StyleGuideAI's full privacy policy is available on our website. It covers what data we collect, how we use it, and your rights.
        </Text>
        <Pressable
          onPress={() => Linking.openURL(PRIVACY_URL)}
          className="bg-purple rounded-full py-4 items-center active:opacity-80 mb-6"
        >
          <Text className="font-sans-semibold text-white text-base">Read Privacy Policy</Text>
        </Pressable>

        <View className="bg-white border border-border rounded-xl p-5">
          <Text className="font-sans-semibold text-base text-cream-foreground mb-3">Summary</Text>
          {[
            "We collect only what's needed — your Google account info for sign-in, and prompts you choose to save.",
            "We never sell your data or use it to train AI models.",
            "Anonymous usage for votes and reports uses a fingerprint of your IP + device; no account required.",
            "You can delete your history and account at any time.",
            "Contact: satoricanton@gmail.com",
          ].map((point) => (
            <View key={point} className="flex-row mb-2.5">
              <Text className="text-purple mr-2 mt-0.5">•</Text>
              <Text className="flex-1 font-sans text-sm text-cream-foreground leading-relaxed">{point}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { AppHeader } from "@/components/AppHeader";

const COMMUNITY_LINKS = [
  { label: "Join our Discord", icon: "💬", url: "https://discord.gg/styleguideai" },
  { label: "DeviantArt Group", icon: "🎨", url: "https://www.deviantart.com/styleguideai" },
  { label: "Medium Articles", icon: "📝", url: "https://medium.com/@satoricanton" },
  { label: "StyleGuideAI.com", icon: "🌐", url: "https://www.styleguideai.com" },
];

function LinkRow({ label, icon, url }: { label: string; icon: string; url: string }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      className="flex-row items-center px-4 py-4 bg-white border-b border-border active:opacity-70"
      style={{ minHeight: 56 }}
    >
      <Text style={{ fontSize: 20, marginRight: 12 }}>{icon}</Text>
      <Text className="flex-1 font-sans text-base text-cream-foreground">{label}</Text>
      <Text className="text-muted-foreground text-base">›</Text>
    </Pressable>
  );
}

export default function AboutScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <AppHeader title="About StyleGuideAI" right={
        <Pressable onPress={() => router.back()} className="active:opacity-70">
          <Text className="font-sans text-white">← Back</Text>
        </Pressable>
      } />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <View className="bg-purple px-6 py-10 items-center">
          <Text className="font-sans-bold text-white text-2xl text-center mb-3">StyleGuideAI</Text>
          <Text className="font-sans text-purple-light text-base text-center leading-relaxed">
            A community of 1,000+ artists exploring the intersection of AI and fine art.
          </Text>
        </View>

        {/* Description */}
        <View className="px-6 py-6">
          <Text className="font-sans text-cream-foreground text-base leading-relaxed mb-4">
            StyleGuideAI is the home for artists who love experimenting with AI image generation — from Stable Diffusion to Midjourney to Flux. We hold daily themed art challenges, share techniques, and celebrate creative work from our global community.
          </Text>
          <Text className="font-sans text-cream-foreground text-base leading-relaxed">
            The community was founded by{" "}
            <Text className="font-sans-semibold">Satori Canton</Text>, Head of AI at HeartStamp, author of 300+ articles on AI art, and a longtime digital artist.
          </Text>
        </View>

        {/* Stats */}
        <View className="flex-row px-6 pb-6 gap-4">
          {[
            { value: "1,000+", label: "Community members" },
            { value: "Daily", label: "Art challenges" },
            { value: "Global", label: "Artists worldwide" },
          ].map((stat) => (
            <View key={stat.label} className="flex-1 bg-white border border-border rounded-xl p-4 items-center">
              <Text className="font-sans-bold text-xl text-purple">{stat.value}</Text>
              <Text className="font-sans text-xs text-muted-foreground text-center mt-1">{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Community links */}
        <Text className="font-sans-semibold text-xs text-muted-foreground uppercase tracking-widest px-4 pb-2">
          Community
        </Text>
        <View>
          {COMMUNITY_LINKS.map((link) => (
            <LinkRow key={link.url} {...link} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

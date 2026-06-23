import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/SessionContext";
import { type RisingPost, fetchRisingPosts, voteRisingPost, reportRisingPost } from "@/lib/api";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function RisingPostScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { sessionToken } = useSession();
  const [post, setPost] = useState<RisingPost | null>(null);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Fetch the "all" feed and find the post — lightweight approach for deep links
      const posts = await fetchRisingPosts("all", sessionToken);
      const found = posts.find((p) => p.id === postId) ?? null;
      if (found) {
        setPost(found);
        setLiked(found.hasVoted);
        setLikes(found.siteLikes + found.rawEngagement);
      }
      setLoading(false);
    })();
  }, [postId, sessionToken]);

  async function handleVote() {
    if (!post) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes((n) => n + (wasLiked ? -1 : 1));
    const result = await voteRisingPost(post.id, sessionToken);
    if (result) {
      setLiked(result.voted);
      setLikes(result.likes);
    } else {
      setLiked(wasLiked);
      setLikes((n) => n + (wasLiked ? 1 : -1));
    }
  }

  async function handleReport() {
    if (!post) return;
    Alert.alert("Report post", "Report this post as inappropriate?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Report",
        style: "destructive",
        onPress: async () => {
          await reportRisingPost(post.id, sessionToken);
          Alert.alert("Reported", "Thank you for your report.");
        },
      },
    ]);
  }

  async function handleShare() {
    if (!post) return;
    const url = `https://www.styleguideai.com/rising/${post.id}`;
    const msg = post.caption ? `${post.caption}\n\n${url}` : url;
    try { await Share.share({ message: msg }); } catch {}
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-cream items-center justify-center" edges={["top"]}>
        <ActivityIndicator size="large" color="#5B2FA0" />
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
        <View className="px-4 py-3 border-b border-border bg-white">
          <Pressable onPress={() => router.back()} className="active:opacity-70">
            <Text className="font-sans text-purple">← Back</Text>
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="font-sans-semibold text-lg text-muted-foreground">Post not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const imageHeight =
    post.aspectRatioClass === "portrait"
      ? SCREEN_WIDTH * 1.25
      : post.aspectRatioClass === "landscape"
      ? SCREEN_WIDTH * 0.7
      : SCREEN_WIDTH;

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-white">
        <Pressable onPress={() => router.back()} className="active:opacity-70">
          <Text className="font-sans text-purple">← Back</Text>
        </Pressable>
        <View className="flex-row gap-3">
          <Pressable onPress={handleShare} className="active:opacity-70">
            <Text className="font-sans-semibold text-teal">Share</Text>
          </Pressable>
          <Pressable onPress={handleReport} className="active:opacity-70">
            <Text className="font-sans text-muted-foreground">Report</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Image
          source={{ uri: post.imageUrl }}
          style={{ width: SCREEN_WIDTH, height: imageHeight }}
          resizeMode="cover"
        />

        <View className="px-4 pt-4">
          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="font-sans-semibold text-base text-cream-foreground">{post.creatorName}</Text>
              <Text className="font-sans text-xs text-muted-foreground capitalize">
                {post.source === "site" ? "Site Upload" : post.source}
                {post.toolOrigin ? ` · ${post.toolOrigin}` : ""}
              </Text>
            </View>
            <Pressable
              onPress={handleVote}
              className="flex-row items-center gap-1.5 px-4 py-2 rounded-full active:opacity-70"
              style={{ backgroundColor: liked ? "#5B2FA0" : "#fff", borderWidth: 1.5, borderColor: "#5B2FA0" }}
            >
              <Text style={{ color: liked ? "#fff" : "#5B2FA0", fontSize: 16 }}>♥</Text>
              <Text style={{ color: liked ? "#fff" : "#5B2FA0", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                {likes}
              </Text>
            </Pressable>
          </View>

          {post.title && (
            <Text className="font-sans-semibold text-lg text-cream-foreground mb-2">{post.title}</Text>
          )}

          {post.caption && (
            <View className="bg-white border border-border rounded-xl p-4 mb-3">
              <Text className="font-sans text-xs text-muted-foreground uppercase mb-1.5">Prompt</Text>
              <Text className="font-sans text-cream-foreground leading-relaxed" selectable>
                {post.caption}
              </Text>
            </View>
          )}

          {post.sourceUrl && (
            <Pressable
              onPress={() => Linking.openURL(post.sourceUrl!)}
              className="active:opacity-70 mt-1"
            >
              <Text className="font-sans text-teal text-sm underline">
                View original on{" "}
                {post.source === "deviantart" ? "DeviantArt" : post.source === "discord" ? "Discord" : "source"}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

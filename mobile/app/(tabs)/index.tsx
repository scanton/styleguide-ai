import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useEffect, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";

import { AppHeader } from "@/components/AppHeader";
import { RisingPostCard } from "@/components/rising/RisingPostCard";
import { useSession } from "@/lib/SessionContext";
import {
  type RisingPost,
  fetchRisingPosts,
  voteRisingPost,
  reportRisingPost,
  uploadRisingPost,
} from "@/lib/api";

const SCREEN_WIDTH = Dimensions.get("window").width;
const COLUMN_WIDTH = (SCREEN_WIDTH - 24) / 2;

type SourceKey = "all" | "deviantart" | "discord" | "site" | "tools";

const SOURCES: { key: SourceKey; label: string }[] = [
  { key: "all", label: "Rising" },
  { key: "deviantart", label: "DeviantArt" },
  { key: "discord", label: "Discord" },
  { key: "site", label: "Uploads" },
  { key: "tools", label: "From Tools" },
];

const TOOL_ORIGINS = [
  { value: null, label: "No tag" },
  { value: "stylebear", label: "StyleBear" },
  { value: "styletarot", label: "StyleTarot" },
  { value: "styledice", label: "StyleDice" },
  { value: "museum", label: "Museum" },
];

// Split flat list into two columns manually for variable-height masonry feel
function splitColumns(posts: RisingPost[]): [RisingPost[], RisingPost[]] {
  const left: RisingPost[] = [];
  const right: RisingPost[] = [];
  // Alternate assignment for simplest equal-count split
  posts.forEach((p, i) => (i % 2 === 0 ? left : right).push(p));
  return [left, right];
}

function columnHeight(posts: RisingPost[]): number {
  return posts.reduce((h, p) => {
    const cellH = p.aspectRatioClass === "portrait"
      ? COLUMN_WIDTH * 1.333
      : p.aspectRatioClass === "landscape"
      ? COLUMN_WIDTH * 0.75
      : COLUMN_WIDTH;
    return h + cellH + 8;
  }, 0);
}

export default function RisingScreen() {
  const { t } = useTranslation();
  const { user, sessionToken } = useSession();

  const [activeSource, setActiveSource] = useState<SourceKey>("all");
  const [posts, setPosts] = useState<RisingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Detail modal
  const [detailPost, setDetailPost] = useState<RisingPost | null>(null);
  const [detailLiked, setDetailLiked] = useState(false);
  const [detailLikes, setDetailLikes] = useState(0);

  // Upload modal
  const [uploadVisible, setUploadVisible] = useState(false);
  const [uploadUri, setUploadUri] = useState<string | null>(null);
  const [uploadMime, setUploadMime] = useState("image/jpeg");
  const [uploadCaption, setUploadCaption] = useState("");
  const [uploadTool, setUploadTool] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadPosts = useCallback(async (source: SourceKey, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const data = await fetchRisingPosts(source, sessionToken);
    setPosts(data);
    setLoading(false);
    setRefreshing(false);
  }, [sessionToken]);

  useEffect(() => {
    loadPosts(activeSource);
  }, [activeSource, loadPosts]);

  function openDetail(post: RisingPost) {
    setDetailPost(post);
    setDetailLiked(post.hasVoted);
    setDetailLikes(post.siteLikes + post.rawEngagement);
  }

  async function handleVoteInDetail() {
    if (!detailPost) return;
    // Optimistic
    const wasLiked = detailLiked;
    const delta = wasLiked ? -1 : 1;
    setDetailLiked(!wasLiked);
    setDetailLikes((n) => n + delta);
    // Update grid post too
    setPosts((prev) =>
      prev.map((p) =>
        p.id === detailPost.id
          ? { ...p, hasVoted: !wasLiked, siteLikes: p.siteLikes + delta }
          : p
      )
    );
    const result = await voteRisingPost(detailPost.id, sessionToken);
    if (result) {
      setDetailLiked(result.voted);
      // Reconcile grid likes
      setPosts((prev) =>
        prev.map((p) =>
          p.id === detailPost.id
            ? { ...p, hasVoted: result.voted, siteLikes: result.likes }
            : p
        )
      );
    } else {
      // Revert on error
      setDetailLiked(wasLiked);
      setDetailLikes((n) => n - delta);
    }
  }

  async function handleReport() {
    Alert.alert(
      t("rising.reportTitle", "Report post"),
      t("rising.reportBody", "Report this post as inappropriate?"),
      [
        { text: t("rising.cancel", "Cancel"), style: "cancel" },
        {
          text: t("rising.report", "Report"),
          style: "destructive",
          onPress: async () => {
            await reportRisingPost(detailPost!.id, sessionToken);
            Alert.alert(t("rising.reported", "Reported"), t("rising.reportedBody", "Thank you for your report."));
          },
        },
      ]
    );
  }

  async function handleShareDetail() {
    if (!detailPost) return;
    const url = `https://www.styleguideai.com/rising/${detailPost.id}`;
    const caption = detailPost.caption ? `${detailPost.caption}\n\n${url}` : url;
    try { await Share.share({ message: caption }); } catch {}
  }

  // Upload flow
  async function handlePickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploadUri(asset.uri);
    setUploadMime(asset.mimeType ?? "image/jpeg");
    setUploadCaption("");
    setUploadTool(null);
    setUploadVisible(true);
  }

  async function handleUpload() {
    if (!uploadUri || !sessionToken) return;
    setUploading(true);
    const result = await uploadRisingPost(uploadUri, uploadMime, uploadCaption, uploadTool, sessionToken);
    setUploading(false);
    setUploadVisible(false);
    if (result) {
      Alert.alert(t("rising.uploadSuccess", "Posted!"), t("rising.uploadSuccessBody", "Your artwork is now in the Rising feed."));
      loadPosts("site");
      setActiveSource("site");
    } else {
      Alert.alert(t("rising.uploadError", "Upload failed"), t("rising.uploadErrorBody", "Please try again."));
    }
  }

  // Staggered 2-column layout
  const [leftPosts, rightPosts] = splitColumns(posts);
  const leftH = columnHeight(leftPosts);
  const rightH = columnHeight(rightPosts);
  const gridHeight = Math.max(leftH, rightH);

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      {/* Header with optional upload button */}
      <AppHeader
        title={t("nav.rising", "Rising")}
        right={
          user ? (
            <Pressable onPress={handlePickImage} className="w-9 h-9 items-center justify-center active:opacity-70">
              <Text style={{ color: "#fff", fontSize: 26, lineHeight: 30 }}>+</Text>
            </Pressable>
          ) : null
        }
      />

      {/* Source tabs */}
      <View className="bg-white border-b border-border">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
          {SOURCES.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => setActiveSource(s.key)}
              className={`mr-1 py-2.5 px-3 border-b-2 ${activeSource === s.key ? "border-purple" : "border-transparent"}`}
            >
              <Text className={`font-sans-semibold text-sm ${activeSource === s.key ? "text-purple" : "text-muted-foreground"}`}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Feed grid */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5B2FA0" />
        </View>
      ) : posts.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="font-sans-semibold text-lg text-purple text-center">Nothing here yet</Text>
          <Text className="font-sans text-sm text-muted-foreground text-center mt-2">
            {activeSource === "all"
              ? "The feed is quiet right now. Check back soon!"
              : `No ${SOURCES.find((s) => s.key === activeSource)?.label} posts in the current window.`}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 8 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadPosts(activeSource, true)}
              tintColor="#5B2FA0"
            />
          }
        >
          {/* Two-column layout with variable heights */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ width: COLUMN_WIDTH }}>
              {leftPosts.map((post) => (
                <RisingPostCard key={post.id} post={post} onPress={() => openDetail(post)} />
              ))}
            </View>
            <View style={{ width: COLUMN_WIDTH }}>
              {rightPosts.map((post) => (
                <RisingPostCard key={post.id} post={post} onPress={() => openDetail(post)} />
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* ── Detail Modal ── */}
      <Modal
        visible={!!detailPost}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDetailPost(null)}
      >
        {detailPost && (
          <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-white">
              <Pressable onPress={() => setDetailPost(null)} className="active:opacity-70">
                <Text className="font-sans text-purple text-base">✕ Close</Text>
              </Pressable>
              <View className="flex-row gap-3">
                <Pressable onPress={handleShareDetail} className="active:opacity-70">
                  <Text className="font-sans-semibold text-teal text-base">Share</Text>
                </Pressable>
                <Pressable onPress={handleReport} className="active:opacity-70">
                  <Text className="font-sans text-muted-foreground text-base">Report</Text>
                </Pressable>
              </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Image */}
              <Image
                source={{ uri: detailPost.imageUrl }}
                style={{
                  width: SCREEN_WIDTH,
                  height:
                    detailPost.aspectRatioClass === "portrait"
                      ? SCREEN_WIDTH * 1.25
                      : detailPost.aspectRatioClass === "landscape"
                      ? SCREEN_WIDTH * 0.7
                      : SCREEN_WIDTH,
                }}
                resizeMode="cover"
              />

              {/* Info */}
              <View className="px-4 pt-4">
                {/* Creator + source */}
                <View className="flex-row items-center justify-between mb-3">
                  <View>
                    <Text className="font-sans-semibold text-base text-cream-foreground">
                      {detailPost.creatorName}
                    </Text>
                    <Text className="font-sans text-xs text-muted-foreground capitalize">
                      {detailPost.source === "site" ? "Site Upload" : detailPost.source}
                      {detailPost.toolOrigin ? ` · ${detailPost.toolOrigin}` : ""}
                    </Text>
                  </View>
                  {/* Like button */}
                  <Pressable
                    onPress={handleVoteInDetail}
                    className="flex-row items-center gap-1.5 px-4 py-2 rounded-full active:opacity-70"
                    style={{ backgroundColor: detailLiked ? "#5B2FA0" : "#fff", borderWidth: 1.5, borderColor: "#5B2FA0" }}
                  >
                    <Text style={{ color: detailLiked ? "#fff" : "#5B2FA0", fontSize: 16 }}>♥</Text>
                    <Text style={{ color: detailLiked ? "#fff" : "#5B2FA0", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                      {detailLikes}
                    </Text>
                  </Pressable>
                </View>

                {/* Caption/prompt */}
                {detailPost.caption && (
                  <View className="bg-white border border-border rounded-xl p-4 mb-3">
                    <Text className="font-sans text-xs text-muted-foreground uppercase mb-1.5">Prompt</Text>
                    <Text className="font-sans text-cream-foreground leading-relaxed" selectable>
                      {detailPost.caption}
                    </Text>
                  </View>
                )}

                {/* Title */}
                {detailPost.title && (
                  <Text className="font-sans-semibold text-lg text-cream-foreground mb-2">
                    {detailPost.title}
                  </Text>
                )}

                {/* Source link */}
                {detailPost.sourceUrl && (
                  <Pressable
                    onPress={() => Linking.openURL(detailPost.sourceUrl!)}
                    className="flex-row items-center gap-1 active:opacity-70 mt-1"
                  >
                    <Text className="font-sans text-teal text-sm underline">
                      View original on {detailPost.source === "deviantart" ? "DeviantArt" : detailPost.source === "discord" ? "Discord" : "source"}
                    </Text>
                  </Pressable>
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* ── Upload Compose Modal ── */}
      <Modal
        visible={uploadVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => !uploading && setUploadVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-white">
            <Pressable onPress={() => !uploading && setUploadVisible(false)} className="active:opacity-70">
              <Text className="font-sans text-muted-foreground">Cancel</Text>
            </Pressable>
            <Text className="font-sans-semibold text-cream-foreground">Share to Rising</Text>
            <Pressable
              onPress={handleUpload}
              disabled={uploading}
              className="active:opacity-70 disabled:opacity-50"
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#5B2FA0" />
              ) : (
                <Text className="font-sans-semibold text-purple">Post</Text>
              )}
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            {/* Preview */}
            {uploadUri && (
              <Image
                source={{ uri: uploadUri }}
                style={{ width: "100%", height: 280, borderRadius: 12, marginBottom: 16 }}
                resizeMode="cover"
              />
            )}

            {/* Caption */}
            <Text className="font-sans-semibold text-sm text-cream-foreground mb-1.5">
              Prompt / Caption
            </Text>
            <TextInput
              value={uploadCaption}
              onChangeText={setUploadCaption}
              placeholder="Paste your AI art prompt or add a caption…"
              placeholderTextColor="#A89E8C"
              multiline
              numberOfLines={4}
              className="bg-white border border-border rounded-xl p-3 font-sans text-cream-foreground mb-4"
              style={{ minHeight: 100, textAlignVertical: "top" }}
              editable={!uploading}
            />

            {/* Tool origin tag */}
            <Text className="font-sans-semibold text-sm text-cream-foreground mb-1.5">
              Tool Tag (optional)
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {TOOL_ORIGINS.map((t) => (
                <Pressable
                  key={String(t.value)}
                  onPress={() => setUploadTool(t.value)}
                  className="rounded-full px-3 py-1.5 border active:opacity-70"
                  style={{
                    backgroundColor: uploadTool === t.value ? "#5B2FA0" : "#fff",
                    borderColor: uploadTool === t.value ? "#5B2FA0" : "#DDD8C8",
                  }}
                >
                  <Text style={{
                    fontFamily: "Inter_500Medium",
                    fontSize: 13,
                    color: uploadTool === t.value ? "#fff" : "#231F16",
                  }}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

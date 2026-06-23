import { Dimensions, Image, Pressable, Text, View } from "react-native";
import type { RisingPost } from "@/lib/api";

const SCREEN_WIDTH = Dimensions.get("window").width;
const COLUMN_WIDTH = (SCREEN_WIDTH - 24) / 2; // 16px side padding + 8px gap

function aspectHeight(post: RisingPost): number {
  if (post.aspectRatioClass === "portrait") return COLUMN_WIDTH * 1.333;
  if (post.aspectRatioClass === "landscape") return COLUMN_WIDTH * 0.75;
  return COLUMN_WIDTH; // square
}

export function RisingPostCard({
  post,
  onPress,
}: {
  post: RisingPost;
  onPress: () => void;
}) {
  const height = aspectHeight(post);
  const totalLikes = post.siteLikes + post.rawEngagement;
  const imageUrl = post.thumbnailUrl ?? post.imageUrl;

  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-80"
      style={{ width: COLUMN_WIDTH, marginBottom: 8 }}
    >
      <View style={{ height, borderRadius: 10, overflow: "hidden", backgroundColor: "#DDD8C8" }}>
        <Image
          source={{ uri: imageUrl }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
        {/* Like count overlay */}
        {totalLikes > 0 && (
          <View
            style={{
              position: "absolute",
              bottom: 6,
              right: 6,
              backgroundColor: "rgba(0,0,0,0.55)",
              borderRadius: 10,
              paddingHorizontal: 7,
              paddingVertical: 3,
              flexDirection: "row",
              alignItems: "center",
              gap: 3,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>
              ♥ {totalLikes}
            </Text>
          </View>
        )}
        {/* Voted indicator */}
        {post.hasVoted && (
          <View
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              backgroundColor: "rgba(91,47,160,0.8)",
              borderRadius: 10,
              width: 20,
              height: 20,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 10 }}>♥</Text>
          </View>
        )}
        {/* Tool origin badge */}
        {post.toolOrigin && (
          <View
            style={{
              position: "absolute",
              top: 6,
              left: 6,
              backgroundColor: "rgba(0,0,0,0.5)",
              borderRadius: 6,
              paddingHorizontal: 5,
              paddingVertical: 2,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 8, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" }}>
              {post.toolOrigin === "stylebear" ? "🐻" :
               post.toolOrigin === "styletarot" ? "🃏" :
               post.toolOrigin === "styledice" ? "🎲" :
               post.toolOrigin === "museum" ? "🏛" : post.toolOrigin}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useState } from "react";
import * as Clipboard from "expo-clipboard";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { AppHeader } from "@/components/AppHeader";
import { useSession } from "@/lib/SessionContext";
import { callLLM, saveStyleDiceHistory } from "@/lib/api";
import { artMovementFaces } from "../../../src/data/styledice/art-movements";
import { famousArtistFaces } from "../../../src/data/styledice/famous-artists";
import { mediaTypeFaces } from "../../../src/data/styledice/media-types";
import { artTechniqueFaces } from "../../../src/data/styledice/art-techniques";
import { popCultureFaces } from "../../../src/data/styledice/pop-culture";
import { genreFaces } from "../../../src/data/styledice/genres";

const MAX_REROLLS = 2;

interface DieConfig {
  category: string;
  color: string;
  textColor: string;
  faces: string[];
}

const DICE: DieConfig[] = [
  { category: "Art Movement", color: "#5B2FA0", textColor: "#fff", faces: artMovementFaces },
  { category: "Famous Artist", color: "#2B8FA0", textColor: "#fff", faces: famousArtistFaces },
  { category: "Media Type", color: "#B89A20", textColor: "#fff", faces: mediaTypeFaces },
  { category: "Art Technique", color: "#C45C2E", textColor: "#fff", faces: artTechniqueFaces },
  { category: "Pop Culture", color: "#B83060", textColor: "#fff", faces: popCultureFaces },
  { category: "Genre", color: "#3B2E8A", textColor: "#fff", faces: genreFaces },
];

function rollFace(faces: string[]): string {
  return faces[Math.floor(Math.random() * faces.length)];
}

type GamePhase = "start" | "rolling" | "done";

// Single animated die card
function DieCard({
  die,
  value,
  held,
  phase,
  onToggleHold,
  animIndex,
}: {
  die: DieConfig;
  value: string;
  held: boolean;
  phase: GamePhase;
  onToggleHold: () => void;
  animIndex: number;
}) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  function shake() {
    translateY.value = withSequence(
      withTiming(-6, { duration: 60 }),
      withTiming(6, { duration: 60 }),
      withTiming(-4, { duration: 50 }),
      withTiming(4, { duration: 50 }),
      withTiming(0, { duration: 40 })
    );
    scale.value = withSequence(
      withTiming(1.05, { duration: 80 }),
      withTiming(1, { duration: 120 })
    );
  }

  // Expose shake so parent can trigger it
  // We attach it via ref pattern; instead, parent calls shake via a callback
  // For simplicity, each die shakes when its value changes via useEffect-like logic.
  // We skip ref forwarding and just expose a stable onPress that shakes then toggles.

  function handlePress() {
    if (phase !== "rolling") return;
    shake();
    onToggleHold();
  }

  const isInteractive = phase === "rolling";

  return (
    <Animated.View style={animStyle} className="flex-1 m-1">
      <Pressable
        onPress={handlePress}
        disabled={!isInteractive}
        style={{
          backgroundColor: held ? die.color : "#fff",
          borderColor: die.color,
          borderWidth: 2,
          borderRadius: 12,
          padding: 10,
          minHeight: 100,
          justifyContent: "space-between",
          opacity: !isInteractive && phase === "start" ? 0.5 : 1,
        }}
      >
        <Text
          style={{
            color: held ? "#fff" : die.color,
            fontSize: 9,
            fontFamily: "Inter_600SemiBold",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
          numberOfLines={1}
        >
          {die.category}
        </Text>
        <Text
          style={{
            color: held ? "#fff" : "#231F16",
            fontSize: 12,
            fontFamily: "Inter_500Medium",
            marginTop: 6,
            lineHeight: 16,
          }}
          numberOfLines={3}
        >
          {value || "—"}
        </Text>
        {held && isInteractive && (
          <Text style={{ color: "#fff", fontSize: 9, fontFamily: "Inter_600SemiBold", marginTop: 4 }}>
            HELD ✓
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function StyleDiceScreen() {
  const { t } = useTranslation();
  const { user, sessionToken } = useSession();

  const [phase, setPhase] = useState<GamePhase>("start");
  const [values, setValues] = useState<string[]>(DICE.map(() => ""));
  const [held, setHeld] = useState<boolean[]>(Array(6).fill(false));
  const [rerollsLeft, setRerollsLeft] = useState(MAX_REROLLS);
  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Prompt reveal animation
  const promptOpacity = useSharedValue(0);
  const promptTranslateY = useSharedValue(16);
  const promptStyle = useAnimatedStyle(() => ({
    opacity: promptOpacity.value,
    transform: [{ translateY: promptTranslateY.value }],
  }));

  function rollAll(currentHeld: boolean[], currentValues: string[]): string[] {
    return DICE.map((die, i) =>
      currentHeld[i] ? currentValues[i] : rollFace(die.faces)
    );
  }

  function handleStart() {
    const newValues = rollAll(Array(6).fill(false), []);
    setValues(newValues);
    setHeld(Array(6).fill(false));
    setRerollsLeft(MAX_REROLLS);
    setPhase("rolling");
    setOutput(null);
    promptOpacity.value = 0;
    promptTranslateY.value = 16;
  }

  function handleReroll() {
    const newValues = rollAll(held, values);
    setValues(newValues);
    const next = rerollsLeft - 1;
    setRerollsLeft(next);
    if (next <= 0) setPhase("done");
  }

  function handleToggleHold(index: number) {
    setHeld((prev) => prev.map((h, i) => (i === index ? !h : h)));
  }

  function handlePlayAgain() {
    setPhase("start");
    setValues(DICE.map(() => ""));
    setHeld(Array(6).fill(false));
    setOutput(null);
    promptOpacity.value = 0;
  }

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setOutput(null);
    promptOpacity.value = 0;

    const [movement, artist, media, technique, popCulture, genre] = values;
    const systemMessage = `You are an expert AI art prompt engineer. Generate richly detailed, imaginative prompts for modern AI image models (Flux, Midjourney v6, DALL·E 3, Stable Diffusion XL). You MUST explicitly name every provided creative element — the art movement, artist, media type, technique, pop culture reference, and genre — within the prompt text itself. Never describe a style anonymously; always name it. Return ONLY the prompt itself — no preamble, no explanation, no labels, no quotation marks.`;
    const userMessage = `Generate an AI art prompt inspired by these six creative elements:
- Art Movement: ${movement}
- Famous Artist: ${artist}
- Media Type: ${media}
- Art Technique: ${technique}
- Pop Culture Reference: ${popCulture}
- Genre: ${genre}

Create a detailed, imaginative prompt that weaves all six elements into a vivid, cohesive scene. Describe the art style in depth: medium, technique, color palette, lighting, mood, and atmosphere. Be inventive — go beyond the obvious.`;

    const result = await callLLM({
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      maxTokens: 512,
    });

    const generated = result ?? t("styledice.error", "Failed to generate prompt. Please try again.");
    setOutput(generated);
    promptOpacity.value = withTiming(1, { duration: 400 });
    promptTranslateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    setLoading(false);

    if (user && sessionToken && result) {
      await saveStyleDiceHistory(values, result, sessionToken);
    }
  }, [values, user, sessionToken, t]);

  async function handleCopy() {
    if (!output) return;
    await Clipboard.setStringAsync(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (!output) return;
    try { await Share.share({ message: output }); } catch {}
  }

  const canGenerate = phase === "done" || (phase === "rolling" && rerollsLeft < MAX_REROLLS);

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <AppHeader title="StyleDice" />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Subtitle */}
        <Text className="font-sans text-muted-foreground text-sm text-center mb-4">
          {phase === "start"
            ? t("styledice.startPlaying", "Roll the dice for creative inspiration")
            : phase === "rolling"
            ? t("styledice.holdInstruction", "Tap a die to hold it, then re-roll")
            : t("styledice.combinationLocked", "Your combination is locked — generate your prompt")}
        </Text>

        {/* Dice grid — 2 columns × 3 rows */}
        <View className="mb-4">
          {[0, 2, 4].map((rowStart) => (
            <View key={rowStart} className="flex-row">
              {[0, 1].map((offset) => {
                const i = rowStart + offset;
                return (
                  <DieCard
                    key={i}
                    die={DICE[i]}
                    value={values[i]}
                    held={held[i]}
                    phase={phase}
                    onToggleHold={() => handleToggleHold(i)}
                    animIndex={i}
                  />
                );
              })}
            </View>
          ))}
        </View>

        {/* Re-rolls remaining badge */}
        {phase === "rolling" && (
          <Text className="font-sans text-center text-sm text-muted-foreground mb-4">
            {rerollsLeft === MAX_REROLLS
              ? t("styledice.rerollsLeft", "{{count}} re-rolls remaining", { count: rerollsLeft })
              : rerollsLeft === 1
              ? t("styledice.rerollsLeft", "1 re-roll remaining", { count: 1 })
              : t("styledice.combinationLocked", "No re-rolls left")}
          </Text>
        )}

        {/* Action buttons */}
        {phase === "start" && (
          <Pressable
            onPress={handleStart}
            className="bg-purple rounded-full py-4 items-center active:opacity-80"
          >
            <Text className="font-sans-semibold text-white text-lg">
              {t("styledice.startPlaying", "Roll Dice")}
            </Text>
          </Pressable>
        )}

        {phase === "rolling" && (
          <View className="flex-row gap-3">
            <Pressable
              onPress={handleReroll}
              className="flex-1 bg-purple rounded-full py-3 items-center active:opacity-80"
            >
              <Text className="font-sans-semibold text-white">
                {t("styledice.reroll", "Re-Roll")} ({rerollsLeft})
              </Text>
            </Pressable>
            {canGenerate && (
              <Pressable
                onPress={handleGenerate}
                disabled={loading}
                className="flex-1 bg-teal rounded-full py-3 items-center active:opacity-80"
              >
                <Text className="font-sans-semibold text-white">
                  {t("styledice.generatedPrompt", "Generate")}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {phase === "done" && (
          <View className="flex-row gap-3">
            <Pressable
              onPress={handlePlayAgain}
              className="flex-1 border border-purple rounded-full py-3 items-center active:opacity-70"
            >
              <Text className="font-sans-semibold text-purple">
                {t("styledice.restart", "Roll Again")}
              </Text>
            </Pressable>
            <Pressable
              onPress={handleGenerate}
              disabled={loading}
              className="flex-1 bg-purple rounded-full py-3 items-center active:opacity-80 disabled:opacity-50"
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="font-sans-semibold text-white">
                  {output
                    ? t("styledice.generatedPrompt", "Regenerate")
                    : t("styledice.generatedPrompt", "Generate")}
                </Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Output */}
        {(output || loading) && (
          <Animated.View style={promptStyle} className="mt-6">
            <View className="bg-white border border-border rounded-xl p-4">
              {loading ? (
                <Text className="font-sans text-muted-foreground italic">
                  {t("styledice.generatedPrompt", "Generating prompt…")}
                </Text>
              ) : (
                <Text className="font-sans text-cream-foreground leading-relaxed" selectable>
                  {output}
                </Text>
              )}
            </View>
            {!loading && output && (
              <View className="flex-row gap-3 mt-3">
                <Pressable
                  onPress={handleCopy}
                  className="flex-1 bg-teal rounded-full py-3 items-center active:opacity-80"
                >
                  <Text className="font-sans-semibold text-white">
                    {copied ? t("styledice.copied", "Copied!") : t("styledice.copy", "Copy Prompt")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleShare}
                  className="flex-1 border border-teal rounded-full py-3 items-center active:opacity-70"
                >
                  <Text className="font-sans-semibold text-teal">
                    {t("styledice.share", "Share")}
                  </Text>
                </Pressable>
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

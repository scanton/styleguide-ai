import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useState } from "react";
import * as Clipboard from "expo-clipboard";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";

import { AppHeader } from "@/components/AppHeader";
import { useSession } from "@/lib/SessionContext";
import { callLLM, saveStyleTarotHistory } from "@/lib/api";
import { TAROT_CARDS, type TarotCard, type CardType } from "../../../src/data/styletarot/cards";

const HAND_SIZE = 5;
const MAX_REDRAWS = 1;

// Hex approximations of the oklch card type colors
const CARD_TYPE_COLORS: Record<CardType, { bg: string; text: string }> = {
  movement:    { bg: "#5B2FA0", text: "#fff" },
  artist:      { bg: "#2B8FA0", text: "#fff" },
  media:       { bg: "#B89A20", text: "#fff" },
  technique:   { bg: "#C45C2E", text: "#fff" },
  subject:     { bg: "#2E7A42", text: "#fff" },
  setting:     { bg: "#2B5FA0", text: "#fff" },
  inspiration: { bg: "#B83060", text: "#fff" },
  situation:   { bg: "#B83060", text: "#fff" },
  "pop culture": { bg: "#B84C20", text: "#fff" },
  location:    { bg: "#2BA08A", text: "#fff" },
};

function pickRandom(cards: TarotCard[], count: number, exclude: number[] = []): TarotCard[] {
  const pool = cards.filter((c) => !exclude.includes(c.index));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

type DrawPhase = "start" | "dealt" | "drawn" | "locked";
type GameMode = "draw" | "explore";

// Animated card component
function TarotCardView({
  card,
  held,
  phase,
  dealIndex,
  onPress,
}: {
  card: TarotCard | null;
  held: boolean;
  phase: DrawPhase;
  dealIndex: number;
  onPress: () => void;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const heldOffset = useSharedValue(0);

  // Trigger deal animation when card appears
  if (card && opacity.value === 0) {
    opacity.value = withDelay(dealIndex * 80, withTiming(1, { duration: 300 }));
    translateY.value = withDelay(dealIndex * 80, withSpring(0, { damping: 16, stiffness: 180 }));
  }

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value + heldOffset.value }],
  }));

  function handlePress() {
    if (phase !== "dealt") return;
    // Lift held cards up
    heldOffset.value = withTiming(held ? 0 : -8, { duration: 150 });
    onPress();
  }

  const colors = card ? CARD_TYPE_COLORS[card.type] : { bg: "#DDD8C8", text: "#A89E8C" };

  return (
    <Animated.View style={[animStyle, { flex: 1, margin: 4 }]}>
      <Pressable
        onPress={handlePress}
        style={{
          backgroundColor: held ? colors.bg : "#fff",
          borderColor: card ? colors.bg : "#DDD8C8",
          borderWidth: 2,
          borderRadius: 12,
          padding: 10,
          minHeight: 130,
          justifyContent: "space-between",
        }}
      >
        {card ? (
          <>
            <Text
              style={{
                color: held ? "#fff" : colors.bg,
                fontSize: 9,
                fontFamily: "Inter_600SemiBold",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
              numberOfLines={1}
            >
              {card.type}
            </Text>
            <Text
              style={{
                color: held ? "#fff" : "#231F16",
                fontSize: 13,
                fontFamily: "Inter_600SemiBold",
                marginTop: 6,
                lineHeight: 17,
              }}
              numberOfLines={2}
            >
              {card.title}
            </Text>
            <Text
              style={{
                color: held ? "rgba(255,255,255,0.8)" : "#756B5C",
                fontSize: 10,
                fontFamily: "Inter_400Regular",
                marginTop: 4,
                lineHeight: 14,
              }}
              numberOfLines={3}
            >
              {card.description}
            </Text>
            {held && phase === "dealt" && (
              <Text style={{ color: "#fff", fontSize: 9, fontFamily: "Inter_600SemiBold", marginTop: 4 }}>
                HELD ✓
              </Text>
            )}
          </>
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text style={{ color: "#DDD8C8", fontSize: 24 }}>🎴</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// Explore mode card chip
function ExploreCardChip({
  card,
  selected,
  disabled,
  onPress,
}: {
  card: TarotCard;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const colors = CARD_TYPE_COLORS[card.type];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled && !selected}
      style={{
        backgroundColor: selected ? colors.bg : "#fff",
        borderColor: colors.bg,
        borderWidth: 1.5,
        borderRadius: 8,
        padding: 8,
        marginBottom: 6,
        opacity: disabled && !selected ? 0.4 : 1,
      }}
    >
      <Text style={{ color: selected ? "#fff" : colors.bg, fontSize: 9, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" }}>
        {card.type}
      </Text>
      <Text style={{ color: selected ? "#fff" : "#231F16", fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 2 }} numberOfLines={2}>
        {card.title}
      </Text>
    </Pressable>
  );
}

export default function StyleTarotScreen() {
  const { t } = useTranslation();
  const { user, sessionToken } = useSession();

  // Draw mode state
  const [mode, setMode] = useState<GameMode>("draw");
  const [drawPhase, setDrawPhase] = useState<DrawPhase>("start");
  const [hand, setHand] = useState<(TarotCard | null)[]>(Array(HAND_SIZE).fill(null));
  const [held, setHeld] = useState<boolean[]>(Array(HAND_SIZE).fill(false));
  const [redrawsLeft, setRedrawsLeft] = useState(MAX_REDRAWS);
  const [dealGeneration, setDealGeneration] = useState(0);

  // Explore mode state
  const [exploreQuery, setExploreQuery] = useState("");
  const [exploreFilter, setExploreFilter] = useState<CardType | "all">("all");
  const [exploreSelected, setExploreSelected] = useState<Set<number>>(new Set());

  // Output state
  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Prompt reveal animation
  const promptOpacity = useSharedValue(0);
  const promptTranslateY = useSharedValue(16);
  const promptAnim = useAnimatedStyle(() => ({
    opacity: promptOpacity.value,
    transform: [{ translateY: promptTranslateY.value }],
  }));

  function handleDeal() {
    const newHand = pickRandom(TAROT_CARDS, HAND_SIZE);
    setHand(newHand);
    setHeld(Array(HAND_SIZE).fill(false));
    setRedrawsLeft(MAX_REDRAWS);
    setDrawPhase("dealt");
    setOutput(null);
    setDealGeneration((g) => g + 1);
    promptOpacity.value = 0;
  }

  function handleToggleHold(i: number) {
    if (drawPhase !== "dealt") return;
    setHeld((prev) => prev.map((h, idx) => (idx === i ? !h : h)));
  }

  function handleRedraw() {
    const heldIndices = (hand as TarotCard[]).filter((_, i) => held[i]).map((c) => c.index);
    const newCards = pickRandom(TAROT_CARDS, held.filter((h) => !h).length, heldIndices);
    let newIdx = 0;
    const newHand = hand.map((c, i) => (held[i] ? c : newCards[newIdx++]));
    setHand(newHand);
    setHeld(Array(HAND_SIZE).fill(false));
    const next = redrawsLeft - 1;
    setRedrawsLeft(next);
    setDrawPhase(next <= 0 ? "drawn" : "dealt");
    setDealGeneration((g) => g + 1);
  }

  function handleLockHand() {
    setHeld(Array(HAND_SIZE).fill(false));
    setDrawPhase("locked");
  }

  function handleNewHand() {
    setHand(Array(HAND_SIZE).fill(null));
    setHeld(Array(HAND_SIZE).fill(false));
    setDrawPhase("start");
    setOutput(null);
    promptOpacity.value = 0;
  }

  function getActiveCards(): TarotCard[] {
    if (mode === "explore") {
      return TAROT_CARDS.filter((c) => exploreSelected.has(c.index));
    }
    return (hand as TarotCard[]).filter(Boolean);
  }

  const canGenerate =
    mode === "explore"
      ? exploreSelected.size === HAND_SIZE
      : (drawPhase === "drawn" || drawPhase === "locked") && hand.filter(Boolean).length === HAND_SIZE;

  const handleGenerate = useCallback(async () => {
    const cards = getActiveCards();
    if (cards.length !== HAND_SIZE) return;

    setLoading(true);
    setOutput(null);
    promptOpacity.value = 0;

    const cardList = cards
      .map((c, i) => `${i + 1}. **${c.title}** (${c.type})${c.description ? `\n   ${c.description}` : ""}`)
      .join("\n\n");

    const systemMessage = `You are an expert AI art prompt engineer. You synthesize StyleTarot card concepts — movements, artists, media, subjects, settings, and inspirations — into detailed, evocative image generation prompts.

Modern AI image models (DALL-E 3, Midjourney, Stable Diffusion XL, Flux) handle long, specific prompts exceptionally well. Your prompts are rich in visual specificity: main subject, scene composition, artistic style, lighting, color palette, texture, mood, and atmosphere. You MUST explicitly name the art movements, artists, and other concepts drawn from the card titles within the prompt text itself — never describe a style anonymously.

Return ONLY the art prompt itself — 150 to 250 words of pure visual description. No preamble, no explanation, no labels, no quotation marks.`;

    const userMessage = `I drew these 5 StyleTarot cards as creative inspiration:

${cardList}

Create a single, unified AI art prompt that weaves all five cards into one cohesive, visually stunning artwork. Draw from the card descriptions for specific visual elements, style cues, subject matter, setting, and mood. The result should feel like a natural, intentional artwork — not a random mashup. Be specific: name colors, lighting conditions, compositional choices, textures, and emotional tone.`;

    const result = await callLLM({
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      maxTokens: 600,
    });

    const generated = result ?? t("styletarot.generating", "Failed to generate. Please try again.");
    setOutput(generated);
    promptOpacity.value = withTiming(1, { duration: 400 });
    promptTranslateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    setLoading(false);

    if (user && sessionToken && result) {
      await saveStyleTarotHistory(cards.map((c) => c.index), result, sessionToken);
    }
  }, [hand, exploreSelected, mode, user, sessionToken, t]);

  async function handleCopy() {
    if (!output) return;
    await Clipboard.setStringAsync(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Explore: filtered card list
  const CARD_TYPES: (CardType | "all")[] = [
    "all", "movement", "artist", "media", "technique",
    "subject", "setting", "inspiration", "situation", "pop culture", "location",
  ];

  const filteredCards = TAROT_CARDS.filter((c) => {
    const matchesType = exploreFilter === "all" || c.type === exploreFilter;
    const matchesQuery =
      !exploreQuery.trim() ||
      c.title.toLowerCase().includes(exploreQuery.toLowerCase()) ||
      c.type.toLowerCase().includes(exploreQuery.toLowerCase());
    return matchesType && matchesQuery;
  });

  function toggleExploreCard(card: TarotCard) {
    setExploreSelected((prev) => {
      const next = new Set(prev);
      if (next.has(card.index)) {
        next.delete(card.index);
      } else if (next.size < HAND_SIZE) {
        next.add(card.index);
      }
      return next;
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <AppHeader title="StyleTarot" />

      {/* Mode toggle */}
      <View className="flex-row border-b border-border bg-white">
        {(["draw", "explore"] as GameMode[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            className={`flex-1 py-3 items-center border-b-2 ${mode === m ? "border-purple" : "border-transparent"}`}
          >
            <Text className={`font-sans-semibold text-sm capitalize ${mode === m ? "text-purple" : "text-muted-foreground"}`}>
              {m === "draw" ? t("styletarot.drawMode", "Draw") : t("styletarot.exploreMode", "Explore")}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === "draw" ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Status text */}
          <Text className="font-sans text-muted-foreground text-sm text-center mb-4">
            {drawPhase === "start"
              ? t("styletarot.drawDescription", "Deal 5 cards from the StyleTarot deck")
              : drawPhase === "dealt"
              ? t("styletarot.holdInstruction", "Tap a card to hold it")
              : t("styletarot.handLocked", "Your hand is locked — generate your prompt")}
          </Text>

          {/* 5 cards in 2-column grid (2+2+1) */}
          <View className="flex-row flex-wrap">
            {Array(HAND_SIZE).fill(null).map((_, i) => (
              <View key={`${dealGeneration}-${i}`} style={{ width: "50%", padding: 0 }}>
                <TarotCardView
                  card={hand[i] as TarotCard | null}
                  held={held[i]}
                  phase={drawPhase}
                  dealIndex={i}
                  onPress={() => handleToggleHold(i)}
                />
              </View>
            ))}
          </View>

          {/* Controls */}
          <View className="mt-4 gap-3">
            {drawPhase === "start" && (
              <Pressable
                onPress={handleDeal}
                className="bg-purple rounded-full py-4 items-center active:opacity-80"
              >
                <Text className="font-sans-semibold text-white text-lg">
                  {t("styletarot.dealCards", "Deal Cards")}
                </Text>
              </Pressable>
            )}

            {drawPhase === "dealt" && (
              <View className="flex-row gap-3">
                {redrawsLeft > 0 && (
                  <Pressable
                    onPress={handleRedraw}
                    className="flex-1 bg-purple rounded-full py-3 items-center active:opacity-80"
                  >
                    <Text className="font-sans-semibold text-white">
                      {t("styletarot.redraw", "Redraw")} ({redrawsLeft})
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={handleLockHand}
                  className="flex-1 border border-purple rounded-full py-3 items-center active:opacity-70"
                >
                  <Text className="font-sans-semibold text-purple">
                    {t("styletarot.lockHand", "Lock Hand")}
                  </Text>
                </Pressable>
              </View>
            )}

            {(drawPhase === "drawn" || drawPhase === "locked") && (
              <View className="flex-row gap-3">
                <Pressable
                  onPress={handleNewHand}
                  className="flex-1 border border-purple rounded-full py-3 items-center active:opacity-70"
                >
                  <Text className="font-sans-semibold text-purple">
                    {t("styletarot.newHand", "New Hand")}
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
                        ? t("styletarot.generatePrompt", "Regenerate")
                        : t("styletarot.generatePrompt", "Generate")}
                    </Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>

          {/* Output */}
          {(output || loading) && (
            <Animated.View style={promptAnim} className="mt-6">
              <View className="bg-white border border-border rounded-xl p-4">
                {loading ? (
                  <Text className="font-sans text-muted-foreground italic">
                    {t("styletarot.generating", "Generating prompt…")}
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
                      {copied ? t("styletarot.copied", "Copied!") : t("styletarot.copy", "Copy")}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={async () => { try { await Share.share({ message: output! }); } catch {} }}
                    className="flex-1 border border-teal rounded-full py-3 items-center active:opacity-70"
                  >
                    <Text className="font-sans-semibold text-teal">
                      {t("styletarot.share", "Share")}
                    </Text>
                  </Pressable>
                </View>
              )}
            </Animated.View>
          )}
        </ScrollView>
      ) : (
        /* ── Explore mode ── */
        <View className="flex-1">
          {/* Search + filter */}
          <View className="px-4 pt-4 pb-2 gap-2">
            <TextInput
              value={exploreQuery}
              onChangeText={setExploreQuery}
              placeholder={t("styletarot.searchPlaceholder", "Search cards…")}
              placeholderTextColor="#A89E8C"
              className="bg-white border border-border rounded-lg px-3 font-sans text-cream-foreground"
              style={{ height: 40 }}
              clearButtonMode="while-editing"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {CARD_TYPES.map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setExploreFilter(type)}
                    className={`rounded-full px-3 py-1 border active:opacity-70 ${
                      exploreFilter === type ? "bg-purple border-purple" : "bg-white border-border"
                    }`}
                  >
                    <Text className={`font-sans text-xs capitalize ${exploreFilter === type ? "text-white" : "text-cream-foreground"}`}>
                      {type === "all" ? t("styletarot.allTypes", "All") : type}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <Text className="font-sans text-xs text-muted-foreground">
              {t("styletarot.selectCards", "Select 5 cards")} ({exploreSelected.size}/{HAND_SIZE})
            </Text>
          </View>

          {/* Card grid */}
          <FlatList
            data={filteredCards}
            keyExtractor={(c) => String(c.index)}
            numColumns={2}
            contentContainerStyle={{ padding: 8, paddingBottom: 40 }}
            columnWrapperStyle={{ gap: 0 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <View style={{ width: "50%", padding: 4 }}>
                <ExploreCardChip
                  card={item}
                  selected={exploreSelected.has(item.index)}
                  disabled={exploreSelected.size >= HAND_SIZE}
                  onPress={() => toggleExploreCard(item)}
                />
              </View>
            )}
          />

          {/* Generate bar */}
          {exploreSelected.size > 0 && (
            <View className="px-4 py-3 border-t border-border bg-white">
              <Pressable
                onPress={handleGenerate}
                disabled={!canGenerate || loading}
                className="bg-purple rounded-full py-3 items-center active:opacity-80 disabled:opacity-50"
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="font-sans-semibold text-white">
                    {canGenerate
                      ? t("styletarot.generatePrompt", "Generate Prompt")
                      : t("styletarot.selectCards", `Select ${HAND_SIZE - exploreSelected.size} more`)}
                  </Text>
                )}
              </Pressable>
              {output && !loading && (
                <Animated.View style={promptAnim} className="mt-3">
                  <View className="bg-cream border border-border rounded-xl p-4">
                    <Text className="font-sans text-cream-foreground leading-relaxed" selectable>
                      {output}
                    </Text>
                  </View>
                  <View className="flex-row gap-3 mt-3">
                    <Pressable onPress={handleCopy} className="flex-1 bg-teal rounded-full py-3 items-center active:opacity-80">
                      <Text className="font-sans-semibold text-white">
                        {copied ? "Copied!" : "Copy"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => exploreSelected.size > 0 && setExploreSelected(new Set())}
                      className="border border-border rounded-full px-4 py-3 items-center active:opacity-70"
                    >
                      <Text className="font-sans text-muted-foreground text-sm">Clear</Text>
                    </Pressable>
                  </View>
                </Animated.View>
              )}
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

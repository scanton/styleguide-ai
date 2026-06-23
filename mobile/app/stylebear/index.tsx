import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCallback, useRef, useState } from "react";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { AppHeader } from "@/components/AppHeader";
import { PickerModal } from "@/components/stylebear/PickerModal";
import { useSession } from "@/lib/SessionContext";
import {
  buildPrompt,
  sortedMovements,
  sortedMedia,
  randomizeSelections,
  ASPECT_RATIOS,
  DEFAULT_ASPECT_RATIO,
  PROMPT_TYPES,
  STYLEBEAR_MODEL,
  TRIPLE_COUNT,
} from "@/lib/stylebear";
import { generatePrompt, saveStyleBearHistory } from "@/lib/api";
import { cultureKeys, checkboxOptions } from "../../../src/data/stylebear/prompt-data";

const DEFAULT_CHECKED = new Set(
  checkboxOptions.filter((o) => o.defaultChecked).map((o) => o.key)
);

const movementNames = sortedMovements.map((m) => m.name);
const mediaNames = sortedMedia.map((m) => m.name);

// --- Sub-components ---

function SectionLabel({ label }: { label: string }) {
  return (
    <Text className="font-sans-semibold text-xs text-muted-foreground uppercase tracking-widest mb-2 mt-5">
      {label}
    </Text>
  );
}

function DropdownButton({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between bg-white border border-border rounded-lg px-3 mb-2 active:opacity-70"
      style={{ height: 44 }}
    >
      <Text
        className={`font-sans text-base flex-1 mr-2 ${value ? "text-cream-foreground" : "text-muted-foreground"}`}
        numberOfLines={1}
      >
        {value || t("stylebear.noneOption", "— none —")}
      </Text>
      <Text className="text-muted-foreground text-sm">▾</Text>
    </Pressable>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-3 py-1 mr-2 mb-2 border active:opacity-70 ${
        selected ? "bg-purple border-purple" : "bg-white border-border"
      }`}
    >
      <Text
        className={`font-sans text-sm ${selected ? "text-white" : "text-cream-foreground"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// --- Main screen ---

export default function StyleBearScreen() {
  const { t } = useTranslation();
  const { user, sessionToken } = useSession();

  const [subject, setSubject] = useState("");
  const [footer, setFooter] = useState("");
  const [selectedMovements, setSelectedMovements] = useState<string[]>(
    Array(TRIPLE_COUNT).fill("")
  );
  const [selectedMedia, setSelectedMedia] = useState<string[]>(
    Array(TRIPLE_COUNT).fill("")
  );
  const [checkedOptions, setCheckedOptions] = useState<Set<string>>(new Set(DEFAULT_CHECKED));
  const [showCultures, setShowCultures] = useState(false);
  const [promptType, setPromptType] = useState("modern");
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT_RATIO);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Picker modal state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTitle, setPickerTitle] = useState("");
  const [pickerItems, setPickerItems] = useState<string[]>([]);
  const [pickerSelected, setPickerSelected] = useState("");
  const pickerCallback = useRef<(value: string) => void>(() => {});

  // Prompt reveal animation
  const outputOpacity = useSharedValue(0);
  const outputTranslateY = useSharedValue(20);
  const outputStyle = useAnimatedStyle(() => ({
    opacity: outputOpacity.value,
    transform: [{ translateY: outputTranslateY.value }],
  }));

  function openPicker(
    title: string,
    items: string[],
    selected: string,
    onSelect: (v: string) => void
  ) {
    setPickerTitle(title);
    setPickerItems(items);
    setPickerSelected(selected);
    pickerCallback.current = onSelect;
    setPickerVisible(true);
  }

  function toggleOption(key: string) {
    setCheckedOptions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const handleRandomize = useCallback(() => {
    setSelectedMovements(randomizeSelections(TRIPLE_COUNT, sortedMovements));
    setSelectedMedia(randomizeSelections(TRIPLE_COUNT, sortedMedia));
  }, []);

  const handleGenerate = useCallback(async () => {
    const basePrompt = buildPrompt(subject, footer, selectedMovements, selectedMedia, checkedOptions);
    const rawPrompt = aspectRatio
      ? `${basePrompt}\n\nEnd the prompt with: ${aspectRatio} aspect ratio`
      : basePrompt;

    setHasGenerated(true);
    setLoading(true);
    setOutput("");
    outputOpacity.value = 0;
    outputTranslateY.value = 20;

    try {
      const data = await generatePrompt({
        messages: [{ role: "user", content: rawPrompt }],
        promptStyle: promptType,
        model: STYLEBEAR_MODEL,
        maxTokens: 2048,
      });

      const generated = data.content ?? data.error ?? t("stylebear.error", "Error generating prompt.");
      setOutput(generated);

      // Animate reveal
      outputOpacity.value = withTiming(1, { duration: 400 });
      outputTranslateY.value = withSpring(0, { damping: 18, stiffness: 200 });

      // Save history for signed-in users
      if (user && sessionToken && data.content) {
        const allOptionDefs = [...checkboxOptions, ...cultureKeys];
        const inputs = JSON.stringify({
          source: "stylebear",
          promptStyle: promptType,
          aspectRatio: aspectRatio || undefined,
          movements: selectedMovements.filter(Boolean),
          media: selectedMedia.filter(Boolean),
          options: [...checkedOptions]
            .map((key) => allOptionDefs.find((o) => o.key === key)?.label as string | undefined)
            .filter((l): l is string => l != null),
        });
        await saveStyleBearHistory(data.content, inputs, sessionToken);
      }
    } catch {
      setOutput(t("stylebear.error", "Error generating prompt. Please try again."));
      outputOpacity.value = withTiming(1, { duration: 300 });
    } finally {
      setLoading(false);
    }
  }, [subject, footer, selectedMovements, selectedMedia, checkedOptions, promptType, aspectRatio, user, sessionToken, t]);

  async function handleCopy() {
    await Clipboard.setStringAsync(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    try {
      await Share.share({ message: output });
    } catch {}
  }

  async function handleImageAnalyze() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    const { base64, mimeType } = result.assets[0];
    if (!base64) return;

    setHasGenerated(true);
    setLoading(true);
    setOutput("");
    outputOpacity.value = 0;

    try {
      const imageData = `data:${mimeType ?? "image/jpeg"};base64,${base64}`;
      const data = await generatePrompt({
        messages: [
          {
            role: "user",
            content: "Analyze this image and generate a detailed art prompt describing its style, technique, mood, and composition.",
          },
        ],
        promptStyle: promptType,
        model: "qwen/qwen-vl-plus:free",
        maxTokens: 1024,
      });
      const generated = data.content ?? t("stylebear.error", "Error analyzing image.");
      setOutput(generated);
      outputOpacity.value = withTiming(1, { duration: 400 });
      outputTranslateY.value = withSpring(0, { damping: 18, stiffness: 200 });
    } catch {
      setOutput(t("stylebear.error", "Error analyzing image. Please try again."));
      outputOpacity.value = withTiming(1, { duration: 300 });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <AppHeader
        title={t("stylebear.title", "StyleBear")}
        right={
          user ? (
            <Pressable onPress={() => router.push("/stylebear/history" as never)} className="active:opacity-70">
              <Text className="text-white font-sans text-sm">History</Text>
            </Pressable>
          ) : undefined
        }
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Prompt Style */}
        <SectionLabel label={t("stylebear.promptStyle", "Prompt Style")} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4 mb-1">
          <View className="flex-row">
            {PROMPT_TYPES.map((pt) => (
              <Chip
                key={pt.value}
                label={pt.label}
                selected={promptType === pt.value}
                onPress={() => setPromptType(pt.value)}
              />
            ))}
          </View>
        </ScrollView>

        {/* Aspect Ratio */}
        <SectionLabel label={t("stylebear.aspectRatio", "Aspect Ratio")} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4 mb-1">
          <View className="flex-row">
            {ASPECT_RATIOS.map((ar) => (
              <Chip
                key={ar.value}
                label={ar.value}
                selected={aspectRatio === ar.value}
                onPress={() => setAspectRatio(ar.value)}
              />
            ))}
          </View>
        </ScrollView>

        {/* Subject */}
        <SectionLabel label={t("stylebear.subject", "Subject")} />
        <TextInput
          value={subject}
          onChangeText={setSubject}
          placeholder={t("stylebear.subjectPlaceholder", "Describe your subject…")}
          placeholderTextColor="#A89E8C"
          multiline
          numberOfLines={3}
          className="bg-white border border-border rounded-lg px-3 py-2 font-sans text-cream-foreground"
          style={{ minHeight: 72, textAlignVertical: "top" }}
        />

        {/* Art Movements */}
        <SectionLabel label={t("stylebear.artMovements", "Art Movements")} />
        {selectedMovements.map((val, i) => (
          <DropdownButton
            key={i}
            label={`Movement ${i + 1}`}
            value={val}
            onPress={() =>
              openPicker(
                t("stylebear.artMovements", "Art Movements"),
                movementNames,
                val,
                (v) => setSelectedMovements((prev) => prev.map((p, idx) => (idx === i ? v : p)))
              )
            }
          />
        ))}

        {/* Media Types */}
        <SectionLabel label={t("stylebear.mediaTypes", "Media Types")} />
        {selectedMedia.map((val, i) => (
          <DropdownButton
            key={i}
            label={`Media ${i + 1}`}
            value={val}
            onPress={() =>
              openPicker(
                t("stylebear.mediaTypes", "Media Types"),
                mediaNames,
                val,
                (v) => setSelectedMedia((prev) => prev.map((p, idx) => (idx === i ? v : p)))
              )
            }
          />
        ))}

        {/* Options */}
        <SectionLabel label={t("stylebear.options", "Options")} />
        <View className="flex-row flex-wrap">
          {checkboxOptions.map((opt) => (
            <Chip
              key={opt.key}
              label={t(`stylebear.${opt.key}`, opt.label)}
              selected={checkedOptions.has(opt.key)}
              onPress={() => toggleOption(opt.key)}
            />
          ))}
        </View>

        {/* Cultures toggle */}
        <Pressable
          onPress={() => setShowCultures((v) => !v)}
          className="flex-row items-center gap-2 py-2 mb-1 active:opacity-70"
        >
          <Text className="text-purple font-sans-semibold text-sm">
            {showCultures
              ? t("stylebear.hideCultures", "Hide Cultures")
              : t("stylebear.showCultures", "Show Cultures")}
          </Text>
        </Pressable>

        {showCultures && (
          <View className="flex-row flex-wrap">
            {cultureKeys.map((c) => (
              <Chip
                key={c.key}
                label={t(`stylebear.${c.key}`, c.label)}
                selected={checkedOptions.has(c.key)}
                onPress={() => toggleOption(c.key)}
              />
            ))}
          </View>
        )}

        {/* Footer */}
        <SectionLabel label={t("stylebear.footerLabel", "Footer")} />
        <TextInput
          value={footer}
          onChangeText={setFooter}
          placeholder={t("stylebear.footerPlaceholder", "Text appended to every prompt.")}
          placeholderTextColor="#A89E8C"
          multiline
          numberOfLines={2}
          className="bg-white border border-border rounded-lg px-3 py-2 font-sans text-cream-foreground"
          style={{ minHeight: 52, textAlignVertical: "top" }}
        />

        {/* Action buttons */}
        <View className="flex-row gap-3 mt-6">
          <Pressable
            onPress={handleRandomize}
            className="flex-1 border border-purple rounded-full py-3 items-center active:opacity-70"
          >
            <Text className="font-sans-semibold text-purple">
              {t("stylebear.randomize", "Randomize")}
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
                {t("stylebear.generate", "Generate")}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Image analyze */}
        <Pressable
          onPress={handleImageAnalyze}
          className="mt-3 border border-teal rounded-full py-3 items-center active:opacity-70"
        >
          <Text className="font-sans-semibold text-teal">Analyze Image</Text>
        </Pressable>

        {/* Output */}
        {hasGenerated && (
          <Animated.View style={outputStyle} className="mt-6">
            <View className="bg-white border border-border rounded-xl p-4">
              {loading ? (
                <Text className="font-sans text-muted-foreground italic">
                  {t("stylebear.crafting", "StyleBear is crafting your prompt…")}
                </Text>
              ) : (
                <Text className="font-sans text-cream-foreground leading-relaxed" selectable>
                  {output}
                </Text>
              )}
            </View>

            {!loading && output ? (
              <View className="flex-row gap-3 mt-3">
                <Pressable
                  onPress={handleCopy}
                  className="flex-1 bg-teal rounded-full py-3 items-center active:opacity-80"
                >
                  <Text className="font-sans-semibold text-white">
                    {copied
                      ? t("stylebear.copied", "Copied!")
                      : t("stylebear.copyPrompt", "Copy Prompt")}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleShare}
                  className="flex-1 border border-teal rounded-full py-3 items-center active:opacity-70"
                >
                  <Text className="font-sans-semibold text-teal">
                    {t("stylebear.share", "Share")}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </Animated.View>
        )}
      </ScrollView>

      {/* Picker modal */}
      <PickerModal
        visible={pickerVisible}
        title={pickerTitle}
        items={pickerItems}
        selected={pickerSelected}
        onSelect={(v) => pickerCallback.current(v)}
        onClose={() => setPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

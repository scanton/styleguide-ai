import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface PickerModalProps {
  visible: boolean;
  title: string;
  items: string[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function PickerModal({
  visible,
  title,
  items,
  selected,
  onSelect,
  onClose,
}: PickerModalProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? items.filter((item) => item.toLowerCase().includes(query.toLowerCase()))
    : items;

  function handleSelect(value: string) {
    onSelect(value);
    setQuery("");
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-purple">
          <Text className="font-sans-semibold text-white text-lg">{title}</Text>
          <Pressable
            onPress={onClose}
            className="w-8 h-8 items-center justify-center rounded-full bg-purple-light active:opacity-70"
          >
            <Text className="text-white font-sans-bold">✕</Text>
          </Pressable>
        </View>

        {/* Search */}
        <View className="px-4 py-3 border-b border-border bg-white">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("common.search", "Search…")}
            placeholderTextColor="#A89E8C"
            className="bg-muted rounded-lg px-3 py-2 font-sans text-cream-foreground"
            style={{ height: 40 }}
            autoFocus
            clearButtonMode="while-editing"
          />
        </View>

        {/* None option */}
        <Pressable
          onPress={() => handleSelect("")}
          className={`px-4 py-3 border-b border-border flex-row items-center justify-between ${!selected ? "bg-purple/10" : "bg-white"}`}
        >
          <Text className={`font-sans text-base ${!selected ? "text-purple font-sans-semibold" : "text-muted-foreground"}`}>
            {t("stylebear.noneOption", "— none —")}
          </Text>
          {!selected && <Text className="text-purple text-lg">✓</Text>}
        </Pressable>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSelected = item === selected;
            return (
              <Pressable
                onPress={() => handleSelect(item)}
                className={`px-4 py-3 border-b border-border flex-row items-center justify-between active:opacity-70 ${isSelected ? "bg-purple/10" : "bg-white"}`}
              >
                <Text className={`font-sans text-base flex-1 ${isSelected ? "text-purple font-sans-semibold" : "text-cream-foreground"}`}>
                  {item}
                </Text>
                {isSelected && <Text className="text-purple text-lg ml-2">✓</Text>}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

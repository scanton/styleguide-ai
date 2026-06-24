import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import { router } from "expo-router";
import { AppHeader } from "@/components/AppHeader";
import { sendContactForm } from "@/lib/api";

const SERVICES = [
  {
    title: "AI Model Training & Fine-tuning",
    audience: "For studios and creators who want a custom AI model trained on their style",
    bullets: [
      "LoRA and DreamBooth fine-tuning",
      "Dataset curation and captioning",
      "Style consistency evaluation",
      "Deployment guidance for Stable Diffusion & ComfyUI",
    ],
  },
  {
    title: "Art Direction & Creative Strategy",
    audience: "For teams integrating AI into their creative workflow",
    bullets: [
      "Prompt engineering frameworks",
      "Workflow design for production pipelines",
      "Style guide development for AI outputs",
      "Team training and onboarding",
    ],
  },
  {
    title: "AI Agent & System Design",
    audience: "For companies building AI-powered products",
    bullets: [
      "Agentic system architecture",
      "Multi-model orchestration",
      "Tool design and API integration",
      "Evaluation and quality frameworks",
    ],
  },
];

function ServiceCard({ service }: { service: typeof SERVICES[0] }) {
  return (
    <View className="bg-white border border-border rounded-xl p-5 mb-4">
      <Text className="font-sans-bold text-base text-purple mb-1">{service.title}</Text>
      <Text className="font-sans text-sm text-muted-foreground italic mb-3">{service.audience}</Text>
      {service.bullets.map((b) => (
        <View key={b} className="flex-row mb-1.5">
          <Text className="text-purple mr-2 mt-0.5">•</Text>
          <Text className="flex-1 font-sans text-sm text-cream-foreground">{b}</Text>
        </View>
      ))}
    </View>
  );
}

export default function ConsultingScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!name.trim() || !email.trim() || !message.trim()) {
      Alert.alert("Missing fields", "Please fill in your name, email, and message.");
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailOk) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }

    setSending(true);
    const result = await sendContactForm({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() });
    setSending(false);

    if (result.ok) {
      Alert.alert(
        "Message sent!",
        "Thanks for reaching out. Satori will get back to you soon.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } else {
      Alert.alert("Couldn't send", result.error ?? "Please try again or email satoricanton@gmail.com directly.");
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
      <AppHeader title="Consulting" right={
        <Pressable onPress={() => router.back()} className="active:opacity-70">
          <Text className="font-sans text-white">← Back</Text>
        </Pressable>
      } />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          {/* Hero */}
          <View className="mb-6">
            <Text className="font-sans-bold text-2xl text-purple mb-2">AI Consulting</Text>
            <Text className="font-sans text-base text-muted-foreground leading-relaxed">
              Satori Canton — Head of AI at HeartStamp — offers expert consulting on AI art workflows, model training, and agentic systems.
            </Text>
          </View>

          {/* Services */}
          {SERVICES.map((s) => <ServiceCard key={s.title} service={s} />)}

          {/* Contact form */}
          <View className="mt-4">
            <Text className="font-sans-bold text-xl text-purple mb-4">Get in Touch</Text>

            <Text className="font-sans-semibold text-sm text-cream-foreground mb-1">Name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#A89E8C"
              className="bg-white border border-border rounded-xl px-4 font-sans text-cream-foreground mb-3"
              style={{ height: 48 }}
              autoCapitalize="words"
            />

            <Text className="font-sans-semibold text-sm text-cream-foreground mb-1">Email *</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#A89E8C"
              className="bg-white border border-border rounded-xl px-4 font-sans text-cream-foreground mb-3"
              style={{ height: 48 }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text className="font-sans-semibold text-sm text-cream-foreground mb-1">Subject</Text>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="What are you working on?"
              placeholderTextColor="#A89E8C"
              className="bg-white border border-border rounded-xl px-4 font-sans text-cream-foreground mb-3"
              style={{ height: 48 }}
            />

            <Text className="font-sans-semibold text-sm text-cream-foreground mb-1">Message *</Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Tell me about your project, goals, and timeline…"
              placeholderTextColor="#A89E8C"
              multiline
              numberOfLines={5}
              className="bg-white border border-border rounded-xl px-4 font-sans text-cream-foreground mb-4"
              style={{ height: 140, textAlignVertical: "top", paddingTop: 12 }}
            />

            <Pressable
              onPress={handleSend}
              disabled={sending}
              className="bg-purple rounded-full py-4 items-center active:opacity-80 disabled:opacity-50"
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text className="font-sans-semibold text-white text-base">Send Message</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

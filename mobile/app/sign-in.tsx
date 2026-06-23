import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuthRequest, makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "@/lib/SessionContext";
import { exchangeCodeForSession } from "@/lib/auth";

WebBrowser.maybeCompleteAuthSession();

const API_BASE = "https://www.styleguideai.com";
const REDIRECT_URI = makeRedirectUri({ scheme: "styleguideai", path: "sign-in" });

const discovery = {
  authorizationEndpoint: `${API_BASE}/api/auth/signin/google`,
};

export default function SignInScreen() {
  const { t } = useTranslation();
  const { signIn } = useSession();
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: "mobile",
      redirectUri: REDIRECT_URI,
      scopes: ["openid", "profile", "email"],
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === "success") {
      const { code } = response.params;
      (async () => {
        const token = await exchangeCodeForSession(code, REDIRECT_URI);
        if (token) {
          await signIn(token);
          router.back();
        } else {
          setError(t("signIn.error", "Sign-in failed. Please try again."));
        }
      })();
    } else if (response?.type === "error") {
      setError(t("signIn.error", "Sign-in failed. Please try again."));
    }
  }, [response]);

  return (
    <SafeAreaView className="flex-1 bg-cream">
      {/* Close button */}
      <View className="items-end px-4 pt-4">
        <Pressable
          onPress={() => router.back()}
          className="w-11 h-11 items-center justify-center rounded-full bg-muted active:opacity-70"
        >
          <Text className="font-sans-bold text-cream-foreground text-lg">✕</Text>
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center px-8 gap-6">
        {/* Logo placeholder */}
        <View className="w-24 h-24 rounded-full bg-purple items-center justify-center mb-4">
          <Text className="text-5xl">🎨</Text>
        </View>

        <Text className="font-sans-bold text-3xl text-purple text-center">
          StyleGuideAI
        </Text>
        <Text className="font-sans text-base text-muted-foreground text-center">
          {t("signIn.tagline", "The AI art community hub")}
        </Text>

        {error ? (
          <Text className="font-sans text-red-600 text-sm text-center">{error}</Text>
        ) : null}

        <Pressable
          disabled={!request}
          onPress={() => {
            setError(null);
            promptAsync();
          }}
          className="w-full bg-purple py-4 rounded-full items-center active:opacity-80 disabled:opacity-50"
          style={{ minHeight: 56 }}
        >
          <Text className="font-sans-semibold text-white text-lg">
            {t("signIn.googleButton", "Continue with Google")}
          </Text>
        </Pressable>

        <Text className="font-sans text-xs text-muted-foreground text-center">
          {t("signIn.privacyNote", "By signing in you agree to our privacy policy. Sign-in is optional — all tools work without an account.")}
        </Text>
      </View>
    </SafeAreaView>
  );
}

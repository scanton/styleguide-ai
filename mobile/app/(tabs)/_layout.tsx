import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { SymbolView } from "expo-symbols";
import { useTranslation } from "react-i18next";

const PURPLE = "#5B2FA0";
const CREAM = "#FAF6E8";
const MUTED = "#A89E8C";

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: PURPLE,
        tabBarInactiveTintColor: MUTED,
        tabBarStyle: {
          backgroundColor: CREAM,
          borderTopColor: "#DDD8C8",
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 84 : 64,
          paddingBottom: Platform.OS === "ios" ? 24 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("nav.rising", "Rising"),
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: "arrow.up.circle.fill", android: "trending_up", web: "trending_up" }}
              tintColor={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: t("nav.tools", "Tools"),
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: "wand.and.stars", android: "auto_fix_high", web: "auto_fix_high" }}
              tintColor={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="museum"
        options={{
          title: t("nav.museum", "Museum"),
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: "building.columns.fill", android: "museum", web: "museum" }}
              tintColor={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t("nav.search", "Search"),
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: "magnifyingglass", android: "search", web: "search" }}
              tintColor={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t("nav.account", "Account"),
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: "person.circle.fill", android: "account_circle", web: "account_circle" }}
              tintColor={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}

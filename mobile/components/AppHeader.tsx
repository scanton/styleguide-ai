import { Text, View } from "react-native";

interface AppHeaderProps {
  title: string;
  right?: React.ReactNode;
}

export function AppHeader({ title, right }: AppHeaderProps) {
  return (
    <View
      className="bg-purple px-4 flex-row items-center justify-between"
      style={{ height: 56 }}
    >
      <Text className="font-sans-bold text-white text-xl tracking-tight">{title}</Text>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

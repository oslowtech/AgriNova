import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DashboardScreen } from "../screens/DashboardScreen";
import { MapScreen } from "../screens/MapScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { palette, radius, shadows } from "../theme";

export type RootTabParamList = {
  Dashboard: undefined;
  Map: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: "📊",
    Map: "🗺️",
    Profile: "👤"
  };
  
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Text style={styles.icon}>{icons[name]}</Text>
    </View>
  );
}

export function AppNavigator() {
  const insets = useSafeAreaInsets();
  
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Dashboard"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
          tabBarLabel: ({ focused }) => (
            <Text style={[styles.label, focused && styles.labelActive]}>
              {route.name}
            </Text>
          ),
          tabBarStyle: {
            position: "absolute",
            bottom: Math.max(insets.bottom, 12),
            left: 16,
            right: 16,
            height: 70,
            backgroundColor: palette.surface,
            borderRadius: radius.xl,
            borderTopWidth: 0,
            paddingBottom: 0,
            ...shadows.lg
          },
          tabBarItemStyle: {
            paddingVertical: 8
          }
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Map" component={MapScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent"
  },
  iconWrapActive: {
    backgroundColor: palette.primaryLight + "15"
  },
  icon: {
    fontSize: 22
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: palette.muted,
    marginTop: 2
  },
  labelActive: {
    color: palette.primary,
    fontWeight: "700"
  }
});

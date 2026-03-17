import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../../src/utils/theme';

function TabIcon({ icon, label, focused, family }: { icon: string; label: string; focused: boolean; family?: string }) {
  const IconComp = family === 'mci' ? MaterialCommunityIcons : Ionicons;
  return (
    <View style={styles.tabItem}>
      <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
        <IconComp name={icon as any} size={22} color={focused ? COLORS.primary : COLORS.textMuted} />
        {focused && <View style={styles.activeDot} />}
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
      }}
    >
      <Tabs.Screen name="home" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="home" label="Home" focused={focused} /> }} />
      <Tabs.Screen name="trade" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="trending-up" label="Trade" focused={focused} /> }} />
      <Tabs.Screen name="bot" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="robot" label="AI Bot" focused={focused} family="mci" /> }} />
      <Tabs.Screen name="wallet" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="wallet" label="Wallet" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabIcon icon="person" label="Profile" focused={focused} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0D1220',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  tabItem: { alignItems: 'center', gap: 4 },
  iconWrap: { width: 44, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: 'rgba(0,255,157,0.1)' },
  activeDot: { position: 'absolute', bottom: -2, width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary },
  tabLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '500' },
  tabLabelActive: { color: COLORS.primary, fontWeight: '600' },
});

import React from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView
        style={[
          styles.safeArea,
          isDarkMode ? styles.safeAreaDark : styles.safeAreaLight,
        ]}>
        <AppContent isDarkMode={isDarkMode} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function AppContent({isDarkMode}: {isDarkMode: boolean}) {
  return (
    <View style={styles.container}>
      <View style={[styles.hero, isDarkMode ? styles.heroDark : styles.heroLight]}>
        <Text style={styles.eyebrow}>MyExplorer Native Shell</Text>
        <Text style={[styles.title, isDarkMode ? styles.titleDark : styles.titleLight]}>
          iOS foundation is live.
        </Text>
        <Text style={[styles.body, isDarkMode ? styles.bodyDark : styles.bodyLight]}>
          This React Native host is the starting point for shared trip logic,
          Android Auto, and CarPlay execution.
        </Text>
      </View>

      <View style={styles.checklist}>
        <ChecklistItem label="Bundle ID" value="com.thestillfoundation.myexplorer" />
        <ChecklistItem label="Host strategy" value="React Native" />
        <ChecklistItem label="Next focus" value="Shared session + platform adapters" />
      </View>
    </View>
  );
}

function ChecklistItem({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.checklistItem}>
      <Text style={styles.checklistLabel}>{label}</Text>
      <Text style={styles.checklistValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  safeAreaLight: {
    backgroundColor: '#f4f7fb',
  },
  safeAreaDark: {
    backgroundColor: '#07111d',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  hero: {
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  heroLight: {
    backgroundColor: '#ffffff',
  },
  heroDark: {
    backgroundColor: '#10233a',
  },
  eyebrow: {
    color: '#2b6cb0',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    marginBottom: 12,
  },
  titleLight: {
    color: '#0b1d35',
  },
  titleDark: {
    color: '#f7fbff',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  bodyLight: {
    color: '#425466',
  },
  bodyDark: {
    color: '#d8e4f2',
  },
  checklist: {
    gap: 14,
  },
  checklistItem: {
    backgroundColor: '#0f2741',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  checklistLabel: {
    color: '#8fb6d8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  checklistValue: {
    color: '#f7fbff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default App;

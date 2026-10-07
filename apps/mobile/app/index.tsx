import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function IndexScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Orbit</Text>
        <Text style={styles.title}>Project management foundation</Text>
        <Text style={styles.body}>This Phase 0 mobile shell is ready for shared features.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: {
    color: "#8A94B2",
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    backgroundColor: "#121829",
    borderColor: "#1E2740",
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
  },
  eyebrow: {
    color: "#22D3EE",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  screen: {
    backgroundColor: "#0B0F1A",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#E8ECF8",
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 12,
  },
});

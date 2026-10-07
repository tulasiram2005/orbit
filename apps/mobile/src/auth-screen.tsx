import { createOrbitClient, OrbitApiError } from "@orbit/api-client";
import type { AuthSessionDto, UserDto } from "@orbit/shared";
import NetInfo, { useNetInfo } from "@react-native-community/netinfo";
import { useMutation } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { styles } from "./auth-styles";
import { DashboardScreen } from "./dashboard-screen";

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const accessTokenKey = "orbit_access_token";
const refreshTokenKey = "orbit_refresh_token";

type Mode = "login" | "register";
type AuthForm = {
  email: string;
  name: string;
  password: string;
};

const emptyForm: AuthForm = {
  email: "",
  name: "",
  password: "",
};

function messageFor(error: unknown): string {
  if (error instanceof OrbitApiError) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export function AuthScreen() {
  const netInfo = useNetInfo();
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState<AuthForm>(emptyForm);
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const [user, setUser] = useState<UserDto | undefined>();
  const [status, setStatus] = useState("Checking your session...");

  const client = useMemo(
    () =>
      createOrbitClient({
        baseUrl: apiUrl,
        getAccessToken: async () =>
          accessToken ?? (await SecureStore.getItemAsync(accessTokenKey)) ?? undefined,
        onAccessToken: async (token) => {
          setAccessToken(token);
          if (token) {
            await SecureStore.setItemAsync(accessTokenKey, token);
            return;
          }
          await SecureStore.deleteItemAsync(accessTokenKey);
        },
      }),
    [accessToken]
  );

  async function saveSession(session: AuthSessionDto) {
    await SecureStore.setItemAsync(refreshTokenKey, session.tokens.refreshToken);
    setUser(session.user);
    setForm(emptyForm);
    setStatus("");
  }

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const refreshToken = await SecureStore.getItemAsync(refreshTokenKey);
      if (!refreshToken) {
        throw new Error("No session");
      }
      return client.refresh({ refreshToken });
    },
    onSuccess: saveSession,
    onError: async () => {
      setStatus("");
      setUser(undefined);
      setAccessToken(undefined);
      await SecureStore.deleteItemAsync(accessTokenKey);
      await SecureStore.deleteItemAsync(refreshTokenKey);
    },
  });

  const authMutation = useMutation({
    mutationFn: async () => {
      const state = await NetInfo.fetch();
      if (state.isConnected === false) {
        throw new Error("You are offline. Check your connection and try again.");
      }
      if (mode === "register") {
        return client.register(form);
      }
      return client.login({ email: form.email, password: form.password });
    },
    onSuccess: saveSession,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const refreshToken = await SecureStore.getItemAsync(refreshTokenKey);
      await client.logout(refreshToken ? { refreshToken } : {});
    },
    onSuccess: async () => {
      setUser(undefined);
      setAccessToken(undefined);
      await SecureStore.deleteItemAsync(accessTokenKey);
      await SecureStore.deleteItemAsync(refreshTokenKey);
    },
  });

  useEffect(() => {
    refreshMutation.mutate();
  }, []);

  const isOffline = netInfo.isConnected === false;
  const authError = authMutation.error ? messageFor(authMutation.error) : undefined;

  if (user) {
    return (
      <DashboardScreen
        client={client}
        isOffline={isOffline}
        onLogout={() => logoutMutation.mutate()}
        signingOut={logoutMutation.isPending}
        user={user}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshMutation.isPending}
            onRefresh={() => refreshMutation.mutate()}
          />
        }
      >
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Orbit</Text>
          <Text style={styles.title}>{mode === "login" ? "Sign in" : "Create account"}</Text>
          <>
            <View style={styles.tabs}>
              <TouchableOpacity
                onPress={() => setMode("login")}
                style={[styles.tab, mode === "login" ? styles.activeTab : null]}
              >
                <Text style={[styles.tabText, mode === "login" ? styles.activeTabText : null]}>
                  Login
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMode("register")}
                style={[styles.tab, mode === "register" ? styles.activeTab : null]}
              >
                <Text style={[styles.tabText, mode === "register" ? styles.activeTabText : null]}>
                  Register
                </Text>
              </TouchableOpacity>
            </View>
            {status ? <Text style={[styles.status, styles.neutral]}>{status}</Text> : null}
            {isOffline ? (
              <Text style={[styles.status, styles.warning]}>You are offline.</Text>
            ) : null}
            {authError ? <Text style={[styles.status, styles.danger]}>{authError}</Text> : null}
            {mode === "register" ? (
              <TextInput
                autoCapitalize="words"
                onChangeText={(name) => setForm({ ...form, name })}
                placeholder="Name"
                placeholderTextColor="#8A94B2"
                style={styles.input}
                value={form.name}
              />
            ) : null}
            <TextInput
              autoCapitalize="none"
              inputMode="email"
              keyboardType="email-address"
              onChangeText={(email) => setForm({ ...form, email })}
              placeholder="Email"
              placeholderTextColor="#8A94B2"
              style={styles.input}
              value={form.email}
            />
            <TextInput
              onChangeText={(password) => setForm({ ...form, password })}
              placeholder="Password"
              placeholderTextColor="#8A94B2"
              secureTextEntry
              style={styles.input}
              value={form.password}
            />
            <TouchableOpacity
              disabled={authMutation.isPending || isOffline}
              onPress={() => authMutation.mutate()}
              style={[styles.button, styles.primaryButton]}
            >
              <Text style={styles.buttonText}>
                {authMutation.isPending
                  ? "Working..."
                  : mode === "login"
                    ? "Sign in"
                    : "Create account"}
              </Text>
            </TouchableOpacity>
          </>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

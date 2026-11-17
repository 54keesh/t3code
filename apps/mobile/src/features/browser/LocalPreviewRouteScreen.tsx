import { useNavigation, type StaticScreenProps } from "@react-navigation/native";
import { EnvironmentId } from "@t3tools/contracts";
import { normalizePreviewUrl } from "@t3tools/shared/preview";
import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SymbolView } from "../../components/ui/AppSymbol";
import { ControlPill } from "../../components/ui/ControlPill";
import * as Dialog from "../../components/ui/Dialog";
import { TunnelWebView, type TunnelNavigation, type TunnelWebViewRef } from "./TunnelWebView";

type LocalPreviewRouteScreenProps = StaticScreenProps<{
  readonly environmentId: string;
  readonly url: string;
}>;

/** Another environment's localhost page rendered by this device's own webview. */
export function LocalPreviewRouteScreen({ route }: LocalPreviewRouteScreenProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const webView = useRef<TunnelWebViewRef>(null);
  const [requested, setRequested] = useState(route.params.url);
  const [draft, setDraft] = useState<string | null>(null);
  const [page, setPage] = useState<TunnelNavigation | null>(null);
  const [error, setError] = useState(false);
  const current = page?.url || requested;

  const submit = () => {
    const value = draft ?? current;
    setDraft(null);
    const next = normalizedOrNull(value);
    if (next === null) {
      Dialog.alert("Could not open this address", "Enter an http or https URL.");
      return;
    }
    setError(false);
    setRequested(next);
    void webView.current?.loadUrl(next);
  };

  return (
    <View className="flex-1 bg-sheet">
      <View
        className="flex-row items-center gap-1 px-2 pb-1.5"
        style={{ paddingTop: insets.top + 4 }}
      >
        <ControlPill
          icon="xmark"
          accessibilityLabel="Close browser"
          onPress={() => navigation.goBack()}
        />
        {page?.canGoBack ? (
          <ControlPill
            icon="chevron.left"
            accessibilityLabel="Back"
            onPress={() => void webView.current?.goBack()}
          />
        ) : null}
        <View className="h-10 min-w-0 flex-1 flex-row items-center rounded-full bg-input pl-4">
          <TextInput
            accessibilityLabel="Address"
            // Unfocused, the field shows only host and path; editing starts from the full URL.
            value={draft ?? displayAddress(current)}
            onFocus={() => setDraft(current)}
            onChangeText={setDraft}
            onBlur={() => setDraft(null)}
            onSubmitEditing={submit}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            selectTextOnFocus
            lineBreakModeIOS="middle"
            numberOfLines={1}
            className="h-10 min-w-0 flex-1 font-sans text-sm text-foreground"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reload page"
            onPress={() => {
              setError(false);
              void webView.current?.reload();
            }}
            className="size-10 items-center justify-center"
          >
            <SymbolView name="arrow.clockwise" size={16} tintColorClassName="accent-icon" />
          </Pressable>
        </View>
      </View>
      <TunnelWebView
        ref={webView}
        className="flex-1"
        environmentId={EnvironmentId.make(route.params.environmentId)}
        url={route.params.url}
        onNavigationChange={(next) => {
          if (next.loading) setError(false);
          setPage(next);
        }}
        onLoadError={() => setError(true)}
      />
      {error ? (
        <View className="absolute inset-x-0 bg-sheet px-4 py-3" style={{ bottom: insets.bottom }}>
          <Text className="font-sans text-sm text-foreground">
            Could not reach this port on the environment.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function displayAddress(value: string): string {
  try {
    const url = new URL(value);
    return `${url.host}${url.pathname === "/" ? "" : url.pathname}${url.search}`;
  } catch {
    return value;
  }
}

function normalizedOrNull(value: string): string | null {
  try {
    return normalizePreviewUrl(value);
  } catch {
    return null;
  }
}

import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Send } from "../../src/components/ui/Icons";
import { AppButton, AppCard, AppInput } from "../../src/components/ui/Primitives";
import { ApiError } from "../../src/services/api";
import { memberApi } from "../../src/services/endpoints";
import { queryKeys } from "../../src/services/queryClient";
import { useAuth } from "../../src/store/authStore";
import { useGymTheme } from "../../src/theme/GymThemeProvider";
import {
  FONT,
  MIN_TOUCH_TARGET,
  RADIUS,
  SPACING,
  TABULAR_NUMS,
  TYPOGRAPHY,
} from "../../src/theme/tokens";

export default function RenewalRequestModal() {
  const { colors } = useGymTheme();
  const { activeGym } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ planId?: string }>();

  const [selectedPlanId, setSelectedPlanId] = useState<number | undefined>(
    params.planId ? Number(params.planId) : undefined,
  );
  const [note, setNote] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const plansQuery = useQuery({
    queryKey: queryKeys.plans(activeGym?.slug),
    queryFn: async () => (await memberApi.plans()).results || [],
    enabled: Boolean(activeGym?.slug),
  });

  const planList = Array.isArray(plansQuery.data)
    ? plansQuery.data
    : Array.isArray((plansQuery.data as any)?.results)
      ? ((plansQuery.data as any).results as Array<{
          id: number;
          name: string;
          price: number;
          duration_days: number;
        }>)
      : [];

  const mutation = useMutation({
    mutationFn: () => memberApi.requestRenewal(selectedPlanId, note.trim()),
    onSuccess: (res) => {
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert("Request Sent", res.detail, [{ text: "OK", onPress: () => router.back() }]);
    },
    onError: (err: any) => {
      setErrorMsg(err instanceof ApiError ? err.message : "Could not send request.");
    },
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {errorMsg ? (
            <View style={[styles.errBox, { backgroundColor: colors.errorContainer }]}>
              <Text style={{ color: colors.error, fontFamily: FONT.semibold, fontSize: 13 }}>
                {errorMsg}
              </Text>
            </View>
          ) : null}

          <AppCard style={{ gap: SPACING.md }}>
            <View style={{ gap: 4 }}>
              <Text style={[TYPOGRAPHY.h3, { color: colors.text }]}>Choose a Plan</Text>
              <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                Your renewal request goes directly to {activeGym?.name || "your gym"}'s front desk
                for payment confirmation and activation.
              </Text>
            </View>

            <View style={{ gap: 8 }}>
              {planList.map((plan) => {
                const selected = selectedPlanId === plan.id;
                return (
                  <Pressable
                    key={plan.id}
                    onPress={() => setSelectedPlanId(plan.id)}
                    android_ripple={{ color: colors.ripple }}
                    style={[
                      styles.planOption,
                      {
                        backgroundColor: selected ? colors.primaryContainer : colors.surfaceVariant,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>{plan.name}</Text>
                      <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }, TABULAR_NUMS]}>
                        Rs. {Number(plan.price || 0).toLocaleString()} · {plan.duration_days} days
                      </Text>
                    </View>
                    {selected ? <Check size={18} color={colors.primary} /> : null}
                  </Pressable>
                );
              })}
            </View>

            <AppInput
              label="Note for Front Desk (Optional)"
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Will pay via QR/cash at morning session"
              multiline
            />

            <AppButton
              label="Send Renewal Request"
              loading={mutation.isPending}
              onPress={() => {
                setErrorMsg("");
                mutation.mutate();
              }}
              icon={<Send size={16} color="#FFFFFF" />}
            />
          </AppCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    gap: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  planOption: {
    minHeight: MIN_TOUCH_TARGET + 8,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  errBox: {
    padding: 12,
    borderRadius: RADIUS.md,
  },
});

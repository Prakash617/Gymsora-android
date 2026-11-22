import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Brightness from "expo-brightness";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import {
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  Info,
  Receipt,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "../../src/components/ui/Icons";
import { AttendanceCalendar } from "../../src/components/AttendanceCalendar";
import { QrPassCard } from "../../src/components/QrPassCard";
import {
  AppButton,
  AppCard,
  BottomSheetModal,
  CardSkeleton,
  EmptyStateCard,
  OfflineNotice,
  SectionHeader,
  StatusPill,
} from "../../src/components/ui/Primitives";
import { ApiError } from "../../src/services/api";
import { memberApi } from "../../src/services/endpoints";
import { localDb } from "../../src/services/localDb";
import { queryKeys } from "../../src/services/queryClient";
import { cacheStorage } from "../../src/services/storage";
import { useAuth } from "../../src/store/authStore";
import { useGymTheme } from "../../src/theme/GymThemeProvider";
import {
  FONT,
  RADIUS,
  SPACING,
  TABULAR_NUMS,
  TYPOGRAPHY,
} from "../../src/theme/tokens";
import type { AttendanceItem, PaymentItem, StreakInfo } from "../../src/types/api";

type WalletTab = "pass" | "attendance" | "billing";

interface CachedAttendance {
  streak: StreakInfo;
  calendar_dates: string[];
  results: AttendanceItem[];
}

export default function MembershipScreen() {
  const { colors } = useGymTheme();
  const {
    member,
    activeGym,
    qrSecret,
    clockOffset,
    subscription,
    streak,
    rotateQrPass,
  } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<WalletTab>("pass");
  const [rotating, setRotating] = useState(false);
  const [cached, setCached] = useState<CachedAttendance | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentItem | null>(null);

  // Month cursor for Attendance calendar navigation
  const now = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const viewDate = useMemo(
    () => new Date(now.getFullYear(), now.getMonth() + monthOffset, 1),
    [monthOffset],
  );
  const viewYear = viewDate.getFullYear();
  const viewMonthIndex = viewDate.getMonth();
  const monthParam = `${viewYear}-${String(viewMonthIndex + 1).padStart(2, "0")}`;

  useEffect(() => {
    cacheStorage
      .getJson<CachedAttendance>(cacheStorage.keys.ATTENDANCE_SNAPSHOT)
      .then((snap) => {
        if (snap) setCached(snap);
      });
  }, [activeGym?.slug]);

  // Boost screen brightness only when viewing the QR pass tab on native
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === "web" || tab !== "pass") return;
      let prevBrightness: number | null = null;
      (async () => {
        try {
          prevBrightness = await Brightness.getBrightnessAsync();
          if (prevBrightness < 0.85) {
            await Brightness.setBrightnessAsync(0.92);
          }
        } catch {
          /* ignore if unsupported */
        }
      })();
      return () => {
        if (prevBrightness !== null) {
          Brightness.setBrightnessAsync(prevBrightness).catch(() => undefined);
        }
      };
    }, [tab]),
  );

  const attendanceQuery = useQuery({
    queryKey: queryKeys.attendance(activeGym?.slug, monthParam),
    queryFn: async () => {
      const data = await memberApi.attendance(monthParam);
      const snap: CachedAttendance = {
        streak: data.streak,
        calendar_dates: data.calendar_dates,
        results: data.results,
      };
      if (monthOffset === 0) {
        setCached(snap);
        await cacheStorage.setJson(cacheStorage.keys.ATTENDANCE_SNAPSHOT, snap);
        if (activeGym?.slug) void localDb.saveAttendance(activeGym.slug, data.results);
      }
      return snap;
    },
    enabled: Boolean(activeGym?.slug),
  });

  const subsQuery = useQuery({
    queryKey: queryKeys.subscriptions(activeGym?.slug),
    queryFn: () => memberApi.subscriptions(),
    enabled: Boolean(activeGym?.slug),
  });

  const plansQuery = useQuery({
    queryKey: queryKeys.plans(activeGym?.slug),
    queryFn: async () => (await memberApi.plans()).results || [],
    enabled: Boolean(activeGym?.slug),
  });

  const availablePlans = useMemo(() => {
    const raw = plansQuery.data as any;
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.results)) return raw.results;
    return [];
  }, [plansQuery.data]);

  const displayAtt = attendanceQuery.data || (monthOffset === 0 ? cached : null);
  const currentSub = subsQuery.data?.current || subscription;
  const isOffline = Boolean(
    (attendanceQuery.error as any)?.isNetworkError || (subsQuery.error as any)?.isNetworkError,
  );

  const handleResetPass = () => {
    Alert.alert(
      "Sync Clock & Rotate QR Pass?",
      "Syncs your device clock with the gym server and generates a fresh offline QR key on this phone. Older devices will stop scanning.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sync & Rotate",
          onPress: async () => {
            setRotating(true);
            try {
              await rotateQrPass();
              if (Platform.OS !== "web") {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch (err: any) {
              Alert.alert(
                "Could not sync",
                err instanceof ApiError
                  ? err.message
                  : "Connect to the internet to rotate your QR pass.",
              );
            } finally {
              setRotating(false);
            }
          },
        },
      ],
    );
  };

  const onRefresh = () => {
    void Promise.all([attendanceQuery.refetch(), subsQuery.refetch(), plansQuery.refetch()]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={attendanceQuery.isRefetching || subsQuery.isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.screenHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[TYPOGRAPHY.label, { color: colors.primary }]}>DIGITAL WALLET</Text>
            <Text style={[TYPOGRAPHY.h1, { color: colors.text }]}>Membership</Text>
          </View>
          <StatusPill
            label={currentSub?.is_allowed ? "ACTIVE" : "INACTIVE"}
            tone={currentSub?.is_allowed ? "success" : "error"}
          />
        </View>

        {isOffline ? (
          <OfflineNotice message="Offline mode — your rotating QR check-in pass remains 100% active." />
        ) : null}

        {/* Wallet Sub-Tabs */}
        <View
          style={[
            styles.segmented,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {(
            [
              { key: "pass", label: "QR Pass" },
              { key: "attendance", label: "Attendance" },
              { key: "billing", label: "Payments" },
            ] as const
          ).map((item) => {
            const active = tab === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setTab(item.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.segBtn, active && { backgroundColor: colors.primary }]}
              >
                <Text
                  style={[
                    styles.segText,
                    { color: active ? "#FFFFFF" : colors.textSecondary },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ================= PASS TAB ================= */}
        {tab === "pass" ? (
          <View style={{ gap: 14 }}>
            {activeGym && member ? (
              <QrPassCard
                gym={activeGym}
                member={member}
                qrSecret={qrSecret}
                clockOffset={clockOffset}
                subscription={currentSub}
              />
            ) : (
              <CardSkeleton lines={4} />
            )}

            <AppButton
              label="Scan Gym Reception Desk QR"
              onPress={() => router.push("/scan-checkin")}
              icon={<Camera size={17} color="#FFFFFF" />}
            />

            <View style={styles.actionPair}>
              <AppButton
                label="Sync & Rotate Key"
                variant="outline"
                size="sm"
                loading={rotating}
                onPress={handleResetPass}
                icon={<RefreshCw size={15} color={colors.text} />}
                style={{ flex: 1 }}
              />
              <AppButton
                label="Renew / Upgrade"
                variant="tonal"
                size="sm"
                onPress={() => router.push("/modals/renewal-request")}
                style={{ flex: 1 }}
              />
            </View>

            <AppCard variant="subtle" style={styles.securityNote}>
              <ShieldCheck size={18} color={colors.success} />
              <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary, flex: 1 }]}>
                Your QR code rotates every 30 seconds with a hardware-stored cryptographic key.
                Gym reception validates active membership server-side on every scan.
              </Text>
            </AppCard>
          </View>
        ) : null}

        {/* ================= ATTENDANCE TAB ================= */}
        {tab === "attendance" ? (
          <View style={{ gap: 16 }}>
            <AttendanceCalendar
              streak={displayAtt?.streak || streak}
              visitedDates={displayAtt?.calendar_dates || []}
              year={viewYear}
              monthIndex={viewMonthIndex}
              onPrevMonth={() => setMonthOffset((m) => m - 1)}
              onNextMonth={() => setMonthOffset((m) => Math.min(0, m + 1))}
              canGoNext={monthOffset < 0}
            />

            <View>
              <SectionHeader
                title="Check-In History"
                subtitle={`${displayAtt?.results?.length || 0} recent scan${(displayAtt?.results?.length || 0) === 1 ? "" : "s"}`}
              />
              {displayAtt?.results?.length ? (
                <View style={{ gap: 8 }}>
                  {displayAtt.results.map((item) => {
                    const dt = new Date(item.checked_in_at);
                    return (
                      <AppCard key={item.id} style={styles.logRow}>
                        <View
                          style={[
                            styles.logIcon,
                            {
                              backgroundColor: item.is_allowed
                                ? colors.successContainer
                                : colors.errorContainer,
                            },
                          ]}
                        >
                          {item.is_allowed ? (
                            <CheckCircle2 size={18} color={colors.success} />
                          ) : (
                            <XCircle size={18} color={colors.error} />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>
                            {dt.toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </Text>
                          <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }, TABULAR_NUMS]}>
                            {dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
                            {item.method === "qr_member" ? "QR Pass" : item.method}
                          </Text>
                        </View>
                        <StatusPill
                          label={String(item.result || "").replace("_", " ").toUpperCase()}
                          tone={item.is_allowed ? "success" : "error"}
                        />
                      </AppCard>
                    );
                  })}
                </View>
              ) : (
                <EmptyStateCard
                  icon={<Clock size={26} color={colors.textMuted} />}
                  title="No check-ins recorded yet"
                  description="Show your QR pass at gym reception to record your first verified visit."
                  actionLabel="Open QR Pass"
                  onAction={() => setTab("pass")}
                />
              )}
            </View>
          </View>
        ) : null}

        {/* ================= BILLING & PLANS TAB ================= */}
        {tab === "billing" ? (
          <View style={{ gap: 18 }}>
            {/* Renewal Availability Info */}
            <AppCard variant="subtle" style={styles.securityNote}>
              <Info size={17} color={colors.primary} />
              <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary, flex: 1 }]}>
                Online card/wallet checkout is not enabled for this gym yet. Submit a renewal request below and your front desk will confirm payment.
              </Text>
            </AppCard>

            {/* Payment Receipts */}
            <View>
              <SectionHeader
                title="Payment Receipts"
                subtitle="Tap a payment to view receipt details"
              />
              {subsQuery.isLoading && !subsQuery.data ? (
                <CardSkeleton lines={2} />
              ) : subsQuery.data?.payments?.length ? (
                <View style={{ gap: 8 }}>
                  {subsQuery.data.payments.map((p) => (
                    <Pressable key={p.id} onPress={() => setSelectedReceipt(p)}>
                      <AppCard style={styles.logRow}>
                        <View style={[styles.logIcon, { backgroundColor: colors.primaryContainer }]}>
                          <Receipt size={18} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>
                            {p.plan_name}
                          </Text>
                          <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }, TABULAR_NUMS]}>
                            {p.method} · {new Date(p.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end", gap: 3 }}>
                          <Text style={[TYPOGRAPHY.title, { color: colors.text }, TABULAR_NUMS]}>
                            Rs. {Number(p.amount || 0).toLocaleString()}
                          </Text>
                          <StatusPill
                            label={String(p.status || "").toUpperCase()}
                            tone={
                              String(p.status || "").toLowerCase() === "completed" ||
                              String(p.status || "").toLowerCase() === "paid"
                                ? "success"
                                : "warning"
                            }
                          />
                        </View>
                      </AppCard>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <EmptyStateCard
                  icon={<CreditCard size={24} color={colors.textMuted} />}
                  title="No payment receipts yet"
                  description="Completed membership payments recorded by your gym will appear here."
                />
              )}
            </View>

            {/* Subscription History */}
            <View>
              <SectionHeader
                title="Membership History"
                actionLabel="Renew"
                onAction={() => router.push("/modals/renewal-request")}
              />
              {subsQuery.data?.subscriptions?.length ? (
                <View style={{ gap: 8 }}>
                  {subsQuery.data.subscriptions.map((sub) => (
                    <AppCard key={sub.id} style={{ gap: 6 }}>
                      <View style={styles.rowBetween}>
                        <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>
                          {sub.plan_name}
                        </Text>
                        <StatusPill
                          label={String(sub.payment_status || "").toUpperCase()}
                          tone={sub.payment_status === "paid" ? "success" : "warning"}
                        />
                      </View>
                      <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }, TABULAR_NUMS]}>
                        {sub.start_date} → {sub.end_date}
                      </Text>
                      <Text style={[TYPOGRAPHY.bodyMedium, { color: colors.primary }, TABULAR_NUMS]}>
                        Paid: Rs. {Number(sub.amount_paid || 0).toLocaleString()}
                      </Text>
                    </AppCard>
                  ))}
                </View>
              ) : null}
            </View>

            {/* Available Gym Plans */}
            <View>
              <SectionHeader title="Available Plans" subtitle="Request a renewal or upgrade at reception" />
              {availablePlans.length ? (
                <View style={{ gap: 10 }}>
                  {availablePlans.map((plan: any) => (
                    <AppCard key={plan.id} style={{ gap: 8 }}>
                      <View style={styles.rowBetween}>
                        <View style={{ flex: 1 }}>
                          <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>{plan.name}</Text>
                          <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }, TABULAR_NUMS]}>
                            {plan.duration_days} days validity
                          </Text>
                        </View>
                        <Text style={[styles.planPrice, { color: colors.primary }, TABULAR_NUMS]}>
                          Rs. {Number(plan.price || 0).toLocaleString()}
                        </Text>
                      </View>
                      {plan.description ? (
                        <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                          {plan.description}
                        </Text>
                      ) : null}
                      <AppButton
                        label="Request Renewal / Switch"
                        variant="tonal"
                        size="sm"
                        onPress={() =>
                          router.push({
                            pathname: "/modals/renewal-request",
                            params: { planId: String(plan.id), planName: plan.name },
                          })
                        }
                      />
                    </AppCard>
                  ))}
                </View>
              ) : (
                <EmptyStateCard
                  icon={<ClipboardList size={24} color={colors.textMuted} />}
                  title="No plans published"
                  description="Ask your gym reception about current membership packages."
                />
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Receipt / Invoice Detail Sheet */}
      <BottomSheetModal
        visible={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        title="Payment Receipt"
        subtitle={activeGym?.name || "GymSora"}
      >
        {selectedReceipt ? (
          <View style={{ gap: 12 }}>
            <AppCard variant="subtle" style={{ alignItems: "center", gap: 4, paddingVertical: 18 }}>
              <Text style={[TYPOGRAPHY.label, { color: colors.textMuted }]}>AMOUNT PAID</Text>
              <Text style={[TYPOGRAPHY.display, { color: colors.primary }, TABULAR_NUMS]}>
                Rs. {selectedReceipt.amount.toLocaleString()}
              </Text>
              <StatusPill
                label={selectedReceipt.status.toUpperCase()}
                tone={
                  selectedReceipt.status.toLowerCase() === "completed" ||
                  selectedReceipt.status.toLowerCase() === "paid"
                    ? "success"
                    : "warning"
                }
              />
            </AppCard>

            <View style={{ gap: 10, paddingHorizontal: 4 }}>
              {[
                { k: "Receipt #", v: `REC-${String(selectedReceipt.id).padStart(5, "0")}` },
                { k: "Plan", v: selectedReceipt.plan_name },
                { k: "Member", v: member?.name || "—" },
                { k: "Payment Method", v: selectedReceipt.method },
                { k: "Date", v: new Date(selectedReceipt.created_at).toLocaleString() },
                { k: "Reference ID", v: selectedReceipt.transaction_id || "Desk Receipt" },
              ].map((row) => (
                <View key={row.k} style={styles.rowBetween}>
                  <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }]}>{row.k}</Text>
                  <Text style={[TYPOGRAPHY.bodyMedium, { color: colors.text }, TABULAR_NUMS]}>
                    {row.v}
                  </Text>
                </View>
              ))}
            </View>

            <AppButton label="Close Receipt" variant="outline" onPress={() => setSelectedReceipt(null)} />
          </View>
        ) : null}
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    gap: 16,
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  segmented: {
    flexDirection: "row",
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  segBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  segText: {
    fontFamily: FONT.semibold,
    fontSize: 12.5,
  },
  actionPair: {
    flexDirection: "row",
    gap: 10,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  logIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  planPrice: {
    fontFamily: FONT.extrabold,
    fontSize: 17,
  },
});

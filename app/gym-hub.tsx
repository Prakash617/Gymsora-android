import React, { useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  ClipboardList,
  Coffee,
  Dumbbell,
  Mail,
  MapPin,
  Megaphone,
  Package,
  Phone,
  Pin,
  Send,
  Sparkles,
} from "../src/components/ui/Icons";
import {
  AppButton,
  AppCard,
  AppInput,
  CardSkeleton,
  EmptyStateCard,
  ErrorStateCard,
  SectionHeader,
  StatusPill,
} from "../src/components/ui/Primitives";
import { ApiError } from "../src/services/api";
import { memberApi } from "../src/services/endpoints";
import { queryKeys } from "../src/services/queryClient";
import { useAuth } from "../src/store/authStore";
import { useGymTheme } from "../src/theme/GymThemeProvider";
import { FONT, RADIUS, SPACING, TABULAR_NUMS, TYPOGRAPHY } from "../src/theme/tokens";

type HubTab = "trainers" | "classes" | "plans" | "services" | "shop" | "notices";

export default function GymHubScreen() {
  const { colors } = useGymTheme();
  const { activeGym } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [section, setSection] = useState<HubTab>("trainers");
  const [msgText, setMsgText] = useState("");

  const hubQuery = useQuery({
    queryKey: queryKeys.gymHub(activeGym?.slug),
    queryFn: () => memberApi.gymHub(),
    enabled: Boolean(activeGym?.slug),
  });

  const classesQuery = useQuery({
    queryKey: queryKeys.classes(activeGym?.slug),
    queryFn: async () => (await memberApi.classes()).results || [],
    enabled: Boolean(activeGym?.slug),
  });

  const messagesQuery = useQuery({
    queryKey: queryKeys.messages(activeGym?.slug),
    queryFn: () => memberApi.messages(),
    enabled: Boolean(activeGym?.slug),
  });

  const bookClassMut = useMutation({
    mutationFn: (classId: number) => memberApi.toggleClassBooking(classId),
    onSuccess: (res) => {
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      void qc.invalidateQueries({ queryKey: queryKeys.classes(activeGym?.slug) });
      Alert.alert("Class Updated", res.detail);
    },
    onError: (err: any) => {
      Alert.alert("Booking Failed", err instanceof ApiError ? err.message : "Could not update booking.");
    },
  });

  const sendMsgMut = useMutation({
    mutationFn: (body: string) => memberApi.sendMessage(body),
    onSuccess: () => {
      setMsgText("");
      if (Platform.OS !== "web") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      void qc.invalidateQueries({ queryKey: queryKeys.messages(activeGym?.slug) });
    },
    onError: (err: any) => {
      Alert.alert("Could not send", err instanceof ApiError ? err.message : "Please try again.");
    },
  });

  const hub = hubQuery.data;
  const gym = hub?.gym || activeGym;

  const tabs: Array<{ key: HubTab; label: string }> = [
    { key: "trainers", label: "Trainers & Chat" },
    { key: "classes", label: "Classes" },
    { key: "plans", label: "Plans" },
    { key: "services", label: "Services" },
    { key: "shop", label: "Shop & Cafe" },
    { key: "notices", label: "Notices" },
  ];

  const openTel = (phone?: string) => {
    if (phone) void Linking.openURL(`tel:${phone.replace(/\s+/g, "")}`);
  };
  const openEmail = (email?: string) => {
    if (email) void Linking.openURL(`mailto:${email}`);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={hubQuery.isRefetching}
          onRefresh={() => void hubQuery.refetch()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Gym Identity Card */}
      <AppCard variant="elevated" style={{ gap: 12 }}>
        {gym?.banner ? <Image source={{ uri: gym.banner }} style={styles.banner} /> : null}
        <View style={styles.gymHeader}>
          {gym?.logo ? (
            <Image source={{ uri: gym.logo }} style={styles.logo} />
          ) : (
            <View style={[styles.logoFallback, { backgroundColor: colors.primaryContainer }]}>
              <Text style={[styles.logoText, { color: colors.primary }]}>
                {(gym?.name || "G")[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[TYPOGRAPHY.h3, { color: colors.text }]}>{gym?.name || "My Gym"}</Text>
            {gym?.address ? (
              <View style={styles.metaRow}>
                <MapPin size={13} color={colors.textMuted} />
                <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary, flex: 1 }]}>
                  {gym.address}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {gym?.about_us || gym?.description ? (
          <Text style={[TYPOGRAPHY.body, { color: colors.textSecondary }]}>
            {gym.about_us || gym.description}
          </Text>
        ) : null}

        <View style={styles.contactRow}>
          {gym?.contact_phone || gym?.phone ? (
            <AppButton
              label="Call Gym"
              variant="tonal"
              size="sm"
              onPress={() => openTel(gym.contact_phone || gym.phone)}
              icon={<Phone size={15} color={colors.onPrimaryContainer} />}
              style={{ flex: 1 }}
            />
          ) : null}
          {gym?.contact_email || gym?.email ? (
            <AppButton
              label="Email"
              variant="outline"
              size="sm"
              onPress={() => openEmail(gym.contact_email || gym.email)}
              icon={<Mail size={15} color={colors.text} />}
              style={{ flex: 1 }}
            />
          ) : null}
        </View>
      </AppCard>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {tabs.map((item) => {
          const active = section === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setSection(item.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? "#FFFFFF" : colors.textSecondary }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {hubQuery.isLoading ? (
        <CardSkeleton lines={3} />
      ) : hubQuery.isError ? (
        <ErrorStateCard
          message={(hubQuery.error as Error)?.message || "Could not load gym directory."}
          onRetry={() => void hubQuery.refetch()}
        />
      ) : null}

      {/* TRAINERS */}
      {!hubQuery.isLoading && !hubQuery.isError && section === "trainers" ? (
        <View style={{ gap: 12 }}>
          {hub?.trainers?.length ? (
            hub.trainers.map((t) => (
              <AppCard key={t.id} style={styles.trainerCard}>
                {t.photo ? (
                  <Image source={{ uri: t.photo }} style={styles.trainerPhoto} />
                ) : (
                  <View
                    style={[
                      styles.trainerPhoto,
                      {
                        backgroundColor: colors.primaryContainer,
                        alignItems: "center",
                        justifyContent: "center",
                      },
                    ]}
                  >
                    <Dumbbell size={22} color={colors.primary} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>{t.name}</Text>
                  {t.specialization ? <StatusPill label={t.specialization} tone="primary" /> : null}
                  {t.bio ? (
                    <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                      {t.bio}
                    </Text>
                  ) : null}
                </View>
              </AppCard>
            ))
          ) : (
            <EmptyStateCard
              icon={<Dumbbell size={26} color={colors.textMuted} />}
              title="No trainers published yet"
              description="Coaches listed by your gym will appear here with their specialization and bio."
            />
          )}

          {/* Live Direct Message Thread with Gym / Assigned Trainer */}
          <AppCard style={{ gap: 12 }}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={[TYPOGRAPHY.h3, { color: colors.text }]}>Message Your Coach</Text>
                <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }]}>
                  {messagesQuery.data?.assigned_trainer
                    ? `Assigned coach: ${messagesQuery.data.assigned_trainer.name}`
                    : `Direct inbox to ${gym?.name || "your gym"} team`}
                </Text>
              </View>
            </View>

            {messagesQuery.data?.results?.length ? (
              <View style={{ gap: 8 }}>
                {messagesQuery.data.results.slice(-10).map((m) => {
                  const isMine = m.sender_role === "member";
                  return (
                    <View
                      key={m.id}
                      style={[
                        styles.msgBubble,
                        isMine
                          ? {
                              alignSelf: "flex-end",
                              backgroundColor: colors.primary,
                            }
                          : {
                              alignSelf: "flex-start",
                              backgroundColor: colors.surfaceVariant,
                            },
                      ]}
                    >
                      <Text
                        style={[
                          TYPOGRAPHY.body,
                          { color: isMine ? "#FFFFFF" : colors.text },
                        ]}
                      >
                        {m.body}
                      </Text>
                      <Text
                        style={[
                          TYPOGRAPHY.micro,
                          {
                            color: isMine ? "rgba(255,255,255,0.75)" : colors.textMuted,
                            marginTop: 3,
                          },
                        ]}
                      >
                        {new Date(m.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }]}>
                Ask about form checks, workout plans, or training sessions below.
              </Text>
            )}

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <AppInput
                  value={msgText}
                  onChangeText={setMsgText}
                  placeholder="Write a message to your coach..."
                />
              </View>
              <AppButton
                label="Send"
                size="sm"
                loading={sendMsgMut.isPending}
                disabled={!msgText.trim()}
                icon={<Send size={14} color="#FFFFFF" />}
                onPress={() => msgText.trim() && sendMsgMut.mutate(msgText.trim())}
              />
            </View>
          </AppCard>
        </View>
      ) : null}

      {/* CLASSES */}
      {!hubQuery.isLoading && !hubQuery.isError && section === "classes" ? (
        classesQuery.data?.length ? (
          <View style={{ gap: 10 }}>
            {classesQuery.data.map((cls) => (
              <AppCard key={cls.id} style={{ gap: 8 }}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>{cls.title}</Text>
                    <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }, TABULAR_NUMS]}>
                      {new Date(cls.starts_at).toLocaleString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {cls.duration_minutes} min
                    </Text>
                  </View>
                  <StatusPill
                    label={`${cls.booked_count}/${cls.capacity}`}
                    tone={cls.is_booked ? "success" : "primary"}
                  />
                </View>
                {cls.trainer_name ? (
                  <Text style={[TYPOGRAPHY.caption, { color: colors.primary }]}>
                    Coach: {cls.trainer_name}
                    {cls.location ? ` · ${cls.location}` : ""}
                  </Text>
                ) : null}
                {cls.description ? (
                  <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                    {cls.description}
                  </Text>
                ) : null}
                <AppButton
                  label={cls.is_booked ? "Cancel Spot" : "Book Class Spot"}
                  variant={cls.is_booked ? "outline" : "tonal"}
                  size="sm"
                  loading={bookClassMut.isPending}
                  onPress={() => bookClassMut.mutate(cls.id)}
                />
              </AppCard>
            ))}
          </View>
        ) : (
          <EmptyStateCard
            icon={<Calendar size={26} color={colors.textMuted} />}
            title="No upcoming classes scheduled"
            description="Group sessions scheduled by your gym will appear here for instant booking."
          />
        )
      ) : null}

      {/* PLANS */}
      {!hubQuery.isLoading && !hubQuery.isError && section === "plans" ? (
        hub?.plans?.length ? (
          <View style={{ gap: 10 }}>
            {hub.plans.map((plan) => (
              <AppCard key={plan.id} style={{ gap: 8 }}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>{plan.name}</Text>
                    <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }, TABULAR_NUMS]}>
                      {plan.duration_days} days validity
                    </Text>
                  </View>
                  <Text style={[styles.price, { color: colors.primary }, TABULAR_NUMS]}>
                    Rs. {plan.price.toLocaleString()}
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
            icon={<ClipboardList size={26} color={colors.textMuted} />}
            title="No active plans listed"
            description="Ask your gym reception about available membership packages."
          />
        )
      ) : null}

      {/* SERVICES */}
      {!hubQuery.isLoading && !hubQuery.isError && section === "services" ? (
        hub?.services?.length ? (
          <View style={{ gap: 10 }}>
            {hub.services.map((s) => (
              <AppCard key={s.id} style={{ gap: 6 }}>
                <View style={styles.rowBetween}>
                  <Text style={[TYPOGRAPHY.title, { color: colors.text, flex: 1 }]}>{s.name}</Text>
                  {s.price > 0 ? (
                    <Text style={[styles.price, { color: colors.primary }, TABULAR_NUMS]}>
                      Rs. {s.price.toLocaleString()}
                    </Text>
                  ) : (
                    <StatusPill label="Included" tone="success" />
                  )}
                </View>
                {s.short_description || s.description ? (
                  <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>
                    {s.description || s.short_description}
                  </Text>
                ) : null}
              </AppCard>
            ))}
          </View>
        ) : (
          <EmptyStateCard
            icon={<Sparkles size={26} color={colors.textMuted} />}
            title="No services listed"
            description="Personal training, sauna, or group classes published by your gym will appear here."
          />
        )
      ) : null}

      {/* SHOP & CAFE */}
      {!hubQuery.isLoading && !hubQuery.isError && section === "shop" ? (
        hub?.cafe_menu?.length || hub?.retail_products?.length ? (
          <View style={{ gap: 16 }}>
            {hub?.cafe_menu?.length ? (
              <View style={{ gap: 8 }}>
                <SectionHeader title="Cafe & Shake Bar" />
                {hub.cafe_menu.map((item) => (
                  <AppCard key={item.id} style={styles.shopRow}>
                    <View style={[styles.shopIcon, { backgroundColor: colors.primaryContainer }]}>
                      <Coffee size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>{item.name}</Text>
                      {item.description ? (
                        <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.price, { color: colors.primary }, TABULAR_NUMS]}>
                      Rs. {item.price.toLocaleString()}
                    </Text>
                  </AppCard>
                ))}
              </View>
            ) : null}

            {hub?.retail_products?.length ? (
              <View style={{ gap: 8 }}>
                <SectionHeader title="Retail Store" />
                {hub.retail_products.map((item) => (
                  <AppCard key={item.id} style={styles.shopRow}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.shopImg} />
                    ) : (
                      <View style={[styles.shopIcon, { backgroundColor: colors.surfaceVariant }]}>
                        <Package size={18} color={colors.textMuted} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }]}>
                        {item.stock > 0 ? `${item.stock} in stock` : "Ask at counter"}
                      </Text>
                    </View>
                    <Text style={[styles.price, { color: colors.primary }, TABULAR_NUMS]}>
                      Rs. {item.price.toLocaleString()}
                    </Text>
                  </AppCard>
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <EmptyStateCard
            icon={<Coffee size={26} color={colors.textMuted} />}
            title="Shop & Cafe empty"
            description="Supplements, merchandise, and protein shakes will appear here once listed."
          />
        )
      ) : null}

      {/* NOTICES */}
      {!hubQuery.isLoading && !hubQuery.isError && section === "notices" ? (
        hub?.announcements?.length ? (
          <View style={{ gap: 10 }}>
            {hub.announcements.map((a) => (
              <AppCard key={a.id} style={{ gap: 6 }}>
                <View style={styles.rowBetween}>
                  <StatusPill
                    label={a.category.toUpperCase()}
                    tone={a.category === "offer" ? "primary" : "neutral"}
                  />
                  {a.is_pinned ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Pin size={12} color={colors.warning} />
                      <Text style={{ fontFamily: FONT.semibold, fontSize: 11, color: colors.warning }}>
                        Pinned
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>{a.title}</Text>
                <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]}>{a.body}</Text>
              </AppCard>
            ))}
          </View>
        ) : (
          <EmptyStateCard
            icon={<Megaphone size={26} color={colors.textMuted} />}
            title="No gym notices"
            description="Holiday schedules, events, and member offers will appear here."
          />
        )
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: SPACING.md,
    gap: 16,
    paddingBottom: SPACING.xl,
  },
  banner: {
    width: "100%",
    height: 132,
    borderRadius: RADIUS.md,
  },
  gymHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: "#FFFFFF",
  },
  logoFallback: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontFamily: FONT.extrabold,
    fontSize: 22,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  contactRow: {
    flexDirection: "row",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontFamily: FONT.semibold,
    fontSize: 12.5,
  },
  trainerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  trainerPhoto: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  msgBubble: {
    maxWidth: "84%",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  price: {
    fontFamily: FONT.extrabold,
    fontSize: 15,
  },
  shopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  shopIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  shopImg: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
  },
});

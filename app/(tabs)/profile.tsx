import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  Camera,
  Check,
  ChevronRight,
  HeartPulse,
  Lock,
  LogOut,
  Moon,
  Play,
  Shield,
  Sun,
  User,
  Utensils,
} from "../../src/components/ui/Icons";
import { GymSoraLogo } from "../../src/components/GymSoraLogo";
import {
  AppButton,
  AppCard,
  AppInput,
  BottomSheetModal,
  SectionHeader,
  StatusPill,
} from "../../src/components/ui/Primitives";
import { ApiError } from "../../src/services/api";
import { memberApi } from "../../src/services/endpoints";
import {
  DEFAULT_PERSONAL_SETTINGS,
  localDb,
  type PersonalSettings,
} from "../../src/services/localDb";
import { queryKeys } from "../../src/services/queryClient";
import { useAuth } from "../../src/store/authStore";
import { type ThemePreference, useGymTheme } from "../../src/theme/GymThemeProvider";
import {
  BRAND,
  FONT,
  RADIUS,
  SPACING,
  TABULAR_NUMS,
  TYPOGRAPHY,
} from "../../src/theme/tokens";

const FITNESS_FOCUSES: PersonalSettings["fitnessFocus"][] = [
  "Strength",
  "Hypertrophy",
  "Fat Loss",
  "Endurance",
  "General Fitness",
];
const LEVELS: PersonalSettings["experienceLevel"][] = ["Beginner", "Intermediate", "Advanced"];

export default function ProfileScreen() {
  const { colors, preference, setPreference } = useGymTheme();
  const { member, activeGym, gyms, subscription, updateMember, switchGym, logout } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const slug = activeGym?.slug || "default";

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [name, setName] = useState(member?.name || "");
  const [phone, setPhone] = useState(member?.phone || "");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [switchingSlug, setSwitchingSlug] = useState<string | null>(null);

  // On-device settings (emergency contact, fitness prefs, notification prefs)
  const [settings, setSettings] = useState<PersonalSettings>(DEFAULT_PERSONAL_SETTINGS);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [emName, setEmName] = useState("");
  const [emPhone, setEmPhone] = useState("");

  useEffect(() => {
    localDb.loadPersonalSettings(slug).then((saved) => {
      if (saved) {
        setSettings({ ...DEFAULT_PERSONAL_SETTINGS, ...saved });
        setEmName(saved.emergencyContactName || "");
        setEmPhone(saved.emergencyContactPhone || "");
      }
    });
    if (activeGym?.slug) {
      memberApi
        .preferences()
        .then((p) => {
          const merged: PersonalSettings = {
            emergencyContactName: p.emergency_contact_name || "",
            emergencyContactPhone: p.emergency_contact_phone || "",
            fitnessFocus: (p.fitness_focus as PersonalSettings["fitnessFocus"]) || "General Fitness",
            experienceLevel:
              (p.experience_level as PersonalSettings["experienceLevel"]) || "Intermediate",
            biometricLockEnabled: Boolean(p.biometric_lock_enabled),
            notifications: {
              ...DEFAULT_PERSONAL_SETTINGS.notifications,
              ...(p.notification_prefs || {}),
            },
          };
          setSettings(merged);
          setEmName(merged.emergencyContactName);
          setEmPhone(merged.emergencyContactPhone);
          void localDb.savePersonalSettings(slug, merged);
        })
        .catch(() => undefined);
    }
  }, [slug, activeGym?.slug]);

  const updateSettings = async (next: PersonalSettings) => {
    setSettings(next);
    await localDb.savePersonalSettings(slug, next);
    memberApi
      .updatePreferences({
        emergency_contact_name: next.emergencyContactName,
        emergency_contact_phone: next.emergencyContactPhone,
        fitness_focus: next.fitnessFocus,
        experience_level: next.experienceLevel,
        biometric_lock_enabled: next.biometricLockEnabled,
        notification_prefs: next.notifications as unknown as Record<string, boolean>,
      })
      .catch(() => undefined);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await memberApi.profile();
      await updateMember(res.member);
    } catch {
      /* ignore offline */
    } finally {
      setRefreshing(false);
    }
  };

  const handlePickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo library access to update your profile photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.78,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    setSaving(true);
    try {
      const res = await memberApi.updateProfile({ photoUri: result.assets[0].uri });
      await updateMember(res.member);
      void qc.invalidateQueries({ queryKey: queryKeys.home(activeGym?.slug) });
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert("Profile Updated", "Your profile photo has been updated.");
    } catch (err: any) {
      Alert.alert("Upload failed", err instanceof ApiError ? err.message : "Could not upload photo.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Please enter your full name.");
      return;
    }
    setSaving(true);
    try {
      const res = await memberApi.updateProfile({ name: name.trim(), phone: phone.trim() });
      await updateMember(res.member);
      setEditModalOpen(false);
      void qc.invalidateQueries({ queryKey: queryKeys.home(activeGym?.slug) });
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      Alert.alert("Save failed", err instanceof ApiError ? err.message : "Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmergency = async () => {
    await updateSettings({
      ...settings,
      emergencyContactName: emName.trim(),
      emergencyContactPhone: emPhone.trim(),
    });
    setEmergencyModalOpen(false);
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleSwitchGym = async (targetSlug: string) => {
    if (targetSlug === activeGym?.slug) return;
    setSwitchingSlug(targetSlug);
    try {
      await switchGym(targetSlug);
      qc.clear();
    } catch (err: any) {
      Alert.alert("Switch failed", err instanceof ApiError ? err.message : "Could not switch gym.");
    } finally {
      setSwitchingSlug(null);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Log out of GymSora?",
      "You will need an internet connection to sign back in and regenerate your offline QR pass.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            qc.clear();
            router.replace("/(auth)/login");
          },
        },
      ],
    );
  };

  const initials = (member?.name || "M")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View>
          <Text style={[TYPOGRAPHY.label, { color: colors.primary }]}>ACCOUNT & SETTINGS</Text>
          <Text style={[TYPOGRAPHY.h1, { color: colors.text }]}>Profile</Text>
        </View>

        {/* Hero Identity Card */}
        <AppCard variant="elevated" style={{ gap: 14 }}>
          <View style={styles.profileTop}>
            <Pressable
              onPress={handlePickPhoto}
              accessibilityRole="button"
              accessibilityLabel="Update profile picture"
              style={styles.avatarWrap}
            >
              {member?.photo ? (
                <Image source={{ uri: member.photo }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: colors.primaryContainer }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
                </View>
              )}
              <View style={[styles.camBadge, { backgroundColor: colors.primary }]}>
                <Camera size={13} color="#FFFFFF" />
              </View>
            </Pressable>

            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[TYPOGRAPHY.h3, { color: colors.text }]} numberOfLines={1}>
                {member?.name || "Member"}
              </Text>
              <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                {member?.email}
              </Text>
              <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }, TABULAR_NUMS]}>
                {member?.phone || "No phone"} · ID #{member?.id ?? "—"}
              </Text>
            </View>
          </View>

          <View style={styles.metaFooter}>
            <StatusPill
              label={subscription?.is_allowed ? "ACTIVE MEMBER" : (member?.status || "PENDING").toUpperCase()}
              tone={subscription?.is_allowed ? "success" : "warning"}
            />
            <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }, TABULAR_NUMS]}>
              Joined {member?.joined_at || "—"}
            </Text>
          </View>

          <AppButton
            label="Edit Personal Info"
            variant="outline"
            size="sm"
            icon={<User size={15} color={colors.text} />}
            onPress={() => {
              setName(member?.name || "");
              setPhone(member?.phone || "");
              setEditModalOpen(true);
            }}
          />
        </AppCard>

        {/* Quick Navigation Directory */}
        <AppCard padding="none" style={{ overflow: "hidden" }}>
          {[
            {
              key: "gym",
              label: "My Gym, Trainers & Shop",
              sub: activeGym?.name || "Directory, coaches & cafe",
              icon: Building2,
              tint: colors.primary,
              onPress: () => router.push("/gym-hub"),
            },
            {
              key: "notif",
              label: "Notifications Center",
              sub: "Announcements, expiry & alert settings",
              icon: Bell,
              tint: colors.warning,
              onPress: () => router.push("/notifications"),
            },
            {
              key: "nutrition",
              label: "Nutrition & Hydration",
              sub: "Daily macros, meals & water tracker",
              icon: Utensils,
              tint: colors.success,
              onPress: () => router.push("/nutrition"),
            },
            {
              key: "emergency",
              label: "Emergency Contact",
              sub: settings.emergencyContactName
                ? `${settings.emergencyContactName} · ${settings.emergencyContactPhone}`
                : "Add emergency contact",
              icon: HeartPulse,
              tint: colors.error,
              onPress: () => setEmergencyModalOpen(true),
            },
            {
              key: "intro",
              label: "Watch GymSora Intro",
              sub: "Replay the welcome experience",
              icon: Play,
              tint: colors.primary,
              onPress: () =>
                router.push({ pathname: "/(auth)/onboarding", params: { replay: "1" } }),
            },
          ].map((row, idx, arr) => {
            const Icon = row.icon;
            return (
              <Pressable
                key={row.key}
                onPress={row.onPress}
                android_ripple={{ color: colors.ripple }}
                style={[
                  styles.menuRow,
                  idx < arr.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.borderSubtle,
                  },
                ]}
              >
                <View style={[styles.menuIcon, { backgroundColor: colors.surfaceVariant }]}>
                  <Icon size={18} color={row.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>{row.label}</Text>
                  <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }]} numberOfLines={1}>
                    {row.sub}
                  </Text>
                </View>
                <ChevronRight size={17} color={colors.textMuted} />
              </Pressable>
            );
          })}
        </AppCard>

        {/* Multi-Gym Switcher (only if member belongs to >1 gym) */}
        {gyms.length > 1 ? (
          <View>
            <SectionHeader title="Your Gyms" subtitle="Switch active membership club" />
            <View style={{ gap: 8 }}>
              {gyms.map((g) => {
                const isCurrent = g.slug === activeGym?.slug;
                return (
                  <Pressable
                    key={g.slug}
                    onPress={() => handleSwitchGym(g.slug)}
                    disabled={switchingSlug !== null}
                  >
                    <AppCard
                      variant={isCurrent ? "accent" : "default"}
                      style={styles.gymRow}
                    >
                      <Building2 size={18} color={isCurrent ? colors.primary : colors.textMuted} />
                      <View style={{ flex: 1 }}>
                        <Text style={[TYPOGRAPHY.title, { color: colors.text }]}>{g.name}</Text>
                        <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }]}>{g.slug}</Text>
                      </View>
                      {isCurrent ? (
                        <Check size={18} color={colors.primary} />
                      ) : switchingSlug === g.slug ? (
                        <Text style={{ color: colors.primary, fontFamily: FONT.bold, fontSize: 12 }}>
                          Switching…
                        </Text>
                      ) : null}
                    </AppCard>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Fitness Preferences */}
        <AppCard style={{ gap: 12 }}>
          <Text style={[TYPOGRAPHY.h3, { color: colors.text }]}>Fitness Preferences</Text>
          <View style={{ gap: 6 }}>
            <Text style={[TYPOGRAPHY.label, { color: colors.textMuted }]}>PRIMARY FOCUS</Text>
            <View style={styles.chipWrap}>
              {FITNESS_FOCUSES.map((focus) => {
                const active = settings.fitnessFocus === focus;
                return (
                  <Pressable
                    key={focus}
                    onPress={() => void updateSettings({ ...settings, fitnessFocus: focus })}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.surfaceVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? "#FFFFFF" : colors.textSecondary },
                      ]}
                    >
                      {focus}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={[TYPOGRAPHY.label, { color: colors.textMuted }]}>EXPERIENCE LEVEL</Text>
            <View style={styles.chipWrap}>
              {LEVELS.map((lvl) => {
                const active = settings.experienceLevel === lvl;
                return (
                  <Pressable
                    key={lvl}
                    onPress={() => void updateSettings({ ...settings, experienceLevel: lvl })}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.surfaceVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? "#FFFFFF" : colors.textSecondary },
                      ]}
                    >
                      {lvl}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </AppCard>

        {/* Appearance Theme Switcher */}
        <AppCard style={{ gap: 10 }}>
          <Text style={[TYPOGRAPHY.h3, { color: colors.text }]}>Appearance</Text>
          <View style={styles.themeRow}>
            {(
              [
                { key: "dark", label: "Dark", icon: Moon },
                { key: "light", label: "Light", icon: Sun },
                { key: "system", label: "Auto", icon: Check },
              ] as Array<{ key: ThemePreference; label: string; icon: any }>
            ).map((opt) => {
              const active = preference === opt.key;
              const Icon = opt.icon;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setPreference(opt.key)}
                  style={[
                    styles.themeBtn,
                    {
                      backgroundColor: active ? colors.primary : colors.surfaceVariant,
                    },
                  ]}
                >
                  <Icon size={15} color={active ? "#FFFFFF" : colors.textSecondary} />
                  <Text
                    style={[
                      styles.themeText,
                      { color: active ? "#FFFFFF" : colors.textSecondary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </AppCard>

        {/* Privacy & Security */}
        <AppCard style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Shield size={18} color={colors.success} />
            <Text style={[TYPOGRAPHY.h3, { color: colors.text }]}>Privacy & Security</Text>
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={[TYPOGRAPHY.bodyMedium, { color: colors.text }]}>
                App Lock Preference
              </Text>
              <Text style={[TYPOGRAPHY.caption, { color: colors.textMuted }]}>
                Biometric prompt requires native `expo-local-authentication` module in production build.
              </Text>
            </View>
            <Switch
              value={settings.biometricLockEnabled}
              onValueChange={(v) =>
                void updateSettings({ ...settings, biometricLockEnabled: v })
              }
              trackColor={{ false: colors.surfaceVariant, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.securityPill, { backgroundColor: colors.surfaceVariant }]}>
            <Lock size={14} color={colors.success} />
            <Text style={[TYPOGRAPHY.caption, { color: colors.textSecondary, flex: 1 }]}>
              Session tokens & QR signing key are isolated inside Android Keystore / iOS Keychain.
            </Text>
          </View>
        </AppCard>

        {/* Sign Out */}
        <AppButton
          label="Log Out"
          variant="danger"
          onPress={handleLogout}
          icon={<LogOut size={17} color="#FFFFFF" />}
        />

        <View style={{ alignItems: "center", paddingTop: 8, opacity: 0.8 }}>
          <GymSoraLogo size="sm" />
        </View>
      </ScrollView>

      {/* Edit Personal Info Modal */}
      <BottomSheetModal
        visible={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Personal Details"
        subtitle="Synced directly with your gym profile"
      >
        <View style={{ gap: 12 }}>
          <AppInput
            label="Full Name *"
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
          />
          <AppInput
            label="Phone Number *"
            value={phone}
            onChangeText={setPhone}
            placeholder="e.g. 98XXXXXXXX"
            keyboardType="phone-pad"
          />
          <AppButton
            label="Save Changes"
            loading={saving}
            onPress={() => void handleSaveProfile()}
          />
        </View>
      </BottomSheetModal>

      {/* Emergency Contact Modal */}
      <BottomSheetModal
        visible={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
        title="Emergency Contact"
        subtitle="Stored privately on this device for quick reference"
      >
        <View style={{ gap: 12 }}>
          <AppInput
            label="Contact Name"
            value={emName}
            onChangeText={setEmName}
            placeholder="e.g. Family member or friend"
          />
          <AppInput
            label="Contact Phone"
            value={emPhone}
            onChangeText={setEmPhone}
            placeholder="Phone number"
            keyboardType="phone-pad"
          />
          <AppButton label="Save Contact" onPress={() => void handleSaveEmergency()} />
        </View>
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
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarWrap: {
    position: "relative",
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: RADIUS.pill,
    borderWidth: 2,
    borderColor: BRAND.orange,
  },
  avatarFallback: {
    width: 68,
    height: 68,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(230, 126, 34, 0.4)",
  },
  avatarText: {
    fontFamily: FONT.extrabold,
    fontSize: 22,
  },
  camBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  metaFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  gymRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
  },
  chipText: {
    fontFamily: FONT.semibold,
    fontSize: 12,
  },
  themeRow: {
    flexDirection: "row",
    gap: 8,
  },
  themeBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: RADIUS.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  themeText: {
    fontFamily: FONT.semibold,
    fontSize: 12.5,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  securityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: RADIUS.sm,
  },
});

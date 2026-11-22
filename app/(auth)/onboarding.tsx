import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeInUp,
  useReducedMotion,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { ArrowRight, Dumbbell, QrCode, TrendingUp } from "../../src/components/ui/Icons";
import { GymSoraLogo } from "../../src/components/GymSoraLogo";
import { AppButton } from "../../src/components/ui/Primitives";
import { cacheStorage } from "../../src/services/storage";
import { useAuth } from "../../src/store/authStore";
import { BRAND, FONT, RADIUS, SPACING } from "../../src/theme/tokens";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const SLIDES = [
  {
    key: "strength",
    eyebrow: "TRAIN WITH PRECISION",
    title: "Every Set, Rep & PR Tracked.",
    subtitle:
      "Run live workouts with an interactive rest timer, curated exercise library, and automatic personal record tracking.",
    image: require("../../assets/images/intro-strength.jpg"),
    icon: Dumbbell,
  },
  {
    key: "pass",
    eyebrow: "SEAMLESS CLUB ACCESS",
    title: "Instant QR Check-In, Even Offline.",
    subtitle:
      "Flash your encrypted rotating pass or scan your gym's reception QR code. Track streaks, attendance, and membership receipts.",
    image: require("../../assets/images/intro-pass.jpg"),
    icon: QrCode,
  },
  {
    key: "progress",
    eyebrow: "BUILT FOR RESULTS",
    title: "Watch Your Body & Habits Transform.",
    subtitle:
      "Chart weight, BMI, body measurements, progress photos, daily nutrition, hydration, and real milestone badges.",
    image: require("../../assets/images/intro-progress.jpg"),
    icon: TrendingUp,
  },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const params = useLocalSearchParams<{ replay?: string }>();
  const reduced = useReducedMotion();

  const listRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const finishIntro = async () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await cacheStorage.setJson(cacheStorage.keys.ONBOARDING_SEEN, true);
    if (params.replay === "1" || isAuthenticated) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)");
      }
    } else {
      router.replace("/(auth)/login");
    }
  };

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      if (Platform.OS !== "web") {
        void Haptics.selectionAsync();
      }
      const nextIdx = activeIndex + 1;
      setActiveIndex(nextIdx);
      listRef.current?.scrollToIndex({ index: nextIdx, animated: !reduced });
    } else {
      void finishIntro();
    }
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, SCREEN_W));
    if (idx !== activeIndex && idx >= 0 && idx < SLIDES.length) {
      setActiveIndex(idx);
    }
  };

  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={styles.root}>
      {/* Full-Bleed Swipeable Editorial Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => {
          const Icon = item.icon;
          return (
            <View style={styles.slide}>
              <Image source={item.image} style={styles.bgPhoto} resizeMode="cover" />

              {/* Smooth Dark Gradient Vignette (top subtle + bottom rich obsidian fade) */}
              <Svg
                style={StyleSheet.absoluteFill}
                width={SCREEN_W}
                height={SCREEN_H}
                preserveAspectRatio="none"
                viewBox="0 0 100 100"
              >
                <Defs>
                  <LinearGradient id={`vig-${item.key}`} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#09090B" stopOpacity="0.62" />
                    <Stop offset="34%" stopColor="#09090B" stopOpacity="0.16" />
                    <Stop offset="58%" stopColor="#09090B" stopOpacity="0.68" />
                    <Stop offset="80%" stopColor="#09090B" stopOpacity="0.96" />
                    <Stop offset="100%" stopColor="#09090B" stopOpacity="1" />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100" height="100" fill={`url(#vig-${item.key})`} />
              </Svg>

              {/* Editorial Copy Block */}
              <View style={styles.copyOverlay}>
                <Animated.View
                  entering={reduced ? undefined : FadeInDown.duration(420)}
                  style={styles.eyebrowPill}
                >
                  <Icon size={13} color={BRAND.orange} />
                  <Text style={styles.eyebrowText}>{item.eyebrow}</Text>
                </Animated.View>

                <Animated.Text
                  entering={reduced ? undefined : FadeInDown.delay(70).duration(450)}
                  style={styles.slideTitle}
                >
                  {item.title}
                </Animated.Text>

                <Animated.Text
                  entering={reduced ? undefined : FadeInUp.delay(140).duration(450)}
                  style={styles.slideSub}
                >
                  {item.subtitle}
                </Animated.Text>
              </View>
            </View>
          );
        }}
      />

      {/* Top Overlay: Official GymSora Company Logo + Skip */}
      <SafeAreaView style={styles.topOverlay} edges={["top"]} pointerEvents="box-none">
        <Animated.View
          entering={reduced ? undefined : FadeInDown.duration(500)}
          style={styles.topBar}
        >
          <GymSoraLogo size="sm" forceDark />
          <Pressable
            onPress={() => void finishIntro()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Skip intro"
            style={styles.skipBtn}
          >
            <Text style={styles.skipText}>
              {params.replay === "1" ? "Close" : "Skip"}
            </Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>

      {/* Bottom Controls: Progress Dots + Primary CTA */}
      <SafeAreaView style={styles.bottomOverlay} edges={["bottom"]} pointerEvents="box-none">
        <View style={styles.controls}>
          <View style={styles.dotsRow}>
            {SLIDES.map((s, idx) => {
              const active = idx === activeIndex;
              return (
                <Pressable
                  key={s.key}
                  onPress={() => {
                    setActiveIndex(idx);
                    listRef.current?.scrollToIndex({ index: idx, animated: !reduced });
                  }}
                  style={[
                    styles.dot,
                    active ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              );
            })}
          </View>

          <AppButton
            label={isLast ? (isAuthenticated ? "Back to GymSora" : "Get Started") : "Continue"}
            size="lg"
            onPress={handleNext}
            rightIcon={<ArrowRight size={18} color="#FFFFFF" />}
            style={{ width: "100%" }}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#09090B",
  },
  slide: {
    width: SCREEN_W,
    height: SCREEN_H,
    position: "relative",
    backgroundColor: "#09090B",
  },
  bgPhoto: {
    width: SCREEN_W,
    height: SCREEN_H,
    position: "absolute",
    top: 0,
    left: 0,
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingTop: 6,
  },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: "rgba(9, 9, 11, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
  },
  skipText: {
    fontFamily: FONT.semibold,
    fontSize: 12.5,
    color: "#E4E4E7",
  },
  copyOverlay: {
    position: "absolute",
    left: SPACING.lg,
    right: SPACING.lg,
    bottom: 164,
    gap: 10,
  },
  eyebrowPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: "rgba(230, 126, 34, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(230, 126, 34, 0.42)",
  },
  eyebrowText: {
    fontFamily: FONT.bold,
    fontSize: 10.5,
    letterSpacing: 1.1,
    color: "#F5A65B",
  },
  slideTitle: {
    fontFamily: FONT.extrabold,
    fontSize: 31,
    lineHeight: 37,
    letterSpacing: -0.6,
    color: "#FFFFFF",
  },
  slideSub: {
    fontFamily: FONT.regular,
    fontSize: 14.5,
    lineHeight: 22,
    color: "#D4D4D8",
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  controls: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: 18,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 28,
    backgroundColor: BRAND.orange,
  },
  dotInactive: {
    width: 8,
    backgroundColor: "rgba(255, 255, 255, 0.28)",
  },
});

/**
 * Curated Gymsora Exercise Reference Library & Starter Templates.
 * Static exercise reference data (like Strong / Nike Training Club catalog)
 * so members can browse proper exercise mechanics offline and add movements
 * directly into live workout sessions saved to `/api/member/workouts/`.
 */

export type MuscleGroup =
  | "Chest"
  | "Back"
  | "Legs"
  | "Shoulders"
  | "Arms"
  | "Core"
  | "Cardio"
  | "Mobility";

export type DifficultyLevel = "Beginner" | "Intermediate" | "Advanced";

export interface LibraryExercise {
  id: string;
  name: string;
  category: "strength" | "cardio" | "hiit" | "mobility";
  muscleGroup: MuscleGroup;
  secondaryMuscles: string[];
  equipment: string;
  difficulty: DifficultyLevel;
  defaultSets: number;
  defaultReps: number;
  restSeconds: number;
  instructions: string[];
}

export interface StarterRoutine {
  id: string;
  title: string;
  category: "strength" | "cardio" | "hiit" | "mobility";
  estimatedMinutes: number;
  focus: string;
  difficulty: DifficultyLevel;
  exerciseIds: string[];
}

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "Chest",
  "Back",
  "Legs",
  "Shoulders",
  "Arms",
  "Core",
  "Cardio",
  "Mobility",
];

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  // CHEST
  {
    id: "barbell-bench-press",
    name: "Barbell Bench Press",
    category: "strength",
    muscleGroup: "Chest",
    secondaryMuscles: ["Triceps", "Front Delts"],
    equipment: "Barbell & Flat Bench",
    difficulty: "Intermediate",
    defaultSets: 4,
    defaultReps: 8,
    restSeconds: 120,
    instructions: [
      "Lie flat with eyes under the bar, feet planted firmly and shoulder blades pinched together.",
      "Grip slightly wider than shoulder width and unrack with stacked wrists.",
      "Lower the bar under control to mid-chest with elbows tucked ~45 degrees.",
      "Drive the bar back up powerfully while keeping glutes and upper back anchored.",
    ],
  },
  {
    id: "incline-db-press",
    name: "Incline Dumbbell Press",
    category: "strength",
    muscleGroup: "Chest",
    secondaryMuscles: ["Upper Chest", "Shoulders", "Triceps"],
    equipment: "Dumbbells & Incline Bench",
    difficulty: "Beginner",
    defaultSets: 3,
    defaultReps: 10,
    restSeconds: 90,
    instructions: [
      "Set bench to a 30-degree incline and hold dumbbells at shoulder height.",
      "Press dumbbells upward until arms are extended without clanking weights.",
      "Lower slowly for 2–3 seconds until elbows dip slightly below chest level.",
    ],
  },
  {
    id: "cable-chest-fly",
    name: "Cable Chest Fly",
    category: "strength",
    muscleGroup: "Chest",
    secondaryMuscles: ["Front Delts"],
    equipment: "Cable Machine",
    difficulty: "Beginner",
    defaultSets: 3,
    defaultReps: 12,
    restSeconds: 60,
    instructions: [
      "Set pulleys at chest height, step forward into a staggered stance.",
      "Keep a slight soft bend in your elbows as you sweep handles together in front of your sternum.",
      "Squeeze chest for 1 second, then return under control until you feel a deep stretch.",
    ],
  },
  {
    id: "push-ups",
    name: "Push-Ups",
    category: "strength",
    muscleGroup: "Chest",
    secondaryMuscles: ["Triceps", "Core"],
    equipment: "Bodyweight",
    difficulty: "Beginner",
    defaultSets: 3,
    defaultReps: 15,
    restSeconds: 60,
    instructions: [
      "Start in a rigid high plank with hands slightly wider than shoulders.",
      "Brace your core and lower chest toward the floor with elbows at ~45 degrees.",
      "Press back to full arm extension without letting hips sag.",
    ],
  },

  // BACK
  {
    id: "pull-ups",
    name: "Pull-Ups",
    category: "strength",
    muscleGroup: "Back",
    secondaryMuscles: ["Lats", "Biceps", "Upper Back"],
    equipment: "Pull-Up Bar",
    difficulty: "Intermediate",
    defaultSets: 4,
    defaultReps: 8,
    restSeconds: 120,
    instructions: [
      "Grip bar slightly wider than shoulder width with palms facing away.",
      "Depress shoulder blades first, then drive elbows down toward your ribs.",
      "Bring chin cleanly over the bar, pause briefly, and lower to a full controlled hang.",
    ],
  },
  {
    id: "barbell-bent-over-row",
    name: "Barbell Bent-Over Row",
    category: "strength",
    muscleGroup: "Back",
    secondaryMuscles: ["Rhomboids", "Rear Delts", "Biceps"],
    equipment: "Barbell",
    difficulty: "Intermediate",
    defaultSets: 4,
    defaultReps: 8,
    restSeconds: 90,
    instructions: [
      "Hinge at the hips to ~45 degrees with a neutral braced spine.",
      "Pull the barbell toward your lower ribcage while squeezing shoulder blades together.",
      "Lower under control without rounding your lower back.",
    ],
  },
  {
    id: "lat-pulldown",
    name: "Lat Pulldown",
    category: "strength",
    muscleGroup: "Back",
    secondaryMuscles: ["Biceps", "Rear Delts"],
    equipment: "Cable Lat Machine",
    difficulty: "Beginner",
    defaultSets: 3,
    defaultReps: 12,
    restSeconds: 75,
    instructions: [
      "Lock thighs under pad and grip the bar wide with a light lean back.",
      "Pull the bar smoothly to upper chest while driving elbows downward.",
      "Control the ascent to a full overhead lat stretch.",
    ],
  },
  {
    id: "seated-cable-row",
    name: "Seated Cable Row",
    category: "strength",
    muscleGroup: "Back",
    secondaryMuscles: ["Mid Back", "Biceps"],
    equipment: "Cable Row Machine",
    difficulty: "Beginner",
    defaultSets: 3,
    defaultReps: 12,
    restSeconds: 75,
    instructions: [
      "Sit tall with knees slightly bent and chest proud.",
      "Draw handle toward your midsection, pulling elbows past your torso.",
      "Pause for a full contraction, then extend arms smoothly forward.",
    ],
  },
  {
    id: "conventional-deadlift",
    name: "Conventional Deadlift",
    category: "strength",
    muscleGroup: "Back",
    secondaryMuscles: ["Hamstrings", "Glutes", "Core"],
    equipment: "Barbell",
    difficulty: "Advanced",
    defaultSets: 3,
    defaultReps: 5,
    restSeconds: 150,
    instructions: [
      "Stand with mid-foot directly under the bar and hip-width stance.",
      "Hinge down, grip just outside shins, pull slack out of the bar with lats tight.",
      "Push the floor away with your legs and lock hips cleanly at the top without hyperextending.",
    ],
  },

  // LEGS
  {
    id: "barbell-back-squat",
    name: "Barbell Back Squat",
    category: "strength",
    muscleGroup: "Legs",
    secondaryMuscles: ["Quads", "Glutes", "Core"],
    equipment: "Barbell & Squat Rack",
    difficulty: "Intermediate",
    defaultSets: 4,
    defaultReps: 6,
    restSeconds: 150,
    instructions: [
      "Rest bar firmly across upper traps, brace your core and unrack.",
      "Sit down between your hips, tracking knees over toes until thighs reach parallel or below.",
      "Drive powerfully upward through mid-foot while keeping chest tall.",
    ],
  },
  {
    id: "romanian-deadlift",
    name: "Romanian Deadlift (RDL)",
    category: "strength",
    muscleGroup: "Legs",
    secondaryMuscles: ["Hamstrings", "Glutes", "Lower Back"],
    equipment: "Barbell or Dumbbells",
    difficulty: "Intermediate",
    defaultSets: 3,
    defaultReps: 10,
    restSeconds: 90,
    instructions: [
      "Hold weight at hip height with soft knees and shoulders pulled back.",
      "Push hips backward while keeping the bar gliding close along thighs and shins.",
      "Stop when hamstrings reach full stretch (mid-shin) and drive hips forward to stand.",
    ],
  },
  {
    id: "leg-press",
    name: "45° Leg Press",
    category: "strength",
    muscleGroup: "Legs",
    secondaryMuscles: ["Quads", "Glutes"],
    equipment: "Leg Press Machine",
    difficulty: "Beginner",
    defaultSets: 3,
    defaultReps: 12,
    restSeconds: 90,
    instructions: [
      "Plant feet shoulder-width on the sled and keep lower back glued to the pad.",
      "Lower sled until knees approach 90 degrees without hips curling up.",
      "Press through full foot stopping just shy of locking knees out.",
    ],
  },
  {
    id: "bulgarian-split-squat",
    name: "Bulgarian Split Squat",
    category: "strength",
    muscleGroup: "Legs",
    secondaryMuscles: ["Quads", "Glutes", "Balance"],
    equipment: "Dumbbells & Bench",
    difficulty: "Intermediate",
    defaultSets: 3,
    defaultReps: 10,
    restSeconds: 90,
    instructions: [
      "Place rear foot laces-down on a bench behind you with front foot planted forward.",
      "Lower back knee toward the ground with a slight forward torso lean.",
      "Drive smoothly through the front heel to return to standing.",
    ],
  },
  {
    id: "standing-calf-raise",
    name: "Standing Calf Raise",
    category: "strength",
    muscleGroup: "Legs",
    secondaryMuscles: ["Calves"],
    equipment: "Calf Machine or Step",
    difficulty: "Beginner",
    defaultSets: 4,
    defaultReps: 15,
    restSeconds: 45,
    instructions: [
      "Stand with balls of feet on edge of platform and lower heels into a deep stretch.",
      "Press up onto toes as high as possible and pause 1 second at the top.",
      "Lower slowly over 2–3 seconds without bouncing.",
    ],
  },

  // SHOULDERS
  {
    id: "overhead-press",
    name: "Overhead Barbell Press",
    category: "strength",
    muscleGroup: "Shoulders",
    secondaryMuscles: ["Triceps", "Upper Chest", "Core"],
    equipment: "Barbell",
    difficulty: "Intermediate",
    defaultSets: 4,
    defaultReps: 6,
    restSeconds: 120,
    instructions: [
      "Start with bar resting on front delts, forearms vertical and glutes squeezed.",
      "Press straight overhead, tucking chin slightly until bar clears your face.",
      "Lock out directly over mid-foot and lower under control.",
    ],
  },
  {
    id: "db-lateral-raise",
    name: "Dumbbell Lateral Raise",
    category: "strength",
    muscleGroup: "Shoulders",
    secondaryMuscles: ["Side Delts", "Upper Traps"],
    equipment: "Dumbbells",
    difficulty: "Beginner",
    defaultSets: 4,
    defaultReps: 15,
    restSeconds: 60,
    instructions: [
      "Stand tall with dumbbells at your sides and a slight forward angle at the elbows.",
      "Raise arms out to the sides until parallel with the floor, leading with elbows.",
      "Lower smoothly without swinging your torso.",
    ],
  },
  {
    id: "face-pulls",
    name: "Cable Face Pulls",
    category: "strength",
    muscleGroup: "Shoulders",
    secondaryMuscles: ["Rear Delts", "Rotator Cuff", "Upper Back"],
    equipment: "Cable Rope",
    difficulty: "Beginner",
    defaultSets: 3,
    defaultReps: 15,
    restSeconds: 60,
    instructions: [
      "Set rope attachment at eye height and grab with thumbs pointing back.",
      "Pull rope apart toward your forehead while rotating wrists outward.",
      "Hold the rear-delt squeeze for a beat, then extend cleanly.",
    ],
  },

  // ARMS
  {
    id: "ez-bar-curl",
    name: "EZ-Bar Bicep Curl",
    category: "strength",
    muscleGroup: "Arms",
    secondaryMuscles: ["Biceps", "Forearms"],
    equipment: "EZ-Bar",
    difficulty: "Beginner",
    defaultSets: 3,
    defaultReps: 12,
    restSeconds: 60,
    instructions: [
      "Hold EZ-bar on the outer angled grips with elbows pinned near your ribs.",
      "Curl bar upward smoothly without swinging your hips.",
      "Lower over 2–3 seconds to full extension.",
    ],
  },
  {
    id: "hammer-curl",
    name: "Dumbbell Hammer Curl",
    category: "strength",
    muscleGroup: "Arms",
    secondaryMuscles: ["Brachialis", "Forearms"],
    equipment: "Dumbbells",
    difficulty: "Beginner",
    defaultSets: 3,
    defaultReps: 12,
    restSeconds: 60,
    instructions: [
      "Hold dumbbells with neutral palms-facing-in grip at your sides.",
      "Curl weights toward shoulders keeping wrists neutral and elbows steady.",
      "Control the descent on every rep.",
    ],
  },
  {
    id: "tricep-rope-pushdown",
    name: "Tricep Rope Pushdown",
    category: "strength",
    muscleGroup: "Arms",
    secondaryMuscles: ["Triceps"],
    equipment: "Cable Machine",
    difficulty: "Beginner",
    defaultSets: 3,
    defaultReps: 12,
    restSeconds: 60,
    instructions: [
      "Anchor elbows tight to your sides holding the rope attachment.",
      "Extend forearms downward and flare rope ends apart at the bottom.",
      "Return smoothly until forearms hit ~90 degrees.",
    ],
  },
  {
    id: "overhead-tricep-ext",
    name: "Overhead Cable Tricep Extension",
    category: "strength",
    muscleGroup: "Arms",
    secondaryMuscles: ["Long Head Triceps"],
    equipment: "Cable or Dumbbell",
    difficulty: "Intermediate",
    defaultSets: 3,
    defaultReps: 12,
    restSeconds: 60,
    instructions: [
      "Face away from a low cable holding the rope overhead with elbows high.",
      "Extend arms forward and up without letting elbows flare wide.",
      "Lower slowly behind head for a deep tricep stretch.",
    ],
  },

  // CORE
  {
    id: "plank-hold",
    name: "Forearm Plank",
    category: "strength",
    muscleGroup: "Core",
    secondaryMuscles: ["Abs", "Glutes", "Shoulders"],
    equipment: "Bodyweight",
    difficulty: "Beginner",
    defaultSets: 3,
    defaultReps: 60,
    restSeconds: 45,
    instructions: [
      "Rest forearms under shoulders, legs extended straight behind you.",
      "Tuck pelvis slightly, squeeze glutes, and pull ribs down toward hips.",
      "Breathe steadily while holding a straight line (reps = seconds).",
    ],
  },
  {
    id: "hanging-leg-raise",
    name: "Hanging Leg Raise",
    category: "strength",
    muscleGroup: "Core",
    secondaryMuscles: ["Lower Abs", "Hip Flexors", "Grip"],
    equipment: "Pull-Up Bar",
    difficulty: "Intermediate",
    defaultSets: 3,
    defaultReps: 12,
    restSeconds: 60,
    instructions: [
      "Hang with active shoulders to eliminate swinging.",
      "Curl pelvis upward as you raise legs to hip height or higher.",
      "Lower slowly without letting momentum take over.",
    ],
  },
  {
    id: "cable-woodchop",
    name: "Cable Woodchopper",
    category: "strength",
    muscleGroup: "Core",
    secondaryMuscles: ["Obliques", "Rotational Core"],
    equipment: "Cable Machine",
    difficulty: "Intermediate",
    defaultSets: 3,
    defaultReps: 12,
    restSeconds: 60,
    instructions: [
      "Set cable high, stand perpendicular, and hold handle with both hands.",
      "Rotate torso diagonally downward across your body pivoting your trail foot.",
      "Control the return back to the top; repeat on both sides.",
    ],
  },

  // CARDIO & HIIT
  {
    id: "treadmill-incline-walk",
    name: "Incline Treadmill Walk",
    category: "cardio",
    muscleGroup: "Cardio",
    secondaryMuscles: ["Glutes", "Calves", "Aerobic Base"],
    equipment: "Treadmill",
    difficulty: "Beginner",
    defaultSets: 1,
    defaultReps: 20,
    restSeconds: 30,
    instructions: [
      "Set incline between 8–12% and brisk walking pace (4.5–5.5 km/h).",
      "Walk without holding onto the front rail to maximize posture and burn.",
      "Maintain steady nasal or conversational breathing (reps = minutes).",
    ],
  },
  {
    id: "rowing-intervals",
    name: "Rowing Machine Intervals",
    category: "hiit",
    muscleGroup: "Cardio",
    secondaryMuscles: ["Full Body", "Back", "Legs"],
    equipment: "Rowing Ergometer",
    difficulty: "Intermediate",
    defaultSets: 6,
    defaultReps: 1,
    restSeconds: 60,
    instructions: [
      "Push forcefully through legs first, then lean back slightly and pull handle to lower ribs.",
      "Row 60s hard effort followed by 60s light recovery.",
      "Reverse sequence on recovery: arms, torso hinge, then bend knees.",
    ],
  },
  {
    id: "kettlebell-swings",
    name: "Kettlebell Swings",
    category: "hiit",
    muscleGroup: "Cardio",
    secondaryMuscles: ["Glutes", "Hamstrings", "Core"],
    equipment: "Kettlebell",
    difficulty: "Intermediate",
    defaultSets: 4,
    defaultReps: 20,
    restSeconds: 60,
    instructions: [
      "Hike kettlebell back between hips with a crisp hip hinge (not a squat).",
      "Snap hips forward explosively so bell floats to chest height.",
      "Keep arms relaxed like ropes and let hips absorb the downswing.",
    ],
  },
  {
    id: "jump-rope",
    name: "Jump Rope Conditioning",
    category: "hiit",
    muscleGroup: "Cardio",
    secondaryMuscles: ["Calves", "Coordination"],
    equipment: "Jump Rope",
    difficulty: "Beginner",
    defaultSets: 5,
    defaultReps: 60,
    restSeconds: 45,
    instructions: [
      "Keep elbows tucked close and turn rope from wrists.",
      "Jump lightly on balls of feet just 2–3 cm off the floor.",
      "Work 60s intervals (reps = seconds) with relaxed shoulders.",
    ],
  },

  // MOBILITY
  {
    id: "worlds-greatest-stretch",
    name: "World's Greatest Stretch",
    category: "mobility",
    muscleGroup: "Mobility",
    secondaryMuscles: ["Hips", "Thoracic Spine", "Hamstrings"],
    equipment: "Bodyweight / Mat",
    difficulty: "Beginner",
    defaultSets: 2,
    defaultReps: 8,
    restSeconds: 30,
    instructions: [
      "Step into a deep runner's lunge and place opposite hand on the floor.",
      "Rotate inside arm toward the ceiling, following your hand with your eyes.",
      "Drop elbow toward ankle, then shift hips back to stretch front hamstring.",
    ],
  },
  {
    id: "thoracic-openers",
    name: "Open-Book Thoracic Rotation",
    category: "mobility",
    muscleGroup: "Mobility",
    secondaryMuscles: ["Upper Back", "Chest", "Shoulders"],
    equipment: "Mat",
    difficulty: "Beginner",
    defaultSets: 2,
    defaultReps: 10,
    restSeconds: 30,
    instructions: [
      "Lie on your side with knees bent at 90 degrees stacked together.",
      "Sweep top arm across your chest to the opposite floor while keeping knees pinned.",
      "Exhale deeply at the open position for 2 seconds, then return.",
    ],
  },
];

export const STARTER_ROUTINES: StarterRoutine[] = [
  {
    id: "push-strength",
    title: "Push Power (Chest & Shoulders)",
    category: "strength",
    estimatedMinutes: 50,
    focus: "Chest · Shoulders · Triceps",
    difficulty: "Intermediate",
    exerciseIds: [
      "barbell-bench-press",
      "incline-db-press",
      "overhead-press",
      "db-lateral-raise",
      "tricep-rope-pushdown",
    ],
  },
  {
    id: "pull-hypertrophy",
    title: "Pull & Back Builder",
    category: "strength",
    estimatedMinutes: 50,
    focus: "Back · Rear Delts · Biceps",
    difficulty: "Intermediate",
    exerciseIds: [
      "pull-ups",
      "barbell-bent-over-row",
      "seated-cable-row",
      "face-pulls",
      "ez-bar-curl",
    ],
  },
  {
    id: "leg-day",
    title: "Lower Body Strength",
    category: "strength",
    estimatedMinutes: 55,
    focus: "Quads · Hamstrings · Glutes",
    difficulty: "Intermediate",
    exerciseIds: [
      "barbell-back-squat",
      "romanian-deadlift",
      "bulgarian-split-squat",
      "leg-press",
      "standing-calf-raise",
    ],
  },
  {
    id: "hiit-conditioning",
    title: "HIIT Conditioning & Core",
    category: "hiit",
    estimatedMinutes: 30,
    focus: "Cardio · Core · Conditioning",
    difficulty: "Beginner",
    exerciseIds: [
      "kettlebell-swings",
      "rowing-intervals",
      "plank-hold",
      "hanging-leg-raise",
    ],
  },
  {
    id: "mobility-flow",
    title: "Full-Body Mobility & Recovery",
    category: "mobility",
    estimatedMinutes: 20,
    focus: "Hips · Spine · Recovery",
    difficulty: "Beginner",
    exerciseIds: [
      "worlds-greatest-stretch",
      "thoracic-openers",
      "treadmill-incline-walk",
    ],
  },
];

export function findExerciseById(id: string): LibraryExercise | undefined {
  return EXERCISE_LIBRARY.find((ex) => ex.id === id);
}

// Mock data for ExamPrep — used across all pages until API is wired up

export const mockUser = {
  id: "u-001",
  name: "Harsh Singh",
  email: "harshsingh15dec@gmail.com",
  role: "student" as const,
  avatar: null,
  streakDays: 12,
  longestStreak: 19,
  totalTests: 34,
  globalRank: 142,
  batchRank: 7,
  instituteRank: 23,
  percentile: 91.4,
  avgScore: 68.5,
  batch: "JEE 2026 Morning",
};

export const mockTeacher = {
  id: "t-001",
  name: "Dr. Vikram Seth",
  email: "vikram.seth@aakash.test",
  role: "teacher" as const,
  instituteName: "Aakash Institute",
  subject: "Physics",
  batchesAssigned: 3,
};

export const mockInstituteAdmin = {
  id: "i-001",
  name: "Aakash Admin",
  email: "admin@aakash.test",
  role: "institute_admin" as const,
  instituteName: "Aakash Institute",
  plan: "Institute Growth",
  studentsCount: 420,
  batchesCount: 8,
};

export const mockSuperAdmin = {
  id: "s-001",
  name: "ExamPrep Admin",
  email: "admin@examprep.in",
  role: "super_admin" as const,
};

export const mockStats = {
  totalTests: 34,
  avgScore: 68.5,
  bestScore: 89.3,
  totalQuestions: 1870,
  accuracy: 71.2,
  hoursStudied: 48,
};

export const mockRecentTests = [
  {
    id: "test-001",
    title: "Physics — Laws of Motion + Work Energy",
    type: "chapter",
    score: 45,
    maxScore: 100,
    percentage: 45,
    questions: 25,
    date: "2026-06-08",
    timeTakenMin: 38,
    exam: "JEE",
    hasBooster: true,
  },
  {
    id: "test-002",
    title: "Chemistry — Organic Full Test",
    type: "subject",
    score: 84,
    maxScore: 100,
    percentage: 84,
    questions: 25,
    date: "2026-06-07",
    timeTakenMin: 55,
    exam: "JEE",
    hasBooster: false,
  },
  {
    id: "test-003",
    title: "Maths — Calculus & Coordinate Geometry",
    type: "chapter",
    score: 68,
    maxScore: 100,
    percentage: 68,
    questions: 25,
    date: "2026-06-06",
    timeTakenMin: 47,
    exam: "JEE",
    hasBooster: true,
  },
  {
    id: "test-004",
    title: "JEE Main Full Mock — Jan 2026",
    type: "full",
    score: 186,
    maxScore: 300,
    percentage: 62,
    questions: 75,
    date: "2026-06-04",
    timeTakenMin: 162,
    exam: "JEE",
    hasBooster: false,
  },
];

// Questions for the test-taking page
export const mockQuestions = [
  {
    id: "q-001",
    questionNumber: 1,
    subject: "Physics",
    chapter: "Laws of Motion",
    topic: "Newton's Second Law",
    difficulty: "medium" as const,
    type: "mcq_single" as const,
    questionText: "A block of mass 5 kg is placed on a frictionless surface. A horizontal force of 20 N acts on it. The acceleration produced is:",
    options: [
      { id: "A", text: "2 m/s²" },
      { id: "B", text: "4 m/s²" },
      { id: "C", text: "5 m/s²" },
      { id: "D", text: "10 m/s²" },
    ],
    correctAnswer: "B",
  },
  {
    id: "q-002",
    questionNumber: 2,
    subject: "Physics",
    chapter: "Laws of Motion",
    topic: "Friction",
    difficulty: "hard" as const,
    type: "mcq_single" as const,
    questionText: "A body is on a rough inclined plane. The coefficient of static friction is 0.5. The maximum angle of the incline at which the body remains stationary is approximately:",
    options: [
      { id: "A", text: "25°" },
      { id: "B", text: "27°" },
      { id: "C", text: "30°" },
      { id: "D", text: "45°" },
    ],
    correctAnswer: "A",
  },
  {
    id: "q-003",
    questionNumber: 3,
    subject: "Physics",
    chapter: "Work-Energy Theorem",
    topic: "Work done by variable force",
    difficulty: "medium" as const,
    type: "mcq_single" as const,
    questionText: "A particle moves along the x-axis. The force acting on it is F = (3x² + 2) N. The work done in moving the particle from x = 0 to x = 2 m is:",
    options: [
      { id: "A", text: "8 J" },
      { id: "B", text: "12 J" },
      { id: "C", text: "16 J" },
      { id: "D", text: "20 J" },
    ],
    correctAnswer: "C",
  },
  {
    id: "q-004",
    questionNumber: 4,
    subject: "Physics",
    chapter: "Work-Energy Theorem",
    topic: "Kinetic Energy",
    difficulty: "easy" as const,
    type: "mcq_single" as const,
    questionText: "A body of mass 2 kg has kinetic energy of 16 J. Its velocity is:",
    options: [
      { id: "A", text: "2 m/s" },
      { id: "B", text: "4 m/s" },
      { id: "C", text: "8 m/s" },
      { id: "D", text: "√8 m/s" },
    ],
    correctAnswer: "B",
  },
  {
    id: "q-005",
    questionNumber: 5,
    subject: "Physics",
    chapter: "Thermodynamics",
    topic: "Carnot Cycle",
    difficulty: "hard" as const,
    type: "mcq_single" as const,
    questionText: "A Carnot engine works between temperatures 500 K and 300 K. The efficiency of this engine is:",
    options: [
      { id: "A", text: "30%" },
      { id: "B", text: "40%" },
      { id: "C", text: "50%" },
      { id: "D", text: "60%" },
    ],
    correctAnswer: "B",
  },
];

// AI Analysis data
export const mockAnalysis = {
  attemptId: "attempt-001",
  score: 45,
  maxScore: 100,
  percentage: 45,
  correctCount: 11,
  incorrectCount: 8,
  skippedCount: 6,
  timeTakenMin: 38,
  batchAvg: 58,
  weakTopics: [
    {
      topic: "Newton's Laws of Motion",
      chapter: "Laws of Motion",
      accuracy: 33,
      questionsAttempted: 6,
      recommendation: "Focus on free body diagrams. Practice resolving forces in all directions before applying F = ma.",
    },
    {
      topic: "Work-Energy Theorem",
      chapter: "Work-Energy Theorem",
      accuracy: 25,
      questionsAttempted: 4,
      recommendation: "Revisit the concept of work done by variable forces. Practice integration-based problems.",
    },
    {
      topic: "Carnot Cycle & Thermodynamic Efficiency",
      chapter: "Thermodynamics",
      accuracy: 0,
      questionsAttempted: 3,
      recommendation: "Master the Carnot cycle diagram. Learn to compute efficiency using η = 1 - T_cold/T_hot.",
    },
  ],
  errorPatterns: [
    {
      pattern: "Sign error in force direction",
      description: "You consistently assigned incorrect signs when forces act in opposite directions on a pulley system.",
      questionsAffected: 4,
    },
    {
      pattern: "Confusing work done by normal force",
      description: "Normal force does zero work on horizontal motion — you're including it in calculations.",
      questionsAffected: 3,
    },
  ],
  studyPlan: [
    { day: 1, topic: "Newton's Laws — Free Body Diagrams", activity: "Study theory + solve 20 basic FBD problems", durationMinutes: 90 },
    { day: 2, topic: "Newton's Laws — Pulley Systems", activity: "Solve 15 pulley problems focusing on sign conventions", durationMinutes: 75 },
    { day: 3, topic: "Work-Energy Theorem — Constant Force", activity: "Review W = F·d·cosθ, solve 20 problems", durationMinutes: 60 },
    { day: 4, topic: "Work-Energy Theorem — Variable Force", activity: "Practice integration-based work problems", durationMinutes: 90 },
    { day: 5, topic: "Thermodynamics — Laws & Processes", activity: "Study isothermal, adiabatic, isochoric processes", durationMinutes: 75 },
    { day: 6, topic: "Carnot Cycle & Efficiency", activity: "Master Carnot diagram, solve 10 efficiency problems", durationMinutes: 60 },
    { day: 7, topic: "Full Revision — All 3 Topics", activity: "Attempt a 25-question mixed test on all topics", durationMinutes: 60 },
  ],
};

// Leaderboard data
export const mockLeaderboard = Array.from({ length: 20 }, (_, i) => ({
  rank: i + 1,
  name: [
    "Arjun Mehta", "Priya Sharma", "Rohan Gupta", "Ananya Singh", "Vikram Patel",
    "Sneha Reddy", "Harsh Singh", "Aditya Kumar", "Kavya Nair", "Rahul Verma",
    "Divya Joshi", "Siddharth Rao", "Meera Pillai", "Karan Malhotra", "Shreya Das",
    "Nikhil Sinha", "Pooja Agarwal", "Arnav Kapoor", "Riya Bose", "Tanmay Shah",
  ][i],
  avgScore: Math.round(85 - i * 1.8 + Math.random() * 3),
  totalTests: Math.round(40 - i * 0.5 + Math.random() * 5),
  streak: Math.round(20 - i * 0.8 + Math.random() * 3),
  percentile: parseFloat((99 - i * 2.5).toFixed(1)),
  isCurrentUser: i === 6,
}));

export const mockInstituteLeaderboard = Array.from({ length: 20 }, (_, i) => ({
  rank: i + 1,
  name: [
    "Rahul Verma", "Vikram Patel", "Arjun Mehta", "Siddharth Rao", "Aditya Kumar",
    "Divya Joshi", "Harsh Singh", "Rohan Gupta", "Priya Sharma", "Meera Pillai",
    "Kavya Nair", "Karan Malhotra", "Ananya Singh", "Sneha Reddy", "Shreya Das",
    "Nikhil Sinha", "Pooja Agarwal", "Arnav Kapoor", "Riya Bose", "Tanmay Shah",
  ][i],
  avgScore: Math.round(82 - i * 1.5 + Math.random() * 2),
  totalTests: Math.round(35 - i * 0.5 + Math.random() * 4),
  streak: Math.round(15 - i * 0.5 + Math.random() * 2),
  percentile: parseFloat((98 - i * 2.0).toFixed(1)),
  isCurrentUser: i === 6,
}));

export const mockBatchLeaderboard = Array.from({ length: 20 }, (_, i) => ({
  rank: i + 1,
  name: [
    "Arjun Mehta", "Siddharth Rao", "Harsh Singh", "Aditya Kumar", "Rohan Gupta",
    "Rahul Verma", "Vikram Patel", "Divya Joshi", "Priya Sharma", "Meera Pillai",
    "Kavya Nair", "Karan Malhotra", "Ananya Singh", "Sneha Reddy", "Shreya Das",
    "Nikhil Sinha", "Pooja Agarwal", "Arnav Kapoor", "Riya Bose", "Tanmay Shah",
  ][i],
  avgScore: Math.round(80 - i * 1.2 + Math.random() * 2),
  totalTests: Math.round(30 - i * 0.4 + Math.random() * 3),
  streak: Math.round(12 - i * 0.4 + Math.random() * 2),
  percentile: parseFloat((97 - i * 1.8).toFixed(1)),
  isCurrentUser: i === 2,
}));

// Test history with booster chain
export const mockHistory = [
  {
    id: "test-001",
    title: "Chapter Test — Laws of Motion",
    date: "2026-06-08",
    score: 45,
    percentage: 45,
    questions: 25,
    boosters: [
      {
        id: "boost-001",
        title: "Booster 1 — 3 weak topics",
        date: "2026-06-08",
        score: 68,
        percentage: 68,
        questions: 15,
        boosters: [
          {
            id: "boost-002",
            title: "Booster 2 — Carnot Cycle",
            date: "2026-06-09",
            score: 85,
            percentage: 85,
            questions: 10,
            boosters: [],
            mastered: true,
          },
        ],
      },
    ],
  },
  {
    id: "test-002",
    title: "Subject Test — Organic Chemistry",
    date: "2026-06-07",
    score: 84,
    percentage: 84,
    questions: 25,
    boosters: [],
  },
  {
    id: "test-003",
    title: "Chapter Test — Calculus",
    date: "2026-06-06",
    score: 68,
    percentage: 68,
    questions: 25,
    boosters: [
      {
        id: "boost-003",
        title: "Booster 1 — Integration",
        date: "2026-06-07",
        score: 78,
        percentage: 78,
        questions: 15,
        boosters: [],
        mastered: true,
      },
    ],
  },
];

// Exam config for test creation
export const examConfig = {
  JEE: {
    subjects: {
      Physics: [
        "Laws of Motion", "Work, Energy & Power", "Rotational Motion",
        "Gravitation", "Fluid Mechanics", "Thermodynamics",
        "Waves & Oscillations", "Electrostatics", "Current Electricity",
        "Magnetism", "Electromagnetic Induction", "Optics", "Modern Physics",
      ],
      Chemistry: [
        "Atomic Structure", "Chemical Bonding", "States of Matter",
        "Thermochemistry", "Electrochemistry", "Chemical Kinetics",
        "Coordination Compounds", "Organic Chemistry Basics", "Hydrocarbons",
        "Haloalkanes", "Alcohols & Ethers", "Aldehydes & Ketones",
        "Carboxylic Acids", "Amines", "Biomolecules",
      ],
      Mathematics: [
        "Sets & Relations", "Trigonometry", "Algebra", "Coordinate Geometry",
        "Calculus — Limits", "Calculus — Differentiation", "Calculus — Integration",
        "Differential Equations", "Vectors & 3D Geometry",
        "Probability", "Statistics", "Mathematical Reasoning",
      ],
    },
    markingScheme: { correct: 4, incorrect: -1, unattempted: 0 },
    speedMinPerQ: 2.4,
  },
  NEET: {
    subjects: {
      Physics: [
        "Laws of Motion", "Work & Energy", "Gravitation",
        "Thermodynamics", "Waves", "Electrostatics", "Current Electricity",
        "Magnetism", "Optics", "Modern Physics",
      ],
      Chemistry: [
        "Atomic Structure", "Chemical Bonding", "Equilibrium",
        "Electrochemistry", "Organic Chemistry", "Biomolecules", "Polymers",
      ],
      Botany: [
        "Cell Biology", "Plant Anatomy", "Plant Physiology",
        "Reproduction in Plants", "Genetics", "Ecology",
      ],
      Zoology: [
        "Animal Kingdom", "Structural Organisation", "Human Physiology",
        "Reproduction", "Genetics & Evolution", "Human Health",
      ],
    },
    markingScheme: { correct: 4, incorrect: -1, unattempted: 0 },
    speedMinPerQ: 1.0,
  },
};

// Teacher & Institute Data
export const mockBatches = [
  {
    id: "batch-001",
    name: "JEE 2026 Morning",
    exam: "JEE",
    studentsCount: 142,
    avgScore: 71.4,
    testsConducted: 12,
    nextTestDate: "2026-06-12",
  },
  {
    id: "batch-002",
    name: "JEE 2026 Evening",
    exam: "JEE",
    studentsCount: 138,
    avgScore: 68.2,
    testsConducted: 12,
    nextTestDate: "2026-06-12",
  },
  {
    id: "batch-003",
    name: "NEET 2026 Droppers",
    exam: "NEET",
    studentsCount: 185,
    avgScore: 62.5,
    testsConducted: 8,
    nextTestDate: "2026-06-15",
  },
];

export const mockBatchAnalysis = {
  batchId: "batch-001",
  testTitle: "Weekly Test 4 — Physics & Maths",
  totalStudents: 142,
  attemptedCount: 138,
  classSummary: {
    avgScore: 64.5,
    topScore: 92.0,
    bottomScore: 18.5,
    belowAverageCount: 45,
  },
  chapterHeatmap: [
    { chapter: "Laws of Motion", avgAccuracy: 42, flag: "critical" },
    { chapter: "Work, Energy & Power", avgAccuracy: 68, flag: "warning" },
    { chapter: "Calculus — Limits", avgAccuracy: 85, flag: "good" },
  ],
  teachingRecs: [
    { recommendation: "73% of students failed on Pulley System signs. Re-teach sign conventions.", priority: "high" },
    { recommendation: "Work-Energy theorem is understood, but variable force integration is weak.", priority: "medium" },
  ],
  attentionFlags: [
    { studentName: "Rohan Gupta", reason: "Score dropped 30% since last week." },
    { studentName: "Sneha Reddy", reason: "Missed 3 consecutive tests." },
  ],
};

export const mockInstituteStudents = Array.from({ length: 15 }, (_, i) => ({
  id: `stu-${i}`,
  name: [
    "Arjun Mehta", "Priya Sharma", "Rohan Gupta", "Ananya Singh", "Vikram Patel",
    "Sneha Reddy", "Aditya Kumar", "Kavya Nair", "Rahul Verma", "Divya Joshi",
    "Siddharth Rao", "Meera Pillai", "Karan Malhotra", "Shreya Das", "Nikhil Sinha"
  ][i],
  batch: i % 3 === 0 ? "NEET 2026 Droppers" : "JEE 2026 Morning",
  avgScore: Math.round(85 - i * 1.8 + Math.random() * 3),
  testsTaken: Math.round(15 - i * 0.2),
  joinedAt: "2025-04-10",
}));

// Super Admin Data
export const mockPlatformStats = {
  totalInstitutes: 45,
  totalStudents: 12450,
  testsConductedThisMonth: 145000,
  activeAIAnalyses: 138000,
  mrr: "₹3,45,000",
};

export const mockInstitutesList = [
  {
    id: "inst-1",
    name: "Aakash Institute (Delhi)",
    plan: "Pro",
    students: 2450,
    batches: 32,
    status: "active",
    joined: "2025-01-15",
  },
  {
    id: "inst-2",
    name: "Allen Career Institute (Kota)",
    plan: "Pro",
    students: 5800,
    batches: 64,
    status: "active",
    joined: "2025-02-10",
  },
  {
    id: "inst-3",
    name: "Resonance (Mumbai)",
    plan: "Growth",
    students: 450,
    batches: 8,
    status: "active",
    joined: "2025-11-05",
  },
  {
    id: "inst-4",
    name: "Vibrant Academy",
    plan: "Starter",
    students: 120,
    batches: 3,
    status: "active",
    joined: "2026-03-20",
  },
  {
    id: "inst-5",
    name: "Future Point Classes",
    plan: "Trial",
    students: 45,
    batches: 1,
    status: "expiring",
    joined: "2026-05-15",
  },
];

// Collaborative Test Creation Data
export const mockPendingTasks = [
  {
    id: "task-001",
    testName: "Fortnightly Review 4 - JEE Main",
    batchName: "JEE 2026 Morning",
    dueDate: "2026-06-12",
    subject: "Physics",
    questionsRequired: 25,
    questionsAdded: 0,
    status: "pending",
  },
  {
    id: "task-002",
    testName: "Full Mock 1 - NEET Pattern",
    batchName: "NEET 2026 Droppers",
    dueDate: "2026-06-15",
    subject: "Physics",
    questionsRequired: 45,
    questionsAdded: 45,
    status: "completed",
  }
];

export const mockInstituteTests = [
  {
    id: "itest-001",
    name: "Fortnightly Review 4 - JEE Main",
    batch: "JEE 2026 Morning",
    scheduledDate: "2026-06-14",
    status: "pending_teachers",
    progress: {
      physics: "pending",
      chemistry: "completed",
      maths: "completed"
    }
  },
  {
    id: "itest-002",
    name: "Full Mock 1 - NEET Pattern",
    batch: "NEET 2026 Droppers",
    scheduledDate: "2026-06-17",
    status: "ready",
    progress: {
      physics: "completed",
      chemistry: "completed",
      botany: "completed",
      zoology: "completed"
    }
  }
];

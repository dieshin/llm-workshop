// ===== MENU DATA =====
const MENU_ITEMS = [
  {
    id: 1,
    name: "Nasi Lemak Special",
    stall: "rice",
    stallName: "Rice Station",
    emoji: "🍛",
    price: 4.50,
    prepTime: 3,
    soldOut: false,
    tags: ["popular", "spicy"],
    cal: 620,
    nutrition: { protein: 22, carbs: 78, fat: 18 },
    points: 9  // loyalty points earned
  },
  {
    id: 2,
    name: "Mee Goreng",
    stall: "noodles",
    stallName: "Noodle Bar",
    emoji: "🍜",
    price: 4.00,
    prepTime: 4,
    soldOut: false,
    tags: ["popular"],
    cal: 540,
    nutrition: { protein: 18, carbs: 72, fat: 14 },
    points: 8
  },
  {
    id: 3,
    name: "Chicken Chop Rice",
    stall: "rice",
    stallName: "Rice Station",
    emoji: "🍗",
    price: 5.50,
    prepTime: 5,
    soldOut: false,
    tags: [],
    cal: 710,
    nutrition: { protein: 38, carbs: 65, fat: 22 },
    points: 11
  },
  {
    id: 4,
    name: "Roti Prata",
    stall: "snacks",
    stallName: "Snack Corner",
    emoji: "🫓",
    price: 1.80,
    prepTime: 2,
    soldOut: false,
    tags: ["quick"],
    cal: 290,
    nutrition: { protein: 7, carbs: 42, fat: 10 },
    points: 4
  },
  {
    id: 5,
    name: "Teh Tarik",
    stall: "drinks",
    stallName: "Drinks",
    emoji: "🧋",
    price: 1.50,
    prepTime: 1,
    soldOut: false,
    tags: ["popular", "hot"],
    cal: 130,
    nutrition: { protein: 3, carbs: 20, fat: 4 },
    points: 3
  },
  {
    id: 6,
    name: "Char Kway Teow",
    stall: "noodles",
    stallName: "Noodle Bar",
    emoji: "🥘",
    price: 5.00,
    prepTime: 5,
    soldOut: false,
    tags: ["spicy"],
    cal: 670,
    nutrition: { protein: 24, carbs: 80, fat: 20 },
    points: 10
  },
  {
    id: 7,
    name: "Egg Sandwich",
    stall: "snacks",
    stallName: "Snack Corner",
    emoji: "🥪",
    price: 2.50,
    prepTime: 2,
    soldOut: false,
    tags: ["quick"],
    cal: 340,
    nutrition: { protein: 14, carbs: 38, fat: 12 },
    points: 5
  },
  {
    id: 8,
    name: "Milo Dinosaur",
    stall: "drinks",
    stallName: "Drinks",
    emoji: "🥛",
    price: 2.00,
    prepTime: 1,
    soldOut: false,
    tags: ["cold", "popular"],
    cal: 210,
    nutrition: { protein: 5, carbs: 36, fat: 6 },
    points: 4
  },
  {
    id: 9,
    name: "Wonton Noodle Soup",
    stall: "noodles",
    stallName: "Noodle Bar",
    emoji: "🍲",
    price: 4.50,
    prepTime: 4,
    soldOut: false,
    tags: [],
    cal: 480,
    nutrition: { protein: 20, carbs: 60, fat: 10 },
    points: 9
  },
  {
    id: 10,
    name: "Iced Lemon Tea",
    stall: "drinks",
    stallName: "Drinks",
    emoji: "🍋",
    price: 1.80,
    prepTime: 1,
    soldOut: false,
    tags: ["cold"],
    cal: 90,
    nutrition: { protein: 0, carbs: 22, fat: 0 },
    points: 4
  },
  {
    id: 11,
    name: "Chicken Rice",
    stall: "rice",
    stallName: "Rice Station",
    emoji: "🍚",
    price: 4.00,
    prepTime: 3,
    soldOut: false,
    tags: ["popular"],
    cal: 560,
    nutrition: { protein: 30, carbs: 70, fat: 12 },
    points: 8
  },
  {
    id: 12,
    name: "Curry Puff",
    stall: "snacks",
    stallName: "Snack Corner",
    emoji: "🥟",
    price: 1.20,
    prepTime: 1,
    soldOut: false,
    tags: ["quick", "spicy"],
    cal: 220,
    nutrition: { protein: 6, carbs: 28, fat: 9 },
    points: 2
  }
];

const STALLS = {
  rice:    { name: "Rice Station",  icon: "🍚" },
  noodles: { name: "Noodle Bar",    icon: "🍜" },
  snacks:  { name: "Snack Corner",  icon: "🥪" },
  drinks:  { name: "Drinks",        icon: "🧋" }
};

// Stall busyness — refreshed every load (simulated)
function getStallBusyness() {
  const hour = new Date().getHours();
  // Peak: 12–14 lunch, 18–19 dinner
  const isPeak = (hour >= 12 && hour <= 14) || (hour >= 18 && hour <= 19);
  return {
    rice:    isPeak ? Math.floor(Math.random() * 3 + 7) : Math.floor(Math.random() * 4 + 2),
    noodles: isPeak ? Math.floor(Math.random() * 3 + 6) : Math.floor(Math.random() * 4 + 1),
    snacks:  isPeak ? Math.floor(Math.random() * 3 + 4) : Math.floor(Math.random() * 3 + 1),
    drinks:  isPeak ? Math.floor(Math.random() * 3 + 5) : Math.floor(Math.random() * 4 + 1)
  };
}

// Study Break Combos
const STUDY_COMBOS = [
  {
    id: "brain_fuel",
    name: "Brain Fuel",
    desc: "Power through that assignment",
    emoji: "🧠",
    itemIds: [11, 5],   // Chicken Rice + Teh Tarik
    discount: 0.50
  },
  {
    id: "quick_bite",
    name: "Quick Bite",
    desc: "5-min break, back to the books",
    emoji: "⚡",
    itemIds: [4, 10],   // Roti Prata + Iced Lemon Tea
    discount: 0.40
  },
  {
    id: "exam_warrior",
    name: "Exam Warrior",
    desc: "Fuel up before the paper",
    emoji: "📚",
    itemIds: [3, 8],    // Chicken Chop Rice + Milo Dinosaur
    discount: 0.80
  },
  {
    id: "afternoon_slump",
    name: "Afternoon Slump",
    desc: "Beat the 3pm crash",
    emoji: "☕",
    itemIds: [7, 5],    // Egg Sandwich + Teh Tarik
    discount: 0.30
  }
];

const PREP_TIME_PER_ORDER = 3; // minutes per queue position

// Points: earn 1 pt per $0.50 spent, redeem 50 pts = $1 off
const POINTS_PER_DOLLAR = 2;
const POINTS_REDEEM_RATE = 50; // 50 pts = $1

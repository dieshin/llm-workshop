// ===== MENU DATA =====
const MENU_ITEMS = [
  {
    id: 1,
    name: "Nasi Lemak Special",
    stall: "rice",
    stallName: "Rice Station",
    emoji: "🍛",
    price: 5.50,
    prepTime: 3,
    soldOut: false,
    tags: ["popular", "spicy"]
  },
  {
    id: 2,
    name: "Mee Goreng Mamak",
    stall: "noodles",
    stallName: "Noodle Bar",
    emoji: "🍜",
    price: 5.00,
    prepTime: 4,
    soldOut: false,
    tags: ["popular"]
  },
  {
    id: 3,
    name: "Chicken Chop Rice",
    stall: "rice",
    stallName: "Rice Station",
    emoji: "🍗",
    price: 7.00,
    prepTime: 5,
    soldOut: false,
    tags: []
  },
  {
    id: 4,
    name: "Roti Canai + Dhal",
    stall: "snacks",
    stallName: "Snack Corner",
    emoji: "🫓",
    price: 2.50,
    prepTime: 2,
    soldOut: false,
    tags: ["quick"]
  },
  {
    id: 5,
    name: "Teh Tarik",
    stall: "drinks",
    stallName: "Drinks",
    emoji: "🧋",
    price: 2.00,
    prepTime: 1,
    soldOut: false,
    tags: ["popular"]
  },
  {
    id: 6,
    name: "Char Kway Teow",
    stall: "noodles",
    stallName: "Noodle Bar",
    emoji: "🥘",
    price: 6.50,
    prepTime: 5,
    soldOut: false,
    tags: ["spicy"]
  },
  {
    id: 7,
    name: "Sandwich Toasties",
    stall: "snacks",
    stallName: "Snack Corner",
    emoji: "🥪",
    price: 4.00,
    prepTime: 2,
    soldOut: false,
    tags: ["quick"]
  },
  {
    id: 8,
    name: "Milo Ais",
    stall: "drinks",
    stallName: "Drinks",
    emoji: "🥛",
    price: 2.50,
    prepTime: 1,
    soldOut: false,
    tags: []
  }
];

const STALLS = {
  rice: { name: "Rice Station", icon: "🍚" },
  noodles: { name: "Noodle Bar", icon: "🍜" },
  snacks: { name: "Snack Corner", icon: "🥪" },
  drinks: { name: "Drinks", icon: "🧋" }
};

const PREP_TIME_PER_ORDER = 3; // minutes per order in queue

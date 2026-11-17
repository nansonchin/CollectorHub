export type CardSeed = {
  number: number;
  name: string;
  description: string;
  element: "FIRE" | "WATER" | "EARTH" | "DARK" | "LIGHT";
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY" | "MYTHIC";
  attack: number;
  defense: number;
};

export const CARDS: CardSeed[] = [
  // ---------- FIRE ----------
  { number: 1, name: "Ember Sprite", description: "A tiny spark that dances in the embers of forgotten campfires.", element: "FIRE", rarity: "COMMON", attack: 45, defense: 30 },
  { number: 2, name: "Cinder Hound", description: "Hunts by the glow of its own smoldering coat.", element: "FIRE", rarity: "COMMON", attack: 80, defense: 55 },
  { number: 3, name: "Flame Duelist", description: "Fights with a blade that never stops burning.", element: "FIRE", rarity: "RARE", attack: 150, defense: 110 },
  { number: 4, name: "Scorch Drake", description: "Its wingbeats scatter glowing ash across entire valleys.", element: "FIRE", rarity: "EPIC", attack: 215, defense: 150 },
  { number: 5, name: "Fire Dragon", description: "The ancient sovereign of volcanoes. Its roar melts stone.", element: "FIRE", rarity: "LEGENDARY", attack: 300, defense: 200 },
  { number: 6, name: "Infernal Sovereign", description: "Said to be the first flame, from which all fire descended.", element: "FIRE", rarity: "MYTHIC", attack: 385, defense: 270 },

  // ---------- WATER ----------
  { number: 7, name: "Bubble Sprite", description: "Drifts through shallow streams, giggling at its own reflection.", element: "WATER", rarity: "COMMON", attack: 35, defense: 50 },
  { number: 8, name: "Tide Crab", description: "Its shell hardens with every wave that crashes over it.", element: "WATER", rarity: "COMMON", attack: 70, defense: 90 },
  { number: 9, name: "Reef Warden", description: "Guards the coral cities and never forgets an intruder.", element: "WATER", rarity: "RARE", attack: 120, defense: 160 },
  { number: 10, name: "Storm Serpent", description: "Rides the lightning that crawls across the open sea.", element: "WATER", rarity: "RARE", attack: 165, defense: 120 },
  { number: 11, name: "Abyss Leviathan", description: "Sailors say its shadow alone can sink a ship.", element: "WATER", rarity: "EPIC", attack: 220, defense: 190 },
  { number: 12, name: "Ice Phoenix", description: "Reborn from frost, it freezes the air around its wings.", element: "WATER", rarity: "LEGENDARY", attack: 290, defense: 220 },

  // ---------- EARTH ----------
  { number: 13, name: "Moss Gnome", description: "Naps on old stones until the moss grows over its beard.", element: "EARTH", rarity: "COMMON", attack: 40, defense: 70 },
  { number: 14, name: "Pebble Beetle", description: "Rolls into a ball and shrugs off almost anything.", element: "EARTH", rarity: "COMMON", attack: 65, defense: 95 },
  { number: 15, name: "Stone Sentinel", description: "Stands motionless for centuries, waiting for one command.", element: "EARTH", rarity: "RARE", attack: 110, defense: 170 },
  { number: 16, name: "Thornweaver", description: "Braids living vines into walls and traps.", element: "EARTH", rarity: "RARE", attack: 155, defense: 125 },
  { number: 17, name: "Ancient Treant", description: "Older than the forest it protects, and twice as stubborn.", element: "EARTH", rarity: "EPIC", attack: 190, defense: 240 },
  { number: 18, name: "Mountain Colossus", description: "When it walks, the horizon shifts.", element: "EARTH", rarity: "LEGENDARY", attack: 270, defense: 310 },

  // ---------- DARK ----------
  { number: 19, name: "Shade Imp", description: "A mischievous shadow that steals socks and secrets.", element: "DARK", rarity: "COMMON", attack: 60, defense: 35 },
  { number: 20, name: "Night Crow", description: "Carries whispers between the living and the lost.", element: "DARK", rarity: "COMMON", attack: 85, defense: 45 },
  { number: 21, name: "Shadow Knight", description: "Sworn to a king nobody remembers.", element: "DARK", rarity: "RARE", attack: 160, defense: 130 },
  { number: 22, name: "Void Stalker", description: "Steps out of nowhere and leaves no footprints.", element: "DARK", rarity: "EPIC", attack: 235, defense: 140 },
  { number: 23, name: "Nightmare Queen", description: "Rules every dream you wish you could forget.", element: "DARK", rarity: "LEGENDARY", attack: 310, defense: 190 },
  { number: 24, name: "Eclipse Devourer", description: "The day the sun went dark, it finally ate.", element: "DARK", rarity: "MYTHIC", attack: 400, defense: 250 },

  // ---------- LIGHT ----------
  { number: 25, name: "Glow Wisp", description: "A soft light that guides travelers home.", element: "LIGHT", rarity: "COMMON", attack: 30, defense: 55 },
  { number: 26, name: "Dawn Fox", description: "Its tail leaves trails of sunrise-colored light.", element: "LIGHT", rarity: "COMMON", attack: 75, defense: 60 },
  { number: 27, name: "Radiant Cleric", description: "Heals allies and blinds enemies with the same prayer.", element: "LIGHT", rarity: "RARE", attack: 100, defense: 165 },
  { number: 28, name: "Halo Lancer", description: "Strikes from above, wrapped in a ring of golden fire.", element: "LIGHT", rarity: "RARE", attack: 145, defense: 115 },
  { number: 29, name: "Crystal Mage", description: "Bends light through prisms to cast spells of pure color.", element: "LIGHT", rarity: "EPIC", attack: 225, defense: 160 },
  { number: 30, name: "Seraph of Dawn", description: "Its wings open, and the night remembers it is temporary.", element: "LIGHT", rarity: "LEGENDARY", attack: 305, defense: 215 },
];

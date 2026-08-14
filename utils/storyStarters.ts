import { Settings } from '../types';

export interface StoryStarter {
  label: string;
  genre: Settings['genre'];
  audience: Settings['targetAudience'];
  storyLength: 'short';
  description?: string;
}

export const STORY_STARTERS_POOL: StoryStarter[] = [
  // Fantasy
  { label: "The Clockwork Observatory", genre: "fantasy", audience: "teen", storyLength: "short" },
  { label: "The Dragon's Secret Apprentice", genre: "fantasy", audience: "children", storyLength: "short" },
  { label: "The Last Alchemist of Solaris", genre: "fantasy", audience: "adult", storyLength: "short" },
  { label: "The Whispering Quill of Avalon", genre: "fantasy", audience: "teen", storyLength: "short" },
  { label: "Garden of the Floating Runes", genre: "fantasy", audience: "children", storyLength: "short" },

  // Sci-Fi
  { label: "Cyberpunk Neon Odyssey", genre: "sci-fi", audience: "teen", storyLength: "short" },
  { label: "The Robot Who Wanted to Dream", genre: "sci-fi", audience: "children", storyLength: "short" },
  { label: "Echoes Beyond the Dyson Sphere", genre: "sci-fi", audience: "adult", storyLength: "short" },
  { label: "Lost Signal from Mars Colony 9", genre: "sci-fi", audience: "teen", storyLength: "short" },
  { label: "The Quantum Time-Pocket Watch", genre: "sci-fi", audience: "adult", storyLength: "short" },

  // Mystery
  { label: "Whispers of the Forgotten Forest", genre: "mystery", audience: "teen", storyLength: "short" },
  { label: "The Midnight Cat Detective", genre: "mystery", audience: "children", storyLength: "short" },
  { label: "The Cipher in Room 304", genre: "mystery", audience: "adult", storyLength: "short" },
  { label: "The Case of the Missing Constellation", genre: "mystery", audience: "children", storyLength: "short" },
  { label: "Secrets of the Fogbound Manor", genre: "mystery", audience: "adult", storyLength: "short" },

  // Adventure
  { label: "The Sunken Pirate Galleon", genre: "adventure", audience: "children", storyLength: "short" },
  { label: "Expedition to the Hollow Caverns", genre: "adventure", audience: "teen", storyLength: "short" },
  { label: "The Tomb of the Eclipse King", genre: "adventure", audience: "adult", storyLength: "short" },
  { label: "Sky-Islands of the Wind Rider", genre: "adventure", audience: "teen", storyLength: "short" },
  { label: "Secret of the Emerald Compass", genre: "adventure", audience: "children", storyLength: "short" },

  // Funny
  { label: "The Day the Clouds Rained Pancakes", genre: "funny", audience: "children", storyLength: "short" },
  { label: "A Wizard with a Broken Wand", genre: "funny", audience: "teen", storyLength: "short" },
  { label: "The Great Goblin Bake-Off", genre: "funny", audience: "children", storyLength: "short" },
  { label: "Intergalactic Bureaucracy Mix-Up", genre: "funny", audience: "adult", storyLength: "short" },

  // Superhero
  { label: "The Kid Who Could Control Lightning", genre: "superhero", audience: "children", storyLength: "short" },
  { label: "Neon Guardian of Sector 7", genre: "superhero", audience: "teen", storyLength: "short" },
  { label: "The Reluctant Shadow Vigilante", genre: "superhero", audience: "adult", storyLength: "short" },

  // Fairy Tale & Fable
  { label: "The Glass Starlight Princess", genre: "fairy_tale", audience: "children", storyLength: "short" },
  { label: "The Fox Who Outsmarted the Moon", genre: "fable", audience: "children", storyLength: "short" },
  { label: "The Willow Tree That Whispered Secrets", genre: "fairy_tale", audience: "teen", storyLength: "short" },

  // Bedtime & Educational
  { label: "The Sleepy Star's Lullaby Journey", genre: "bedtime", audience: "children", storyLength: "short" },
  { label: "Voyage Inside the Microscopic Coral Reef", genre: "educational", audience: "children", storyLength: "short" },
  { label: "Secrets of Deep Ocean Trenches", genre: "educational", audience: "teen", storyLength: "short" },

  // Thriller, Crime, Historical, Drama, Romance, Horror
  { label: "The Phantom Train to Nowhere", genre: "thriller", audience: "adult", storyLength: "short" },
  { label: "The Venetian Masquerade Code", genre: "crime", audience: "adult", storyLength: "short" },
  { label: "The Samurai's Final Lantern", genre: "historical", audience: "teen", storyLength: "short" },
  { label: "Letters Across the Stellar Sea", genre: "romance", audience: "teen", storyLength: "short" },
  { label: "The Haunting of Ravenwood Lighthouse", genre: "horror", audience: "adult", storyLength: "short" },
  { label: "The Painter's Lost Symphony", genre: "drama", audience: "adult", storyLength: "short" },
];

/**
 * Returns a randomized slice of distinct story starters
 */
export function getRandomStarters(count: number = 6): StoryStarter[] {
  const shuffled = [...STORY_STARTERS_POOL].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Returns one single completely random starter with random genre, audience and short length
 */
export function getRandomSingleStarter(): StoryStarter {
  const randomIndex = Math.floor(Math.random() * STORY_STARTERS_POOL.length);
  return STORY_STARTERS_POOL[randomIndex];
}

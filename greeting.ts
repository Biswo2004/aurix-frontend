/** Time-of-day greeting and a rotating quote for the empty chat screen. */

export type PartOfDay = "morning" | "afternoon" | "evening" | "night";

export function partOfDay(date: Date = new Date()): PartOfDay {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

export type Quote = { text: string; author?: string };

const QUOTES: Record<PartOfDay | "any", Quote[]> = {
  morning: [
    { text: "Well begun is half done.", author: "Proverb" },
    { text: "Every morning is a chance to start again." },
    { text: "The journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  ],
  afternoon: [
    { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
    { text: "Keep going. The middle is where the work gets done." },
    { text: "Well done is better than well said.", author: "Benjamin Franklin" },
  ],
  evening: [
    { text: "Small steps every day add up to big results." },
    { text: "Reflect on what went well today, then build on it." },
    { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant" },
  ],
  night: [
    { text: "The night is darkest just before the dawn.", author: "Thomas Fuller" },
    { text: "Rest is part of the work." },
    { text: "Imagination is more important than knowledge.", author: "Albert Einstein" },
  ],
  any: [
    { text: "The best way to predict the future is to invent it.", author: "Alan Kay" },
    { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
    { text: "Every expert was once a beginner." },
    { text: "Progress, not perfection." },
    { text: "Genius is one percent inspiration, ninety-nine percent perspiration.", author: "Thomas Edison" },
  ],
};

const HEADINGS: Record<PartOfDay, string[]> = {
  morning: ["Good morning", "Morning", "Rise and shine"],
  afternoon: ["Good afternoon", "Hope your afternoon is going well", "Afternoon"],
  evening: ["Good evening", "Evening", "Hope your day went well"],
  night: ["Working late", "Still up", "Late night"],
};

function pick<T>(items: T[], rand: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(rand() * items.length))] as T;
}

export type Greeting = { heading: string; quote: Quote };

/** Builds the heading ("Good morning, Sam.") and one quote. Pass a seeded `rand` in tests. */
export function makeGreeting(name: string, date: Date = new Date(), rand: () => number = Math.random): Greeting {
  const part = partOfDay(date);
  const lead = pick(HEADINGS[part], rand);
  const suffix = part === "night" ? "?" : ".";
  const heading = name ? `${lead}, ${name}${suffix}` : `${lead}${suffix}`;
  const pool = [...QUOTES[part], ...QUOTES.any];
  return { heading, quote: pick(pool, rand) };
}

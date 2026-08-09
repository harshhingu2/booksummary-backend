import mongoose from 'mongoose';
import fs from 'fs';

try {
  if (fs.existsSync('.env.local')) {
    process.loadEnvFile('.env.local');
  }
} catch (e) {}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Error: MONGODB_URI is not set in .env.local");
  process.exit(1);
}

const ChapterSchema = new mongoose.Schema({
  chapterNumber: { type: Number, required: true },
  title: { type: String, required: true },
});

const BookSummarySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    topic: { type: String, required: true },
    coverImage: { type: String, required: true },
    readingTimeMinutes: { type: Number, default: 10 },
    shortDescription: { type: String, required: true },
    content: { type: String, required: true }, // HTML content
    chapters: [ChapterSchema],
    isTopCombine: { type: Boolean, default: true },
  },
  { timestamps: true, strict: false }
);

const BookSummary =
  mongoose.models.BookSummary ||
  mongoose.model('BookSummary', BookSummarySchema, 'topcombinebooksummary');

const DUMMY_TOPIC_SUMMARIES = [
  {
    title: "The Psychology of Wealth & Financial Mastery",
    topic: "Money",
    coverImage: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=80",
    readingTimeMinutes: 14,
    isTopCombine: true,
    shortDescription: "Master the hidden psychology behind money, long-term asset creation, and achieving true financial autonomy.",
    chapters: [
      { chapterNumber: 1, title: "Mindset & Emotional Capital" },
      { chapterNumber: 2, title: "The Asset Engine vs Debt Traps" },
      { chapterNumber: 3, title: "Exponential Compounding Rules" },
      { chapterNumber: 4, title: "Designing Your Financial Autonomy" }
    ],
    content: `
      <h2>1. Mindset & Emotional Capital</h2>
      <p>True wealth is not merely a high balance in a bank account—it is the freedom to control your schedule. Managing money requires mastering <strong>emotional discipline</strong> over pure technical analysis.</p>
      <blockquote style="border-left: 4px solid #6366F1; padding-left: 14px; font-style: italic; margin: 16px 0; color: #4338CA;">"Financial autonomy is the ultimate luxury: waking up every morning knowing you own your time."</blockquote>
      
      <h2>2. The Asset Engine vs Debt Traps</h2>
      <p>Understanding how capital moves makes the difference between building wealth and staying stuck:</p>
      <ul>
        <li><strong>Growth Assets:</strong> Equity, income-generating investments, real estate, and scalable systems that compound over time.</li>
        <li><strong>Consumer Liabilities:</strong> High-interest financing, impulse purchases, and lifestyle creep that drain your monthly cash flow.</li>
      </ul>

      <h2>3. Exponential Compounding Rules</h2>
      <p>Small, steady investments consistently sustained over decades yield far greater results than erratic attempts to time market cycles.</p>
      <p><mark style="background-color: #FEF08A; padding: 2px 6px; border-radius: 4px;">Core Principle:</mark> Consistency and patience win over short-term speculation every single time.</p>

      <h2>4. Designing Your Financial Autonomy</h2>
      <p>Build a system that automates savings, minimizes unnecessary overhead, and preserves mental peace so you can focus on high-impact opportunities.</p>
    `
  },
  {
    title: "Mental Models & High-Stakes Decision Making",
    topic: "Psychology",
    coverImage: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=600&auto=format&fit=crop&q=80",
    readingTimeMinutes: 16,
    isTopCombine: true,
    shortDescription: "Discover powerful mental models, conquer cognitive biases, and refine your decision-making under uncertainty.",
    chapters: [
      { chapterNumber: 1, title: "Dual Processing: Instinct vs Logic" },
      { chapterNumber: 2, title: "Navigating Blindspots & Biases" },
      { chapterNumber: 3, title: "First-Principles & Inversion Thinking" }
    ],
    content: `
      <h2>1. Dual Processing: Instinct vs Logic</h2>
      <p>The human mind balances two fundamental operational systems:</p>
      <ul>
        <li><strong>System 1 (Intuitive):</strong> Ultra-fast, subconscious pattern recognition designed for quick daily survival choices.</li>
        <li><strong>System 2 (Analytical):</strong> Deliberate, structured reasoning essential for strategic planning and solving complex problems.</li>
      </ul>

      <h2>2. Navigating Blindspots & Biases</h2>
      <p>Every brain relies on mental shortcuts that can inadvertently warp reality:</p>
      <ol>
        <li><strong>Confirmation Bias:</strong> Actively seeking evidence that validates current beliefs while ignoring counter-arguments.</li>
        <li><strong>Availability Bias:</strong> Overweighting recent vivid events while underestimating baseline statistical probabilities.</li>
      </ol>

      <h2>3. First-Principles & Inversion Thinking</h2>
      <p>Deconstruct complex challenges into their foundational truths rather than reasoning by analogy. Always ask: <em>"What would cause this project to fail, and how can we prevent it right now?"</em></p>
    `
  },
  {
    title: "High Performance, Deep Work & Flow",
    topic: "Productivity",
    coverImage: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80",
    readingTimeMinutes: 12,
    isTopCombine: true,
    shortDescription: "Cultivate ruthless focus, eliminate digital fatigue, and unlock effortless state of flow.",
    chapters: [
      { chapterNumber: 1, title: "The Superpower of Deep Focus" },
      { chapterNumber: 2, title: "Eliminating Digital Noise" },
      { chapterNumber: 3, title: "Rituals for Peak Cognitive Output" }
    ],
    content: `
      <h2>1. The Superpower of Deep Focus</h2>
      <p>In a world dominated by constant notifications and surface-level tasks, the skill of <strong>uninterrupted concentration</strong> has become extraordinarily rare and valuable.</p>

      <h2>2. Eliminating Digital Noise</h2>
      <p>Protect your cognitive bandwidth by aggressively reducing digital friction:</p>
      <p><code style="background-color: #E0E7FF; color: #3730A3; padding: 6px 10px; border-radius: 6px;">Output Quality = Dedicated Time x Depth of Concentration</code></p>

      <h2>3. Rituals for Peak Cognitive Output</h2>
      <ul>
        <li><strong>Time-Blocking:</strong> Reserve uninterrupted 90-minute blocks specifically dedicated to critical, high-impact tasks.</li>
        <li><strong>Digital Fasting:</strong> Keep your mobile device outside the workspace during intense execution sessions.</li>
        <li><strong>Deliberate Recovery:</strong> Pair intense mental workouts with proper rest, sleep, and physical movement to sustain high energy.</li>
      </ul>
    `
  },
  {
    title: "Atomic Habits & Exponential Growth",
    topic: "Mindset",
    coverImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
    readingTimeMinutes: 13,
    isTopCombine: true,
    shortDescription: "Leverage identity-based habits, micro improvements, and sustainable daily routines for continuous self-mastery.",
    chapters: [
      { chapterNumber: 1, title: "The 1% Daily Compound Principle" },
      { chapterNumber: 2, title: "Identity-Driven Behavioral Shifts" },
      { chapterNumber: 3, title: "The Four Pillars of Habit Architecture" }
    ],
    content: `
      <h2>1. The 1% Daily Compound Principle</h2>
      <p>Focusing on <strong>1% micro-improvements each day</strong> results in a transformative 37x compounding effect over the span of a year. Big transformations are built on tiny daily decisions.</p>

      <h2>2. Identity-Driven Behavioral Shifts</h2>
      <p>True habits don't change through willpower alone—they shift when your self-identity changes:</p>
      <blockquote style="border-left: 4px solid #10B981; padding-left: 14px; font-style: italic; margin: 16px 0; color: #047857;">"Focus on who you want to become, not just what you want to achieve."</blockquote>

      <h2>3. The Four Pillars of Habit Architecture</h2>
      <ol>
        <li><strong>Make it Obvious:</strong> Optimize your environment so clear cues trigger desirable actions automatically.</li>
        <li><strong>Make it Attractive:</strong> Connect challenging habits with rewarding experiences.</li>
        <li><strong>Make it Frictionless:</strong> Lower the barrier to entry so execution takes minimal initial friction.</li>
        <li><strong>Make it Rewarding:</strong> Reinforce new routines with immediate positive feedback loops.</li>
      </ol>
    `
  }
];

async function seed() {
  try {
    console.log(`Connecting to MongoDB: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI);
    console.log("Connected!");
    
    // Clear old sample entries in topcombinebooksummary collection to populate new topic HTML structure
    await BookSummary.deleteMany({});
    const created = await BookSummary.insertMany(DUMMY_TOPIC_SUMMARIES);
    console.log(`Successfully seeded ${created.length} topic-based HTML summaries into 'dumbscroll.topcombinebooksummary'!`);
  } catch (error) {
    console.error("Error seeding data:", error);
  } finally {
    await mongoose.disconnect();
  }
}

seed();

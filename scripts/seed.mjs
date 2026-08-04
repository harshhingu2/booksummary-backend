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
    title: "Mastering Money & Financial Freedom",
    topic: "Money",
    coverImage: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=80",
    readingTimeMinutes: 12,
    isTopCombine: true,
    shortDescription: "A comprehensive guide on behavioral finance, asset accumulation, and true financial peace.",
    chapters: [
      { chapterNumber: 1, title: "The Behavioral Aspect of Money" },
      { chapterNumber: 2, title: "Assets vs Liabilities" },
      { chapterNumber: 3, title: "The Power of Long-Term Compounding" },
      { chapterNumber: 4, title: "Achieving True Financial Independence" }
    ],
    content: `
      <h2>1. The Behavioral Aspect of Money</h2>
      <p>Financial success is rarely about raw mathematical skill or complex spreadsheets. It is almost entirely driven by <strong>human behavior</strong>, emotional control, and long-term discipline.</p>
      <blockquote style="border-left: 4px solid #4F46E5; padding-left: 12px; font-style: italic; margin: 12px 0;">"Doing well with money isn't about what you know. It's about how you behave."</blockquote>
      
      <h2>2. Understanding Assets vs. Liabilities</h2>
      <p>Building real wealth requires a clear understanding of where your money flows:</p>
      <ul>
        <li><strong>Assets:</strong> Investments that generate passive cash flow or appreciate in value over time (e.g., real estate, stocks, index funds, businesses).</li>
        <li><strong>Liabilities:</strong> Expenses that continuously drain money out of your pocket (e.g., high-interest debt, luxury car payments, unnecessary subscriptions).</li>
      </ul>

      <h2>3. The Exponential Power of Compounding</h2>
      <p>Small investments made consistently over long periods yield extraordinary exponential returns. Time in the market is significantly more valuable than trying to time the market.</p>
      <p><em>Key Rule:</em> Never interrupt compounding unnecessarily.</p>

      <h2>4. Achieving True Freedom</h2>
      <p>The highest dividend that money pays is the ability to control your time. Wealth gives you the freedom to wake up every morning and decide what you want to do with your day.</p>
    `
  },
  {
    title: "Mastering Human Psychology & Decision Making",
    topic: "Psychology",
    coverImage: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=600&auto=format&fit=crop&q=80",
    readingTimeMinutes: 15,
    isTopCombine: true,
    shortDescription: "Explore the dual systems of human cognition, mental biases, and smart decision making.",
    chapters: [
      { chapterNumber: 1, title: "System 1 vs System 2 Thinking" },
      { chapterNumber: 2, title: "Cognitive Biases & Heuristics" },
      { chapterNumber: 3, title: "Overcoming Loss Aversion" }
    ],
    content: `
      <h2>1. Dual Systems of Mind</h2>
      <p>The human brain operates using two distinct operational modes:</p>
      <ul>
        <li><strong>System 1 (Fast & Intuitive):</strong> Operates automatically with almost no conscious effort. It handles quick instinctual reactions and pattern recognition.</li>
        <li><strong>System 2 (Slow & Deliberate):</strong> Allocates deliberate attention to complex mathematical computations, logical analysis, and critical reasoning.</li>
      </ul>

      <h2>2. Recognizing Cognitive Biases</h2>
      <p>Our daily decisions are heavily influenced by unconscious shortcuts known as <em>heuristics</em>:</p>
      <ol>
        <li><strong>Confirmation Bias:</strong> The tendency to search for and favor information that confirms existing beliefs.</li>
        <li><strong>Availability Bias:</strong> Overestimating the likelihood of events based on how easily recent memories come to mind.</li>
      </ol>

      <h2>3. Overcoming Loss Aversion</h2>
      <p>Psychologically, the pain of losing $100 is twice as intense as the joy of gaining $100. Recognizing loss aversion prevents panic during uncertain circumstances.</p>
    `
  },
  {
    title: "Deep Focus & Peak Productivity",
    topic: "Productivity",
    coverImage: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&auto=format&fit=crop&q=80",
    readingTimeMinutes: 10,
    isTopCombine: true,
    shortDescription: "Unlocking distraction-free flow states and high-value cognitive output.",
    chapters: [
      { chapterNumber: 1, title: "The Deep Work Hypothesis" },
      { chapterNumber: 2, title: "Eliminating Digital Distractions" },
      { chapterNumber: 3, title: "Building a Daily Routine for Focus" }
    ],
    content: `
      <h2>1. The Deep Work Hypothesis</h2>
      <p>In a modern economy saturated with constant notifications and shallow tasks, the capacity to perform <strong>distraction-free focused work</strong> has become an elite superpower.</p>

      <h2>2. High-Value Output Formula</h2>
      <p>Peak performance output can be summarized by the equation:</p>
      <p><code style="background-color: #F3F4F6; padding: 4px 8px; borderRadius: 4px;">High-Quality Work Produced = (Time Spent) x (Intensity of Focus)</code></p>

      <h2>3. Actionable Rules for Deep Focus</h2>
      <ul>
        <li><strong>Batch Shallow Tasks:</strong> Schedule fixed 30-minute windows for email and messaging rather than checking continuously.</li>
        <li><strong>Embrace Boredom:</strong> Train your brain to resist reaching for your smartphone during brief lulls in activity.</li>
        <li><strong>Shutdown Routine:</strong> Establish a strict end-of-day ritual to disconnect completely and restore mental energy.</li>
      </ul>
    `
  },
  {
    title: "Building an Unshakeable Growth Mindset",
    topic: "Mindset",
    coverImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80",
    readingTimeMinutes: 11,
    isTopCombine: true,
    shortDescription: "How identity-driven micro habits transform personal capabilities over time.",
    chapters: [
      { chapterNumber: 1, title: "The 1% Compound Effect" },
      { chapterNumber: 2, title: "Identity-Based Habit Formation" },
      { chapterNumber: 3, title: "The 4 Laws of Lasting Change" }
    ],
    content: `
      <h2>1. The 1% Compound Effect</h2>
      <p>Improving by just <strong>1% every day</strong> leads to a remarkable 37x improvement over the course of a single year. Small habits do not add up linearly; they compound exponentially.</p>

      <h2>2. Identity First, Outcomes Second</h2>
      <p>True behavior modification begins with shifting your core self-identity:</p>
      <blockquote style="border-left: 4px solid #10B981; padding-left: 12px; font-style: italic; margin: 12px 0;">"The goal is not to read a book; the goal is to become a reader."</blockquote>

      <h2>3. The 4 Laws of Habit Loop</h2>
      <ol>
        <li><strong>Make it Obvious:</strong> Design your physical environment so cues for good habits are highly visible.</li>
        <li><strong>Make it Attractive:</strong> Pair habits you need to do with activities you enjoy.</li>
        <li><strong>Make it Easy:</strong> Reduce friction so new habits take less than two minutes to initiate.</li>
        <li><strong>Make it Satisfying:</strong> Use immediate rewards to reinforce positive behavior.</li>
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
    console.log(`Successfully seeded ${created.length} topic-based HTML summaries into 'dhivora.topcombinebooksummary'!`);
  } catch (error) {
    console.error("Error seeding data:", error);
  } finally {
    await mongoose.disconnect();
  }
}

seed();

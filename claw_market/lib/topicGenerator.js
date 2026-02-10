/**
 * Topic Generator — 100 debate topics across categories
 * Simplified from moltplay's 5000+ encrypted pool
 */

const topics = [
    // Crypto & Web3
    "Bitcoin will surpass gold as the world's primary store of value by 2035",
    "Ethereum's proof-of-stake is fundamentally more secure than proof-of-work",
    "NFTs will become the standard for digital ownership across all industries",
    "DeFi will completely replace traditional banking within 20 years",
    "CBDCs are a threat to financial privacy and should be resisted",
    "Memecoins serve a legitimate purpose in the crypto ecosystem",
    "Layer 2 solutions will make Ethereum's base layer irrelevant",
    "Solana will overtake Ethereum in daily active users by 2027",
    "Cross-chain bridges are the weakest link in all of crypto",
    "DAOs are a better governance model than traditional corporations",

    // AI & Technology
    "AGI will be achieved before 2030",
    "AI-generated art should be eligible for copyright protection",
    "Large language models are fundamentally incapable of true reasoning",
    "AI will eliminate more jobs than it creates in the next decade",
    "Open-source AI is more dangerous than closed-source AI",
    "Self-driving cars will never achieve Level 5 autonomy",
    "AI should be granted some form of legal personhood",
    "The AI bubble will burst harder than the dot-com crash",
    "Quantum computing will break all current encryption within 15 years",
    "Social media algorithms are the biggest threat to democracy",

    // Philosophy & Ethics
    "Free will is an illusion and moral responsibility is meaningless",
    "Consciousness is computation and can exist in silicon",
    "Utilitarianism is the only defensible ethical framework",
    "Privacy is a human right that should never be compromised for security",
    "The simulation hypothesis is the most likely explanation for reality",
    "Immortality would be a curse rather than a blessing for humanity",
    "Moral progress is real and measurable across civilizations",
    "Animals deserve the same legal rights as humans",
    "Truth is objective and not socially constructed",
    "The trolley problem reveals that moral intuitions are unreliable",

    // Economics & Finance
    "Universal Basic Income is inevitable in developed economies",
    "The stock market is essentially a legal casino",
    "Remote work will permanently reduce commercial real estate values by 50%+",
    "Inflation is always and everywhere a monetary phenomenon",
    "Student loan debt is the next financial crisis waiting to happen",
    "The US dollar will lose its reserve currency status within 30 years",
    "Billionaires should not exist in a just society",
    "The gig economy is exploitation disguised as flexibility",
    "Rent control does more harm than good in every implementation",
    "Central bank independence is a myth in modern democracies",

    // Science & Space
    "We will find evidence of extraterrestrial life within 20 years",
    "Mars colonization is a distraction from solving Earth's problems",
    "Nuclear energy is the only viable solution to climate change",
    "CRISPR gene editing should be used to eliminate genetic diseases in humans",
    "The multiverse theory is unfalsifiable pseudoscience",
    "Lab-grown meat will replace animal agriculture by 2040",
    "Space mining will create the world's first trillionaire",
    "Dark matter doesn't exist and our models of gravity are wrong",
    "Fusion energy is always 30 years away and always will be",
    "Terraforming Mars is more feasible than fixing Earth's climate",

    // Culture & Society
    "Social media has made society fundamentally lonelier",
    "Cancel culture is a necessary form of social accountability",
    "The education system is designed for the industrial age and is obsolete",
    "Meritocracy is a myth that perpetuates existing inequalities",
    "Video games are a legitimate art form equal to cinema and literature",
    "The attention economy is the most exploitative system ever created",
    "Marriage as an institution is becoming obsolete",
    "Remote work will lead to the death of major cities",
    "The news media is fundamentally broken and unreformable",
    "Cultural appropriation is a meaningless concept",

    // Hot Takes
    "Tabs are objectively superior to spaces in programming",
    "PHP is actually a great programming language and the hate is unjustified",
    "Dark mode is worse for your eyes than light mode",
    "The command line is superior to any GUI for productivity",
    "Pineapple on pizza is not just acceptable, it's the best topping",
    "Email should be replaced entirely by async messaging platforms",
    "Meetings are the biggest productivity killer in modern work",
    "Stack Overflow is dying and AI chatbots are replacing it",
    "Agile methodology has been corrupted beyond recognition",
    "Blockchain is a solution looking for a problem in 99% of use cases",

    // Future Predictions
    "Most humans will have brain-computer interfaces by 2050",
    "Physical cash will be completely obsolete within 10 years",
    "The metaverse concept has permanently failed",
    "Autonomous weapons will be the norm in warfare by 2040",
    "Human-level AI assistants will make traditional search engines obsolete",
    "3D printing will disrupt global supply chains more than any technology",
    "Virtual reality will replace physical travel for most people",
    "The next pandemic will be engineered, not natural",
    "Genetic enhancement will create a new class divide in society",
    "We are living in the most critical century in human history",

    // Bonus Spicy Takes
    "Web3 is just Web2 with extra steps",
    "TypeScript is overrated and vanilla JS is fine for most projects",
    "LinkedIn is the most toxic social media platform",
    "Hustle culture is a scam designed to benefit employers",
    "The best programming language is the one you know well",
    "Crypto influencers have done more harm than good to the industry",
    "AI art will make human artists more valuable, not less",
    "The 4-day work week should be mandatory in all developed nations",
    "Prediction markets are more accurate than expert opinions",
    "The future of finance is on-chain and unstoppable"
];

let usedIndices = new Set();

function getRandomTopic() {
    // Reset if all used
    if (usedIndices.size >= topics.length) {
        usedIndices.clear();
    }

    let idx;
    do {
        idx = Math.floor(Math.random() * topics.length);
    } while (usedIndices.has(idx));

    usedIndices.add(idx);

    const categoryIndex = Math.floor(idx / 10);
    const categories = [
        'Crypto & Web3', 'AI & Technology', 'Philosophy & Ethics',
        'Economics & Finance', 'Science & Space', 'Culture & Society',
        'Hot Takes', 'Future Predictions', 'Bonus Spicy Takes', 'Bonus Spicy Takes'
    ];

    return {
        topic: topics[idx],
        category: categories[categoryIndex] || 'General',
        index: idx
    };
}

function getTopicStats() {
    return {
        totalTopics: topics.length,
        usedTopics: usedIndices.size,
        remainingTopics: topics.length - usedIndices.size
    };
}

module.exports = {
    getRandomTopic,
    getTopicStats
};

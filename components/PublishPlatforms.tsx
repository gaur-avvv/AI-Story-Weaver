import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLinkIcon, ChevronDownIcon } from './icons';

interface Platform {
  name: string;
  url: string;
  focus?: string;
}

interface PlatformCategory {
  title: string;
  emoji: string;
  platforms: Platform[];
}

const platformCategories: PlatformCategory[] = [
  {
    title: 'Web Novel & Fiction Platforms',
    emoji: '\uD83D\uDCDA',
    platforms: [
      { name: 'Royal Road', url: 'https://www.royalroad.com', focus: 'Fantasy/Sci-fi web novels' },
      { name: 'Scribble Hub', url: 'https://www.scribblehub.com', focus: 'Web fiction' },
      { name: 'Webnovel (Qidian)', url: 'https://www.webnovel.com', focus: 'Chinese translated' },
      { name: 'Wuxiaworld', url: 'https://www.wuxiaworld.com', focus: 'Wuxia/Xianxia novels' },
      { name: 'Gravity Tales', url: 'https://gravitytales.com', focus: 'Asian translated fiction' },
      { name: 'Volare Novels', url: 'https://www.volarenovels.com', focus: 'Chinese translations' },
      { name: 'Tapas', url: 'https://tapas.io', focus: 'Comics & light novels' },
      { name: 'Radish', url: 'https://radishfiction.com', focus: 'Romance/serialized' },
      { name: 'Dreame', url: 'https://www.dreame.com', focus: 'Romance stories' },
      { name: 'Goodnovel', url: 'https://www.goodnovel.com', focus: 'Romance/web novels' },
      { name: 'Ringdom', url: 'https://www.ringdom.com', focus: 'Romance platform' },
      { name: 'FicFun', url: 'https://www.ficfun.com', focus: 'Fan fiction' },
      { name: 'Inkitt', url: 'https://www.inkitt.com', focus: 'Story discovery' },
      { name: 'Swoonreads', url: 'https://www.swoonreads.com', focus: 'YA Romance' },
    ],
  },
  {
    title: 'General Fiction & Fan Fiction',
    emoji: '\u270D\uFE0F',
    platforms: [
      { name: 'Wattpad', url: 'https://www.wattpad.com', focus: 'General fiction' },
      { name: 'FanFiction.net', url: 'https://www.fanfiction.net', focus: 'Fan fiction' },
      { name: 'Archive of Our Own (AO3)', url: 'https://archiveofourown.org', focus: 'Fan fiction' },
      { name: 'FictionPress', url: 'https://www.fictionpress.com', focus: 'Original fiction' },
      { name: 'Booksie', url: 'https://www.booksie.com', focus: 'Writing community' },
      { name: 'StoryWrite', url: 'https://www.storywrite.com', focus: 'Writing community' },
      { name: 'Protagonize', url: 'https://www.protagonize.com', focus: 'Collaborative stories' },
      { name: 'Commaful', url: 'https://commaful.com', focus: 'Multimedia stories' },
      { name: 'Movellas', url: 'https://www.movellas.com', focus: 'Teen fiction' },
      { name: 'Underlined', url: 'https://www.getunderlined.com', focus: 'YA stories' },
      { name: 'Reedsy Prompts', url: 'https://reedsy.com/writing', focus: 'Writing prompts' },
      { name: 'Penana', url: 'https://www.penana.com', focus: 'Story platform' },
      { name: 'Sweek', url: 'https://sweek.com', focus: 'Mobile stories' },
    ],
  },
  {
    title: 'Ebook Publishing & Distribution',
    emoji: '\uD83D\uDCD6',
    platforms: [
      { name: 'Amazon Kindle Direct Publishing (KDP)', url: 'https://kdp.amazon.com', focus: 'Self-publishing' },
      { name: 'Apple Books', url: 'https://authors.apple.com', focus: 'Apple ecosystem' },
      { name: 'Google Play Books', url: 'https://play.google.com/books/publish', focus: 'Google ecosystem' },
      { name: 'Kobo Writing Life', url: 'https://www.kobo.com/writinglife', focus: 'Global distribution' },
      { name: 'Barnes & Noble Press', url: 'https://press.barnesandnoble.com', focus: 'B&N marketplace' },
      { name: 'Draft2Digital', url: 'https://www.draft2digital.com', focus: 'Multi-platform distribution' },
      { name: 'Smashwords', url: 'https://www.smashwords.com', focus: 'Indie ebook distribution' },
      { name: 'PublishDrive', url: 'https://www.publishdrive.com', focus: 'Global distribution' },
      { name: 'Reedsy', url: 'https://reedsy.com', focus: 'Professional publishing' },
      { name: 'StreetLib', url: 'https://www.streetlib.com', focus: 'European distribution' },
      { name: 'XinXii', url: 'https://www.xinxii.com', focus: 'European ebook store' },
    ],
  },
  {
    title: 'Direct Sales & Storefronts',
    emoji: '\uD83D\uDED2',
    platforms: [
      { name: 'Gumroad', url: 'https://gumroad.com', focus: 'Digital product sales' },
      { name: 'Payhip', url: 'https://payhip.com', focus: 'Digital downloads' },
      { name: 'Lemon Squeezy', url: 'https://www.lemonsqueezy.com', focus: 'Digital commerce' },
      { name: 'Sellfy', url: 'https://sellfy.com', focus: 'Creator storefront' },
      { name: 'SendOwl', url: 'https://www.sendowl.com', focus: 'Digital delivery' },
      { name: 'Leanpub', url: 'https://leanpub.com', focus: 'In-progress publishing' },
    ],
  },
  {
    title: 'Subscription & Library Platforms',
    emoji: '\uD83D\uDCF1',
    platforms: [
      { name: 'Storytel', url: 'https://www.storytel.com', focus: 'Audiobooks & ebooks' },
      { name: 'Nextory', url: 'https://www.nextory.com', focus: 'Subscription reading' },
      { name: 'BookBeat', url: 'https://www.bookbeat.com', focus: 'Subscription books' },
      { name: 'OverDrive', url: 'https://www.overdrive.com', focus: 'Library distribution' },
      { name: 'Hoopla', url: 'https://www.hoopladigital.com', focus: 'Library digital media' },
      { name: 'Scribd', url: 'https://www.scribd.com', focus: 'Reading subscription' },
      { name: '24symbols', url: 'https://www.24symbols.com', focus: 'Streaming books' },
      { name: 'Packt', url: 'https://www.packtpub.com', focus: 'Tech books' },
      { name: "O'Reilly", url: 'https://www.oreilly.com', focus: 'Tech learning platform' },
    ],
  },
  {
    title: 'Audiobook Creation & Distribution',
    emoji: '\uD83C\uDFA7',
    platforms: [
      { name: 'Audible (ACX)', url: 'https://www.acx.com', focus: 'Audiobook creation' },
      { name: 'Findaway Voices', url: 'https://www.findawayvoices.com', focus: 'Audiobook distribution' },
      { name: "Author's Republic", url: 'https://www.authorsrepublic.com', focus: 'Audiobook distribution' },
      { name: 'ListenUp', url: 'https://listenupaudiobooks.com', focus: 'Audiobook production' },
      { name: 'Tantor Media', url: 'https://www.tantor.com', focus: 'Audiobook publisher' },
      { name: 'Brilliance Audio', url: 'https://www.brillianceaudio.com', focus: 'Audiobook production' },
    ],
  },
];

const CategorySection: React.FC<{ category: PlatformCategory }> = ({ category }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-blue-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-blue-50/50 hover:bg-blue-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{category.emoji}</span>
          <h3 className="text-sm font-bold text-blue-900">{category.title}</h3>
          <span className="text-xs text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full">
            {category.platforms.length}
          </span>
        </div>
        <ChevronDownIcon
          className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
              {category.platforms.map((platform) => (
                <a
                  key={platform.name}
                  href={platform.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 px-3 py-2.5 bg-white border border-gray-100 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-blue-900 group-hover:text-blue-600 transition-colors truncate">
                      {platform.name}
                    </p>
                    {platform.focus && (
                      <p className="text-xs text-gray-500 truncate">{platform.focus}</p>
                    )}
                  </div>
                  <ExternalLinkIcon className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const PublishPlatforms: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-full max-w-3xl mx-auto"
    >
      <div className="bg-[#FFFDF7] rounded-2xl shadow-lg border-2 border-yellow-100 overflow-hidden">
        <div className="p-6 border-b-2 border-yellow-100">
          <h2 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
            <span>Publish & Distribute</span>
          </h2>
          <p className="text-sm text-blue-900/60 mt-1">
            Upload your ebooks, audiobooks, and videos to these platforms
          </p>
        </div>
        <div className="p-4 space-y-3">
          {platformCategories.map((category) => (
            <CategorySection key={category.title} category={category} />
          ))}
        </div>
        <div className="px-6 py-4 bg-yellow-50/50 border-t-2 border-yellow-100">
          <p className="text-xs text-center text-gray-500">
            Click any platform to open it in a new tab. Each platform has its own submission process.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

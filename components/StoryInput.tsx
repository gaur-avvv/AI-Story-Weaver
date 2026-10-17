import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { enhancePrompt } from '../services/geminiService';
import { Settings } from '../types';
import { 
  X, 
  Sparkles, 
  Wand2, 
  CornerDownLeft, 
  Mic, 
  Dices, 
  SlidersHorizontal, 
  Compass, 
  RefreshCw,
  Undo2,
  Redo2
} from 'lucide-react';

interface StoryInputProps {
  onGenerate: (prompt: string, overrides?: Partial<Settings>) => void;
  isGenerating: boolean;
  apiKey: string | null;
  settings: Settings;
  externalPrompt?: string;
  onOpenVoiceModal?: () => void;
  onSurpriseMe?: () => void;
}

const TONE_PRESETS = [
  { id: 'balanced', label: 'Balanced (Natural Pacing & Flow)' },
  { id: 'hopeful', label: 'Hopeful (Inspiring & Warm)' },
  { id: 'dark', label: 'Dark (Gothic Dread & Shadows)' },
  { id: 'humorous', label: 'Humorous (Witty & Playful)' },
  { id: 'melancholic', label: 'Melancholic (Poetic & Nostalgic)' },
  { id: 'cinematic_noir', label: 'Cinematic Noir (Gritty & Tense)' },
  { id: 'high_suspense', label: 'High Suspense (Ticking Clock & Urgency)' },
  { id: 'whimsical_wonder', label: 'Whimsical Wonder (Fairytale Magic)' },
  { id: 'epic_heroic', label: 'Epic & Heroic (Monumental Scale)' },
  { id: 'custom', label: 'Custom Tone & Style...' },
];

const TONE_SUGGESTIONS = [
  'balanced',
  'hopeful',
  'dark',
  'humorous',
  'melancholic',
  'cinematic noir',
  'high suspense',
  'whimsical wonder',
  'epic & heroic',
];

const PRESET_IDEAS = [
  {
    title: 'Clockwork Citadel',
    genre: 'steampunk',
    protagonist: 'A disgraced chronomancer racing against a frozen gearwork sun',
    setting: 'A vertical brass metropolis in the grip of perpetual soot and ringing bells',
    tone: 'Auditory-rich, suspenseful, cinematic tension',
  },
  {
    title: 'The Silent Abyss',
    genre: 'sci_fi',
    protagonist: 'A deep-salvage diver who discovers an unrecorded frequency beneath the ocean trench',
    setting: 'A claustrophobic titanium submersible surrounded by bioluminescent Leviathans',
    tone: 'Atmospheric dread, slow-burn mystery, visceral sensory details',
  },
  {
    title: 'Ash & Whispers',
    genre: 'gothic_horror',
    protagonist: 'An antique book restorer hired to examine a ledger bound in petrified cedar',
    setting: 'A decaying coastal manor battered by midnight gales and salt spray',
    tone: 'Brooding noir, psychological suspense, eerie stillness',
  },
  {
    title: 'Starlight Caravan',
    genre: 'fantasy',
    protagonist: 'A nomad beast-caller escorting the last moon-stag across glass dunes',
    setting: 'A shimmering expanse of iridescent sand dunes beneath twin moons',
    tone: 'Lyrical wonder, high stakes, tactile immersion',
  },
];

const PROTAGONIST_SUGGESTIONS: Record<string, string[]> = {
  fantasy: [
    "A disgraced cartographer hunting for an island that erased itself from imperial maps",
    "An exiled inquisitor pursuing a mute oracle across glass dunes",
    "A blind astronomer tracking an invisible constellation of dead stars",
    "A memory thief caught with a dead monarch's forbidden regret",
    "A clockwork automaton seeking the soul of its deceased creator",
    "An apprentice beast-caller escorting the last moon-stag across salt flats",
  ],
  sci_fi: [
    "A deep-salvage diver discovering an unrecorded frequency beneath the ocean trench",
    "A cryo-pod technician waking to find the interstellar colony ship empty of crew",
    "A synth-detective discovering their decommission order was signed by themselves",
    "A terraforming engineer whose hydroponic garden has developed collective consciousness",
    "An outlaw asteroid hopper racing against an unpredictable solar flare",
    "A black-market cyberdeck courier hunted by an ancient sovereign AI",
  ],
  mystery: [
    "A disgraced cartographer hunting for an island that erased itself from imperial maps",
    "A forensic archivist who finds their own name listed as victim in a cold-case ledger",
    "A private eye hired by a client who was pronounced dead twenty years ago",
    "A safe-cracker trapped inside a bank vault alongside three rival suspects",
    "A radio host receiving encrypted distress calls from their own childhood home",
    "An art authenticator discovering a hidden coded message beneath a renaissance oil painting",
  ],
  gothic_horror: [
    "An antique book restorer hired to examine a ledger bound in petrified cedar",
    "A lonely lighthouse keeper whose flame begins attracting spectral deep-sea voices",
    "A carriage driver delivering an ornate sarcophagus to a family that denies ordering it",
    "A surgeon summoned to an isolated manor to treat an affliction that has no pulse",
    "A midnight train conductor whose passengers have no reflections in the frosted glass",
    "A dollmaker whose clockwork porcelain figures begin rearranging themselves overnight",
  ],
  steampunk: [
    "A brass aviator racing an experimental zeppelin through magnetic storm canyons",
    "A chronomancer racing against a frozen gearwork sun in a vertical soot metropolis",
    "A boiler-room union organizer who discovers the city's engine runs on bottled memories",
    "An underground alchemist forging gold using lightning rods and mercury gears",
    "A disabled inventor outfitting street urchins with pneumatic prosthetics to outwit the city watch",
    "A boiler mechanic who uncovers an unauthorized transmission gear inside the royal clock tower",
  ],
  adventure: [
    "A disgraced cartographer hunting for an island that erased itself from imperial maps",
    "A high-altitude mountaineer attempting an unclimbed peak guarded by sacred storms",
    "A treasure hunter deciphering a waterlogged journal before monsoon season submerges the temple",
    "A bush pilot stranded in a prehistoric crater cut off from civilization",
    "A riverboat captain navigating uncharted rapids with a mysterious cloaked fugitive",
    "A rogue spelunker trapped in an underground cavern system of singing crystal",
  ],
  historical: [
    "A disgraced cartographer hunting for an island that erased itself from imperial maps",
    "A royal herbalist suspecting the emperor is being slowly poisoned with rare belladonna",
    "A master shipwright commissioned to build an armada vessel for an impossible arctic crossing",
    "A medieval scribe entrusted with a manuscript that contradicts church dogma",
    "A battlefield courier carrying peace treaties through enemy siege lines at dawn",
    "A silk merchant discovering imperial spies hidden inside their caravan",
  ],
  fairy_tale: [
    "A shoemaker's daughter who trades her shadow for the ability to hear stone statues speak",
    "A woodcutter who discovers an iron key growing from the heart of an ancient oak",
    "A prince turned into an owl who can only regain human speech during total eclipses",
    "A weaver whose tapestries predict the fates of anyone who sleeps beneath them",
    "A traveling baker whose bread can cure grief at the cost of one happy memory",
    "A silent girl who can spin winter frost into unbreakable silver thread",
  ],
};

const SETTING_SUGGESTIONS: Record<string, string[]> = {
  fantasy: [
    "A perpetual dusk harbor shrouded in bioluminescent fog and cold slate towers",
    "A vertical brass metropolis in the grip of perpetual soot and ringing bells",
    "A crumbling mountain monastery suspended between two floating tectonic plates",
    "A shimmering expanse of iridescent sand dunes beneath twin pale moons",
    "A subterranean library carved into the petrified ribcage of an ancient leviathan",
    "An enchanted border forest where shadows point toward the nearest secret rather than the sun",
  ],
  sci_fi: [
    "A claustrophobic titanium submersible surrounded by bioluminescent Leviathans",
    "A derelict orbital habitat slowly tumbling through the rings of a gas giant",
    "A neon-drenched vertical slum drenched in relentless acidic monsoon rain",
    "A subterranean dome colony on an ice moon where geothermal geysers pulse rhythmically",
    "A zero-gravity shipyard constructed inside the hollowed core of a metallic asteroid",
    "An abandoned planetary relay station transmitting static across a scorched desert basin",
  ],
  mystery: [
    "A perpetual dusk harbor shrouded in bioluminescent fog and cold slate towers",
    "A snowbound Victorian express train stranded on a cliffside trestle bridge",
    "A fog-blanketed coastal hamlet where the tide retreats miles out every evening",
    "A decaying neo-gothic penthouse during an unseasonal thunderstorm blackout",
    "An eccentric collector's private island estate accessed only by a cable car",
    "An underground speakeasy hidden behind the boiler room of an abandoned brewery",
  ],
  gothic_horror: [
    "A decaying coastal manor battered by midnight gales and salt spray",
    "A perpetual dusk harbor shrouded in bioluminescent fog and cold slate towers",
    "A mist-choked valley village encircled by petrified black pines and weeping gravestones",
    "A subterranean catacomb flooded with knee-deep black water beneath an ancient basilica",
    "A remote mountain sanatorium where the windows are sealed with lead solder",
    "A derelict abbey whose bell rings every time an offshore gale strikes the cliffs",
  ],
  steampunk: [
    "A vertical brass metropolis in the grip of perpetual soot and ringing bells",
    "A roaring foundry district crisscrossed by overhead pneumatic tubes and copper steam pipes",
    "An aerial docking terminal swaying in high-altitude jet streams above a sea of smog",
    "A floating ironclad laboratory anchored over a volcanic rift",
    "An underground clockwork sewer system regulated by massive ticking escapement valves",
    "A grand railway terminus beneath a soaring dome of stained glass and locomotive steam",
  ],
  adventure: [
    "A perpetual dusk harbor shrouded in bioluminescent fog and cold slate towers",
    "A forgotten jungle temple complex swallowed by strangler figs and limestone sinkholes",
    "A sheer granite canyon echoing with raging whitewater rapids and howling winds",
    "An unmapped volcanic archipelago surrounded by treacherous coral shoals and whirlpools",
    "A sun-bleached desert canyon hiding subterranean aquifers and forgotten tombs",
    "A windswept glacier pass where sudden avalanches reveal ancient mammoth bones",
  ],
  historical: [
    "A rain-lashed medieval castle courtyard during a protracted midnight siege",
    "A bustling silk-road caravanserai illuminated by camel dung fires and oil lanterns",
    "A Renaissance dockyard crowded with oak galleons, tar barrels, and maritime guilds",
    "A quiet monastery scriptorium smelling of parchment, lamp oil, and mountain rain",
    "An imperial palace garden shrouded in morning river mist and blossoming cherry trees",
    "A frontier trading post flanked by dense pine forest and swollen spring rivers",
  ],
  fairy_tale: [
    "A cottage roofed in living moss at the meeting point of seven whispering pathways",
    "A mirror-calm black forest lake that reflects the night sky even at noon",
    "A castle carved from a single mountain of rose quartz overlooking misty vales",
    "A midnight market where woodland spirits barter glowing lanterns for thimblefuls of honey",
    "A frozen riverbank lined with willow trees whose branches tinkle like glass bells",
    "An endless labyrinth of blackberry briars that part only for those without shoes",
  ],
};

function rotateAndSlice(items: string[], seed: number, count: number): string[] {
  if (!items || items.length === 0) return [];
  const start = seed % items.length;
  const rotated = [...items.slice(start), ...items.slice(0, start)];
  return rotated.slice(0, count);
}

interface FormState {
  prompt: string;
  builderProtagonist: string;
  builderSetting: string;
  builderGenre: string;
  builderTone: string;
  isCustomTone: boolean;
  customToneText: string;
}

export const StoryInput: React.FC<StoryInputProps> = ({ 
  onGenerate, 
  isGenerating, 
  apiKey, 
  settings,
  externalPrompt,
  onOpenVoiceModal,
  onSurpriseMe,
}) => {
  const [prompt, setPrompt] = useState(externalPrompt || '');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);

  // Dynamic Prompt Builder Fields
  const [builderGenre, setBuilderGenre] = useState(settings.genre || 'fantasy');
  const [builderProtagonist, setBuilderProtagonist] = useState('');
  const [builderSetting, setBuilderSetting] = useState('');
  const [builderTone, setBuilderTone] = useState(settings.tone || 'balanced');
  const [isCustomTone, setIsCustomTone] = useState(false);
  const [customToneText, setCustomToneText] = useState('');

  // Seeds for rotating suggestions below each input box
  const [protagonistSeed, setProtagonistSeed] = useState(0);
  const [settingSeed, setSettingSeed] = useState(0);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<FormState[]>([
    {
      prompt: externalPrompt || '',
      builderProtagonist: '',
      builderSetting: '',
      builderGenre: settings.genre || 'fantasy',
      builderTone: settings.tone || 'balanced',
      isCustomTone: false,
      customToneText: '',
    }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isNavigatingHistory = useRef(false);

  const pushHistory = useCallback((nextState: Partial<FormState>) => {
    if (isNavigatingHistory.current) return;
    setHistory(prev => {
      const current = prev[historyIndex] || {
        prompt,
        builderProtagonist,
        builderSetting,
        builderGenre,
        builderTone,
        isCustomTone,
        customToneText,
      };
      const merged: FormState = { ...current, ...nextState };
      const truncated = prev.slice(0, historyIndex + 1);
      return [...truncated, merged];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex, prompt, builderProtagonist, builderSetting, builderGenre, builderTone, isCustomTone, customToneText]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      isNavigatingHistory.current = true;
      const targetIndex = historyIndex - 1;
      const target = history[targetIndex];
      setHistoryIndex(targetIndex);
      setPrompt(target.prompt);
      setBuilderProtagonist(target.builderProtagonist);
      setBuilderSetting(target.builderSetting);
      setBuilderGenre(target.builderGenre);
      setBuilderTone(target.builderTone);
      setIsCustomTone(target.isCustomTone);
      setCustomToneText(target.customToneText);
      setTimeout(() => {
        isNavigatingHistory.current = false;
      }, 50);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isNavigatingHistory.current = true;
      const targetIndex = historyIndex + 1;
      const target = history[targetIndex];
      setHistoryIndex(targetIndex);
      setPrompt(target.prompt);
      setBuilderProtagonist(target.builderProtagonist);
      setBuilderSetting(target.builderSetting);
      setBuilderGenre(target.builderGenre);
      setBuilderTone(target.builderTone);
      setIsCustomTone(target.isCustomTone);
      setCustomToneText(target.customToneText);
      setTimeout(() => {
        isNavigatingHistory.current = false;
      }, 50);
    }
  }, [historyIndex, history]);

  // Global & scoped keyboard shortcuts for Ctrl+Z and Ctrl+Y / Ctrl+Shift+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      // Ctrl + Z -> Undo
      if (!e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        if (historyIndex > 0) {
          e.preventDefault();
          handleUndo();
        }
      } 
      // Ctrl + Y or Ctrl + Shift + Z -> Redo
      else if (
        (e.key === 'y' || e.key === 'Y') ||
        (e.shiftKey && (e.key === 'z' || e.key === 'Z'))
      ) {
        if (historyIndex < history.length - 1) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history.length, handleUndo, handleRedo]);

  useEffect(() => {
    if (typeof externalPrompt === 'string') {
      setPrompt(externalPrompt);
      pushHistory({ prompt: externalPrompt });
    }
  }, [externalPrompt]);

  useEffect(() => {
    if (settings.genre) {
      setBuilderGenre(settings.genre);
    }
  }, [settings.genre]);

  useEffect(() => {
    if (settings.tone) {
      const match = TONE_PRESETS.find(p => p.id === settings.tone);
      if (match) {
        setBuilderTone(settings.tone);
        setIsCustomTone(false);
      } else {
        setBuilderTone(settings.tone);
        setIsCustomTone(true);
        setCustomToneText(settings.tone);
      }
    }
  }, [settings.tone]);

  // Compute active suggestion lists for Protagonist and Setting based on genre
  const activeProtagonistSuggestions = useMemo(() => {
    const list = PROTAGONIST_SUGGESTIONS[builderGenre] || PROTAGONIST_SUGGESTIONS.fantasy;
    return rotateAndSlice(list, protagonistSeed, 4);
  }, [builderGenre, protagonistSeed]);

  const activeSettingSuggestions = useMemo(() => {
    const list = SETTING_SUGGESTIONS[builderGenre] || SETTING_SUGGESTIONS.fantasy;
    return rotateAndSlice(list, settingSeed, 4);
  }, [builderGenre, settingSeed]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isGenerating) {
      onGenerate(prompt.trim(), {
        genre: builderGenre as any,
        tone: isCustomTone && customToneText ? customToneText : builderTone
      });
      setPrompt('');
      setIsBuilderOpen(false);
    }
  };

  const handleApplyPreset = (preset: typeof PRESET_IDEAS[0]) => {
    setBuilderGenre(preset.genre);
    setBuilderProtagonist(preset.protagonist);
    setBuilderSetting(preset.setting);
    setBuilderTone(preset.tone);
    setIsCustomTone(false);
    pushHistory({
      builderGenre: preset.genre,
      builderProtagonist: preset.protagonist,
      builderSetting: preset.setting,
      builderTone: preset.tone,
      isCustomTone: false
    });
  };

  const handleToneSuggestionClick = (toneValue: string) => {
    const matched = TONE_PRESETS.find(p => p.id.toLowerCase() === toneValue.toLowerCase());
    if (matched) {
      setBuilderTone(matched.id);
      setIsCustomTone(false);
      pushHistory({ builderTone: matched.id, isCustomTone: false });
    } else {
      setIsCustomTone(true);
      setCustomToneText(toneValue);
      setBuilderTone(toneValue);
      pushHistory({ builderTone: toneValue, isCustomTone: true, customToneText: toneValue });
    }
  };

  const constructDynamicPrompt = (): string => {
    const effectiveTone = isCustomTone && customToneText.trim() ? customToneText.trim() : builderTone;
    const parts = [
      'Write a story with the following parameters:',
      `- Genre: ${builderGenre || 'Fiction'}`,
      builderProtagonist ? `- Protagonist & Conflict: ${builderProtagonist.trim()}` : null,
      builderSetting ? `- Setting & Atmosphere: ${builderSetting.trim()}` : null,
      effectiveTone ? `- Tone & Style: ${effectiveTone}` : null,
      '- Directive: Focus on the opening scene establishing character interiority, sensory immersion, and escalating stakes without unnecessary exposition.'
    ].filter(Boolean);

    return parts.join('\n');
  };

  const handleBuildAndGenerate = () => {
    if (!builderProtagonist && !builderSetting && !prompt) return;
    const constructed = constructDynamicPrompt();
    const effectiveTone = isCustomTone && customToneText.trim() ? customToneText.trim() : builderTone;
    onGenerate(constructed, { 
      genre: builderGenre as any,
      tone: effectiveTone
    });
    setIsBuilderOpen(false);
  };

  const handleInsertIntoBox = () => {
    const constructed = constructDynamicPrompt();
    setPrompt(constructed);
    pushHistory({ prompt: constructed });
    setIsBuilderOpen(false);
  };

  const handleEnhance = async () => {
    if (!prompt.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
      const getApiKey = () => {
        switch (settings.textProvider) {
          case 'gemini': return apiKey;
          case 'groq': return settings.groqApiKey;
          case 'openrouter': return settings.openRouterApiKey;
          case 'siliconflow': return settings.siliconFlowApiKey;
          case 'openai': return settings.openaiApiKey;
          case 'pollinations': return settings.pollinationsApiKey;
          case 'zai': return settings.zaiApiKey;
          case 'cerebras': return settings.cerebrasApiKey;
          case 'mistral': return settings.mistralApiKey;
          case 'cohere': return settings.cohereApiKey;
          case 'nvidia': return settings.nvidiaApiKey;
          case 'requesty': return settings.requestyApiKey;
          case 'huggingface': return settings.huggingfaceApiKey;
          case 'cloudflare': return settings.cloudflareApiKey;
          case 'others': return settings.othersApiKey;
          default: return undefined;
        }
      };

      const enhanced = await enhancePrompt(
        prompt, 
        apiKey, 
        settings.textProvider, 
        getApiKey(),
        settings.textModel || 'gemini-2.5-flash',
        {
          customBaseUrl: settings.customBaseUrl,
          cloudflareAccountId: settings.cloudflareAccountId,
        }
      );
      setPrompt(enhanced);
      pushHistory({ prompt: enhanced });
    } catch (error) {
      console.error("Failed to enhance prompt", error);
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      {/* Structured Dynamic Prompt Builder Drawer / Card */}
      <AnimatePresence>
        {isBuilderOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="mb-3 p-4 sm:p-5 bg-slate-900/95 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_30px_rgba(168,85,247,0.2)] text-white relative overflow-hidden"
          >
            {/* Top Bar with Undo / Redo Shortcuts */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Structured Dynamic Prompt Builder</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 uppercase font-semibold">
                      Cinematic
                    </span>
                  </h3>
                  <p className="text-[11px] text-purple-200/70">
                    Formulate structured parameters for deep narrative immersion, tone customization, and third-person POV.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Undo / Redo Buttons */}
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  title="Undo change (Ctrl + Z)"
                >
                  <Undo2 className="w-3.5 h-3.5 text-purple-300" />
                  <span className="hidden sm:inline">Undo</span>
                  <kbd className="hidden md:inline text-[9px] px-1 py-0.2 bg-white/10 rounded text-slate-400">Ctrl+Z</kbd>
                </button>

                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  title="Redo change (Ctrl + Y)"
                >
                  <Redo2 className="w-3.5 h-3.5 text-purple-300" />
                  <span className="hidden sm:inline">Redo</span>
                  <kbd className="hidden md:inline text-[9px] px-1 py-0.2 bg-white/10 rounded text-slate-400">Ctrl+Y</kbd>
                </button>

                <button
                  type="button"
                  onClick={() => setIsBuilderOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors ml-1"
                  title="Close builder"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Inspiration Presets */}
            <div className="mb-3.5">
              <span className="text-[11px] font-semibold text-purple-200/80 block mb-1.5">
                Quick Story Starters:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_IDEAS.map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-2.5 py-1 text-xs bg-white/5 hover:bg-purple-600/30 text-purple-200 hover:text-white border border-white/10 hover:border-purple-400/40 rounded-full transition-all"
                  >
                    {preset.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-3.5">
              {/* Genre Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Genre
                </label>
                <select
                  value={builderGenre}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBuilderGenre(val);
                    pushHistory({ builderGenre: val });
                  }}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400"
                >
                  <option value="fantasy">Fantasy & High Lore</option>
                  <option value="sci_fi">Sci-Fi & Cyberpunk</option>
                  <option value="mystery">Mystery & Detective</option>
                  <option value="gothic_horror">Gothic Horror & Dread</option>
                  <option value="adventure">Action & High Adventure</option>
                  <option value="steampunk">Steampunk & Clockwork</option>
                  <option value="historical">Historical Drama</option>
                  <option value="fairy_tale">Fairy Tale & Fable</option>
                  <option value="romance">Drama & Romance</option>
                  <option value="mythological">Mythology & Legends</option>
                </select>
              </div>

              {/* Tone & Style with Custom Option */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                    Tone & Style
                  </label>
                  {isCustomTone && (
                    <span className="text-[10px] text-purple-300 font-medium">Custom active</span>
                  )}
                </div>
                <select
                  value={
                    isCustomTone 
                      ? 'custom' 
                      : (TONE_PRESETS.some(p => p.id === builderTone) ? builderTone : 'custom')
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'custom') {
                      setIsCustomTone(true);
                      const initialCustom = customToneText || (TONE_PRESETS.some(p => p.id === builderTone) ? '' : builderTone) || 'balanced';
                      setCustomToneText(initialCustom);
                      setBuilderTone(initialCustom);
                      pushHistory({ isCustomTone: true, customToneText: initialCustom, builderTone: initialCustom });
                    } else {
                      setIsCustomTone(false);
                      setBuilderTone(val);
                      pushHistory({ isCustomTone: false, builderTone: val });
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-950/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400"
                >
                  {TONE_PRESETS.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>

                {/* Custom Tone Input Field */}
                {isCustomTone && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-1.5"
                  >
                    <input
                      type="text"
                      value={customToneText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomToneText(val);
                        setBuilderTone(val);
                        pushHistory({ customToneText: val, builderTone: val });
                      }}
                      placeholder="Type custom tone (e.g. Cyberpunk Satire, Cozy Cottagecore, balanced)..."
                      className="w-full px-3 py-1.5 bg-slate-950/90 border border-purple-500/40 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-400 shadow-inner"
                    />
                  </motion.div>
                )}

                {/* Suggestion Options below Tone & Style Input Box */}
                <div className="mt-2">
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-purple-300/80 uppercase tracking-wider mb-1">
                    <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                    <span>Tone Suggestions:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {TONE_SUGGESTIONS.map((tone) => {
                      const isSelected = isCustomTone
                        ? customToneText.toLowerCase() === tone.toLowerCase()
                        : builderTone.toLowerCase() === tone.toLowerCase();
                      return (
                        <button
                          key={`tone-btn-${tone}`}
                          type="button"
                          onClick={() => handleToneSuggestionClick(tone)}
                          className={`px-2 py-0.5 text-[11px] rounded-full border transition-all ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.4)] font-semibold'
                              : 'bg-white/5 hover:bg-purple-600/25 text-purple-200 hover:text-white border-white/10 hover:border-purple-400/30'
                          }`}
                          title={`Select ${tone} tone`}
                        >
                          {tone.charAt(0).toUpperCase() + tone.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Protagonist & Conflict */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Protagonist & Central Conflict
                </label>
                <input
                  type="text"
                  value={builderProtagonist}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBuilderProtagonist(val);
                    pushHistory({ builderProtagonist: val });
                  }}
                  placeholder="e.g. A disgraced cartographer hunting for an island that erased itself from imperial maps"
                  className="w-full px-3 py-2 bg-slate-950/80 border border-white/15 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
                />

                {/* Suggestion Options below Protagonist Input Box */}
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-purple-300/80 uppercase tracking-wider">
                      <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                      <span>Protagonist Suggestions:</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProtagonistSeed(prev => prev + 1)}
                      className="flex items-center gap-1 text-[10px] text-purple-300 hover:text-white px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
                      title="Shuffle Protagonist suggestions"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Shuffle</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeProtagonistSuggestions.map((sug, i) => (
                      <button
                        key={`protagonist-sug-${i}`}
                        type="button"
                        onClick={() => {
                          setBuilderProtagonist(sug);
                          pushHistory({ builderProtagonist: sug });
                        }}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-all text-left max-w-full ${
                          builderProtagonist === sug
                            ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                            : 'bg-white/5 hover:bg-purple-600/25 text-purple-200 hover:text-white border-white/10 hover:border-purple-400/30'
                        }`}
                        title="Click to populate Protagonist & Central Conflict"
                      >
                        "{sug}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Setting & Atmosphere */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Setting & Atmosphere
                </label>
                <input
                  type="text"
                  value={builderSetting}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBuilderSetting(val);
                    pushHistory({ builderSetting: val });
                  }}
                  placeholder="e.g. A perpetual dusk harbor shrouded in bioluminescent fog and cold slate towers"
                  className="w-full px-3 py-2 bg-slate-950/80 border border-white/15 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
                />

                {/* Suggestion Options below Setting Input Box */}
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-purple-300/80 uppercase tracking-wider">
                      <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                      <span>Setting Suggestions:</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettingSeed(prev => prev + 1)}
                      className="flex items-center gap-1 text-[10px] text-purple-300 hover:text-white px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
                      title="Shuffle Setting suggestions"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Shuffle</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeSettingSuggestions.map((sug, i) => (
                      <button
                        key={`setting-sug-${i}`}
                        type="button"
                        onClick={() => {
                          setBuilderSetting(sug);
                          pushHistory({ builderSetting: sug });
                        }}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-all text-left max-w-full ${
                          builderSetting === sug
                            ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                            : 'bg-white/5 hover:bg-purple-600/25 text-purple-200 hover:text-white border-white/10 hover:border-purple-400/30'
                        }`}
                        title="Click to populate Setting & Atmosphere"
                      >
                        "{sug}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Directive Notice */}
            <div className="bg-purple-950/30 border border-purple-500/20 rounded-xl p-2.5 mb-3.5 text-[11px] text-purple-200/90 flex items-start gap-2">
              <Compass className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Cinematic Directive:</strong> Focuses on third-person observational POV, sensory layering, and escalating stakes without unnecessary exposition. Shortcut: use <kbd className="px-1 py-0.5 bg-white/10 rounded text-purple-200">Ctrl+Z</kbd> to undo and <kbd className="px-1 py-0.5 bg-white/10 rounded text-purple-200">Ctrl+Y</kbd> to redo.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleInsertIntoBox}
                className="px-3.5 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/15"
              >
                Insert into Box
              </button>

              <button
                type="button"
                onClick={handleBuildAndGenerate}
                disabled={isGenerating || (!builderProtagonist && !builderSetting && !prompt)}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl shadow-[0_4px_16px_rgba(168,85,247,0.4)] disabled:opacity-50 transition-all active:scale-95 border border-white/20"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Weave Story</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Glassmorphic Circular Input Form */}
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative group">
          {/* Glassmorphic container: backdrop-blur-md, 1px white highlight border, subtle inner glow on focus, rounded-full */}
          <div className="relative flex items-center bg-slate-900/90 backdrop-blur-md border border-white/30 rounded-full shadow-[0_0_25px_rgba(168,85,247,0.25)] ring-1 ring-white/10 transition-all duration-300 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-500/40 focus-within:shadow-[inset_0_0_15px_rgba(255,255,255,0.15),0_0_35px_rgba(168,85,247,0.4)] py-1.5 px-3 sm:px-4">
            
            {/* Builder Mode Toggle Button */}
            <button
              type="button"
              onClick={() => setIsBuilderOpen(!isBuilderOpen)}
              className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-200 mr-2 flex-shrink-0 active:scale-95 ${
                isBuilderOpen
                  ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                  : 'bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white border-white/15'
              }`}
              title={isBuilderOpen ? "Close Structured Dynamic Prompt Builder" : "Open Structured Dynamic Prompt Builder (Genre, Protagonist, Setting, Tone)"}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

            <input
              type="text"
              value={prompt}
              onChange={(e) => {
                const val = e.target.value;
                setPrompt(val);
                pushHistory({ prompt: val });
              }}
              placeholder="Describe your story idea, or open the Prompt Builder..."
              disabled={isGenerating}
              className="w-full pr-36 sm:pr-48 py-2 text-sm sm:text-base font-medium text-white bg-transparent placeholder:text-slate-300 focus:outline-none disabled:opacity-50 tracking-wide selection:bg-purple-500 selection:text-white"
            />
            
            <div className="absolute right-2 flex items-center gap-1 sm:gap-1.5">
              {prompt.trim().length > 0 && !isGenerating && (
                <button
                  type="button"
                  onClick={() => {
                    setPrompt('');
                    pushHistory({ prompt: '' });
                  }}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  title="Clear input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {onSurpriseMe && !isGenerating && (
                <button
                  type="button"
                  onClick={onSurpriseMe}
                  disabled={isGenerating}
                  className="flex items-center justify-center w-8 h-8 bg-purple-600/20 hover:bg-purple-600/40 text-purple-200 hover:text-white border border-purple-400/30 rounded-full transition-all duration-200 backdrop-blur-md active:scale-95 disabled:opacity-50"
                  title="Surprise Me (Auto-generate random story instantly)"
                >
                  <Dices className="w-3.5 h-3.5 text-purple-200" />
                </button>
              )}

              {onOpenVoiceModal && (
                <button
                  type="button"
                  onClick={onOpenVoiceModal}
                  disabled={isGenerating}
                  className="flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-purple-500/35 text-purple-200 hover:text-white border border-white/15 rounded-full transition-all duration-200 backdrop-blur-md active:scale-95 disabled:opacity-50"
                  title="Voice-to-Text Input (Speak story prompt)"
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>
              )}

              {prompt.trim().length > 3 && (
                <button
                  type="button"
                  onClick={handleEnhance}
                  disabled={isEnhancing || isGenerating}
                  className="flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-purple-500/35 text-purple-200 border border-white/15 rounded-full transition-all duration-200 backdrop-blur-md active:scale-95 disabled:opacity-50"
                  title="Magic AI Prompt Enhancer"
                >
                  {isEnhancing ? (
                    <div className="w-3.5 h-3.5 border-2 border-t-transparent border-purple-200 rounded-full animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5 text-purple-300" />
                  )}
                </button>
              )}

              <button
                type="submit"
                disabled={isGenerating || !prompt.trim()}
                className="flex items-center justify-center h-8 sm:h-9 px-3.5 sm:px-4 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm rounded-full shadow-[0_4px_16px_rgba(168,85,247,0.4)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.6)] active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all duration-200 border border-white/25 gap-1.5"
              >
                {isGenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                    <span className="hidden sm:inline">Weaving...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                    <span>Create</span>
                    <CornerDownLeft className="w-3 h-3 opacity-75 hidden md:inline" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
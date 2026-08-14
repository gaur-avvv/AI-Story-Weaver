# StorySpark: Interactive Multi-Modal AI Storyteller & Studio

[![React](https://img.shields.io/badge/React-19.2-61dafb.svg?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg?style=flat&logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20GenAI-SDK%201.24-4285f4.svg?style=flat&logo=google)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

---

## 📌 Project Identity (Quick Copy)

### **Project Name**
> `StorySpark: Multi-Modal AI Storyteller & Studio`  
*(47 / 60 characters)*

### **Elevator Pitch**
> `Create interactive illustrated storybooks with branching plots, contextual AI art, voice narration, ambient soundscapes, and 1-click PDF & video exports.`  
*(148 / 200 characters)*

---

## 📖 Overview

**StorySpark** is an interactive, multi-modal generative AI storytelling platform that brings imaginative tales to life paragraph-by-paragraph. Built with **React 19**, **TypeScript**, and **Google Gemini**, StorySpark harmonizes natural language generation, real-time contextual illustration, expressive voice synthesis, adaptive VFX ambient soundscapes, and branching narrative decision trees.

Whether you are crafting bedtime fables for children, interactive sci-fi novels for teens, or branching fantasy adventures for adults, StorySpark creates an immersive, personalized multimedia storybook ready for reading, playback, and export.

---

## ✨ Key Features

### 1. 🎭 Paragraph-by-Paragraph Interactive Storytelling
- **Branching Decision Engine**: Dynamically creates "Choose-Your-Own-Adventure" narrative choices after each chapter segment.
- **Narrative Continuity**: Maintains cohesive story memory across choices, tracking character arcs, tone, and pacing.
- **Rebranching & Rewind**: Jump back to any previous chapter segment to explore alternative narrative branches and endings.
- **Audience Adaptation**: Adjusts narrative complexity and vocabulary dynamically for **Children**, **Teens**, or **Adults**.

### 2. 🎨 Contextual Visual Art Generation
- **Scene-Aware Painting**: Each paragraph triggers contextual prompts for matching high-definition scene illustrations.
- **Artistic Style Studio**: Choose between *Whimsical*, *Anime / Manga*, *Cinematic 3D*, *Watercolor*, *Cyberpunk*, *Dark Fantasy*, *Comic Book*, and *Minimalist Line Art*.
- **Shimmer Skeleton Preloaders**: High-polish skeleton animation states minimize perceived latency during visual synthesis.

### 3. 🎙️ Expressive Text-to-Speech (TTS) Voice Narration
- **Synchronized Audio Narration**: Automatic vocal synthesis for every chapter segment with real-time audio playback controls.
- **Multi-Provider & Voice Control**: Select diverse voice timbres, expressive cadence, and pitch settings.
- **Audio Scrubber & Playlists**: Seamlessly listen to individual segments or play through the entire tale continuously.

### 4. 🌌 Dynamic VFX & Ambient Soundscapes
- **Adaptive Story Analyzer**: Real-time natural language sentiment analyzer detects chapter mood (mysterious, battle, joyful, melancholic, ethereal).
- **Procedural Audio Synthesizer**: Web Audio API generates procedural ambient soundscapes, drone pads, nature rain, wind, and resonant chords tailored to current narrative tension.
- **Reactive UI Aura**: The application canvas pulses with custom ambient glows, dynamic color harmonies, and particle effects matching the chapter's emotional frequency.

### 5. 👓 Reading Customization & Focus Mode
- **Custom Reading Typography**: Toggle effortlessly between **Serif (Classic Storybook)**, **Sans-Serif (Modern Clean)**, and **Monospace (Retro Typewriter)** fonts.
- **Distraction-Free Focus Mode**: One-click distraction-free full-screen reader (with `Esc` keyboard shortcut) that hides chrome and toolbars for uninterrupted reading.
- **Container Query Responsive Layouts**: Card media frames, text sizes, and choice buttons scale smoothly across desktop, tablet, and mobile displays using modern CSS `@container` queries.

### 6. 📦 1-Click Publishing & Export Suite
- **Illustrated PDF Storybook Creator**: Generates high-resolution multi-page printable storybooks with custom AI cover art, justified typography, and page numbers via `jsPDF` and `html2canvas`.
- **Animated Audio-Synced Video Generator**: Converts the interactive story into an animated MP4 / WebM video with synchronized audio voiceover, animated subtitles, and smooth visual pan transitions using HTML5 Canvas & Web Audio decoders.
- **Story Library & Local Persistence**: Automatically archives saved stories, cover art, and branches in local client-side storage for instant offline revisitation.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Presentation                           │
│     React 19 • Tailwind CSS • Framer Motion • Container Queries         │
│  ┌───────────────────────┐ ┌───────────────────┐ ┌───────────────────┐  │
│  │ StoryDisplay & Cards  │ │ Settings & Studio │ │   Focus Reader    │  │
│  └──────────┬────────────┘ └─────────┬─────────┘ └─────────┬─────────┘  │
└─────────────┼────────────────────────┼─────────────────────┼────────────┘
              │                        │                     │
┌─────────────▼────────────────────────▼─────────────────────▼────────────┐
│                       Core Application Orchestration                    │
│                             (App.tsx State Engine)                      │
├───────────────────────┬─────────────────────────┬───────────────────────┤
│    Story Generator    │     Visual Effects      │    Audio Controller   │
│   (Branching State)   │   (VfxContext & Glow)   │ (Web Audio Synthesis) │
└───────────┬───────────┴────────────┬────────────┴──────────┬────────────┘
            │                        │                       │
┌───────────▼────────────────────────▼───────────────────────▼────────────┐
│                         Service Integration Layer                       │
├─────────────────────────┬─────────────────────────┬─────────────────────┤
│      geminiService      │       musicService      │    storageService   │
│ • Story text generation │ • Web Audio Oscillators │ • LocalStorage      │
│ • Visual prompt synth   │ • Realtime synth pads   │ • Story Library     │
│ • TTS speech audio      │ • Mood audio modulation │ • Branch history    │
│ • Image synthesis       │                         │                     │
└───────────┬─────────────┴─────────────────────────┴─────────────┬───────┘
            │                                                     │
┌───────────▼─────────────────────────────────────────────────────▼───────┐
│                          Export & Media Engines                         │
├─────────────────────────────────────────┬───────────────────────────────┤
│             PDF Generator               │         Video Engine          │
│ • jsPDF (A4 layout engine)              │ • HTML5 Canvas Renderer       │
│ • html2canvas rasterizer                │ • Web Audio Buffer Mixer      │
│ • Base64 Image pre-fetch CORS pipeline  │ • MediaRecorder (MP4 / WebM)  │
└─────────────────────────────────────────┴───────────────────────────────┘
```

---

## ⚙️ How It Works (Step-by-Step Data Flow)

```
[ User Prompt / Genre / Audience ]
                │
                ▼
1. Narrative Generation (gemini-2.5-flash)
   ├── Streams or resolves current paragraph text
   └── Proposes 2-3 branching choices for next chapter
                │
         ┌──────┴──────────────────────────┐
         ▼                                 ▼
2. Visual Prompt Generation         3. Speech Audio Synthesis
   ├── Analyzes paragraph scenery      └── Calls TTS voice API
   └── Generates matching scene image      └── Returns Base64 audio buffer
         │                                 │
         └──────────────┬──────────────────┘
                        ▼
4. VFX Mood & Sentiment Analysis
   ├── Natural language sentiment classifier determines mood
   ├── Synthesizes procedural ambient harmonic audio frequencies
   └── Updates canvas dynamic lighting aura & card themes
                        │
                        ▼
5. Interactive Reader & Decision Choice
   ├── User listens to narration, reads story with preferred font
   └── Selects next branch choice ──► Loop back to step 1
                        │
                        ▼
6. Export Pipeline (PDF / Video)
   ├── PDF: Renders vector cover + high-res illustrated pages
   └── Video: Paints canvas frames with audio stream into MP4/WebM
```

---

## 💻 Tech Stack & Dependencies

| Category | Technology / Library | Purpose |
|---|---|---|
| **Framework** | **React 19.2** | Modern component lifecycle & declarative rendering |
| **Language** | **TypeScript 5.8** | Full type safety across narrative, audio, and video models |
| **Build Tool** | **Vite 6.2** | Ultra-fast HMR and production bundle optimization |
| **Styling** | **Tailwind CSS v4** | Modern utility styling, container queries, and animations |
| **Animations** | **Framer Motion 12.23** | Fluid page transitions, modal spring physics, and cards |
| **AI Models** | **`@google/genai` (Gemini)** | Text narrative, multimodal image generation & voice TTS |
| **Alternative AI** | **OpenAI SDK / Groq / OpenRouter**| Multi-provider fallback for text and visual synthesis |
| **PDF Export** | **jsPDF 4.2** & **html2canvas 1.4** | Multi-page illustrated PDF book rasterization & download |
| **Video Export** | **Web Audio API + Canvas + MediaRecorder** | Real-time frame rendering with synchronized speech audio |
| **Icons** | **Lucide React** | Comprehensive vector iconography |
| **Audio Synthesis**| **Web Audio API (AudioContext)** | Procedural ambient audio synthesizer & tone generators |

---

## 🚀 Future Roadmap & Enhancements

### 🤖 1. AI Agent Model Context Protocol (MCP) Integration
- **Direct eBook Commerce Agent**: Expose MCP tools (`publish_ebook`, `create_gumroad_listing`, `mint_story_nft`) allowing autonomous agents to format, price, and list stories on Amazon Kindle Direct Publishing (KDP), Gumroad, or Payhip directly from the browser.
- **Autonomous Editor Agent**: An in-app agent that critiques narrative pacing, checks plot inconsistencies, and suggests richer character backstories.

### 📹 2. One-Click Social Video Publisher (TikTok, Shorts, Reels)
- **Vertical 9:16 Auto-Framing**: AI-assisted smart pan-and-scan camera motions tailored for TikTok and YouTube Shorts.
- **Direct Platform Uploads**: OAuth integration with YouTube Data API and TikTok Content Posting API for instant one-click publishing with auto-generated hashtags and descriptions.
- **Dynamic Kinetic Captions**: Synchronized karaoke-style animated text overlays on exported videos.

### 🎭 3. Multi-Voice Character Casting & Cloned Audio
- **Character Voice Assignment**: Automatically detects distinct characters in dialogue and assigns separate AI voices to each speaker with unique pitch, emotion, and cadence.
- **Custom Voice Cloning**: Allow users to record a 10-second sample to narrate stories in their own voice.

### 🌐 4. Collaborative Multiplayer Storytelling
- **WebSockets / Live Co-Authoring**: Allow friends or classrooms to vote in real-time on branching narrative choices or write alternating chapters together.

### 📖 5. 3D WebXR Interactive Pop-Up Book
- **Three.js Interactive Pop-Up Canvas**: Turn illustrated segments into tactile, flip-page 3D pop-up scenes with depth parallax effects and spatial ambient audio.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or bun

### Installation
```bash
# Clone repository
git clone https://github.com/your-username/ai-storyteller.git
cd ai-storyteller

# Install dependencies
npm install

# Run development server
npm run dev
```

### Environment Variables
Configure your API keys in the app settings panel or in a `.env` file:
```env
# Optional server-side or client variables
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).

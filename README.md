<div align="center">

# 🌟 Novellaio
### Interactive Multi-Modal AI Storytelling Studio & Autonomous MCP Agent Engine

[![Novellaio Studio Banner](./assets/hero-banner.svg)](https://github.com/your-username/ai-storyteller)

<br/>

[![React](https://img.shields.io/badge/React-19.2-61dafb.svg?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20GenAI-SDK%201.24-4285f4.svg?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-2024--11--05-8a2be2.svg?style=for-the-badge)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg?style=for-the-badge)](LICENSE)

<br/>

**Weave, illustrate, narrate, and publish interactive branching storybooks powered by cutting-edge Multi-Modal AI and autonomous agent toolkits.**

[Quick Start](#-getting-started) • [How It Works](#-how-it-works-step-by-step) • [Key Features](#-comprehensive-feature-suites) • [MCP Agent Studio](#-model-context-protocol-mcp-agent-studio) • [Architecture](#-system-architecture) • [Publishing & Video](#-publishing--multi-format-export-engine)

</div>

---

## 📌 Project Identity

- **Project Name:** `Novellaio: Multi-Modal AI Storyteller & Studio`
- **Elevator Pitch:** `Create interactive illustrated storybooks with branching plots, contextual AI art, voice narration, ambient soundscapes, dynamic lore knowledge graphs, MCP agent toolkits, EPUB & video exports.`
- **Target Audience:** Readers, educators, writers, game masters, children, teens, and developers integrating autonomous AI agents.

---

## 📖 Executive Summary

**Novellaio** is an interactive, multi-modal generative AI storytelling platform and creative production studio. Built on modern web standards (**React 19**, **TypeScript 5.8**, **Vite 6**, and **Tailwind CSS v4**), Novellaio bridges large language models, computer graphics generation, speech synthesis, procedural audio synthesis, and autonomous agent orchestration via the official **Model Context Protocol (MCP 2024-11-05 specification)**.

Whether creating whimsical bedtime fables for children, interactive mystery thrillers for young adults, or epic multi-chapter fantasy novels, Novellaio transforms simple ideas into living, illustrated, voiced, and exportable multimedia books.

---

## 🔄 End-to-End Generative Lifecycle

[![Novellaio Workflow Diagram](./assets/workflow-diagram.svg)](./assets/workflow-diagram.svg)

---

## 💡 What Makes Novellaio Unique?

[![Novellaio Feature Matrix](./assets/feature-matrix.svg)](./assets/feature-matrix.svg)

1. **Paragraph-by-Paragraph Interactive Branching (CYOA)**: Rather than generating a static wall of text, stories unfold sequentially with rich illustrations and 2–4 narrative decision choices after each segment.
2. **Contextual Multi-Style Visual Synthesis**: Scene-aware prompt synthesis crafts matched artwork in **15 curated art styles** (from Anime and Whimsical Watercolor to 3D Pixar, Claymation, and Cyberpunk).
3. **Dynamic Lore & Semantic Knowledge Graph**: Extracts entity triples (characters, locations, magical items, factions, events) and tracks character emotional arcs to prevent continuity drift in long narratives.
4. **Procedural Web Audio Mood Soundscapes**: Real-time synthesized ambient pads, nature soundscapes, and harmonic chords tailored to story sentiment using Web Audio API—with **zero external audio assets required**.
5. **Native Model Context Protocol (MCP) Server**: Exposes complete storytelling, art synthesis, narrative flow auditing, and publishing capabilities as standardized JSON-RPC 2.0 tools for **Claude Desktop**, **Cursor IDE**, and **Gemini ADK agents**.
6. **Worker-Accelerated Publishing Suite**: Pure client-side compilation of valid **EPUB 3.0 eBooks**, **multi-themed PDF books** via OffscreenCanvas web workers, and **social video reels (9:16 / 16:9 / 1:1)** with karaoke-style synchronized subtitles.

---

## 🚀 How It Works (Step-by-Step)

```
  ┌─────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
  │ 1. Story Prompt │ ───► │ 2. Multi-Modal Gen      │ ───► │ 3. Lore & VFX Engine    │
  │    & Settings   │      │    • Text Paragraphs    │      │    • Entity Graph       │
  │    • Genre      │      │    • Scene Illustration │      │    • Sentiment Arc      │
  │    • Art Style  │      │    • Voice Narration    │      │    • Ambient Synth      │
  │    • Audience   │      │    • Branching Choices  │      │    • Plot Twist Engine  │
  └─────────────────┘      └─────────────────────────┘      └─────────────────────────┘
                                                                         │
  ┌─────────────────┐      ┌─────────────────────────┐                  │
  │ 5. Multi-Format │ ◄─── │ 4. Interactive Studio   │ ◄────────────────┘
  │    Publishing   │      │    • Branch Rewind      │
  │    • EPUB 3.0   │      │    • Chapter Outline    │
  │    • Themed PDF │      │    • Audio Scrubber     │
  │    • 9:16 Video │      │    • Model Switching    │
  │    • MCP Server │      └─────────────────────────┘
  └─────────────────┘
```

### Step 1: Prompt & World Calibration
- Enter a story seed or click the **Microphone** icon for hands-free voice dictation.
- Select from **16 story genres** (*Fantasy, Sci-Fi, Mystery, Adventure, Superhero, Romance, Horror, Historical, Bedtime, etc.*).
- Calibrate the **Target Audience** (*Children, Teen, Adult*) to automatically tailor vocabulary, moral depth, and narrative pacing.
- Pick a target **Story Length** (*Very Short: 3–5 segments, Short: 6–8, Medium: 10–14, Long: 18–24, Very Long: 30+*).
- Choose from **15 distinct visual art styles** (*Whimsical, Anime/Manga, 3D CGI, Classical Oil, Pixel Art, Watercolor, etc.*).

### Step 2: Multi-Modal Chapter & Scene Synthesis
- The selected AI engine (Google Gemini 2.5 Flash, Puter.js, Groq, OpenAI, etc.) generates the narrative paragraph with rich sensory details.
- Simultaneously, scene-aware prompts are dispatched to synthesize matching scene artwork (Google Imagen 3, Pollinations Flux/SDXL, SiliconFlow, DALL-E 3).
- Expressive Text-to-Speech (TTS) synthesizes synchronized voice narration for the generated text.
- The engine generates 2–4 logical branching decision choices or allows typing custom actions.

### Step 3: Semantic Knowledge Graph & Ambient VFX
- The **Graph Extractor** parses entities (*characters, places, items, factions, events*) and registers relations into the **Global Story Graph**.
- Emotional sentiment is computed for the chapter segment, updating character arc timelines.
- The **Web Audio Procedural Synthesizer** dynamically morphs background ambient drone frequencies, nature textures (rain, wind), and chord progressions to match the narrative tension.
- The **VFX Aura Canvas** shifts ambient background glows and particle streams to mirror the mood.

### Step 4: Interactive Reading & Time-Travel Rewind
- Read the illustrated segment in high-contrast typography with customizable book fonts (*Cinzel, Merriweather, Lora, Outfit, MedievalSharp, Caveat, Playfair Display*) and an interactive **Font Size Slider** (14px–28px with live preview & quick presets).
- Listen with the floating continuous audio player or seek through individual paragraph scrubbers.
- Use **Rebranch & Rewind** to step back to any previous chapter segment and explore alternative timelines.
- Open the **Plot Twists Panel** for AI-suggested unexpected turns across 6 categories (*Shock Revelation, Supernatural Shift, Betrayal, Dramatic Catalyst, Cryptic Mystery, High Stakes Action*).

### Step 5: Professional Publishing & Agent Orchestration
- **EPUB 3.0**: 1-click generation of fully compliant `.epub` books with cover art and table of contents for Apple Books, Kindle, and Kobo.
- **Worker-Rendered PDF**: Export formatted books in 15 designer themes with full font size and typography persistence using background OffscreenCanvas threads.
- **Social Video Reels Studio**: Record 9:16 vertical shorts or 16:9 widescreen videos with word-by-word karaoke-style highlighted subtitles, discreet top-right watermark, and Ken Burns motion.
- **MCP Server**: Connect autonomous AI agents in Claude Desktop, Cursor, or Gemini ADK to co-author and manage stories via JSON-RPC 2.0.

---

## ✨ Comprehensive Feature Suites

### 1. 🎭 Interactive Story Engine & Branching CYOA
- **Branching Decision Engine**: 2–4 dynamically calculated narrative choices after each paragraph.
- **Custom Player Prompts**: Ability to override preset choices and type freeform character actions.
- **AI Plot Twist Generator**: Context-aware sudden twists with category badges and automatic lore memory injection.
- **Non-Destructive Rebranching**: Rewind to any prior story branch without losing parent state.
- **Chapter Outline Drawer**: Visual table of contents tracking chapter titles, segment counts, reading times, and quick navigation.

### 2. 🎨 Multi-Provider Visual Art Studio
- **Ultra-Sharp High-Fidelity Synthesis**: Enhanced prompt construction with deep scene context awareness, 8k texture clarity, raytraced volumetric lighting, and razor-sharp outlines matching the chosen style.
- **Top-Aligned Subject Framing**: Intelligent portrait and widescreen headroom ensuring character faces, eyes, and expressions are never cut off or cropped awkwardly.
- **20+ Curated Art Styles**:
  | Style | Visual Archetype | Best For |
  | :--- | :--- | :--- |
  | **Whimsical** | Vibrant storybook watercolors, playful lighting | Children & bedtime fables |
  | **Anime / Manga** | Makoto Shinkai aesthetic, luminous skies | Fantasy, YA, Sci-Fi |
  | **Studio Ghibli** | Nostalgic hand-painted pastoral backgrounds | Heartfelt magic, folklore |
  | **3D Pixar / CGI** | Volumetric lighting, stylized 3D character design | Animated family adventures |
  | **Cinematic Realistic** | Photorealistic 35mm film rendering, depth of field | Mystery, thrillers, drama |
  | **Pixel Art** | 16-bit retro isometric sprite rendering | Sci-fi, comedy, retro quests |
  | **Classical Oil** | Renaissance brushwork, chiaroscuro lighting | Historical fiction & high fantasy |
  | **Claymation** | Tactile stop-motion textures, studio lighting | Whimsical, comedy, novelty |
  | **Cyberpunk** | High-contrast neon hues, rain-slicked chrome | Dystopian sci-fi, urban noir |
  | **Ukiyo-e** | Traditional Japanese woodblock print & washi | Historical myths & samurai lore |
  | **Stained Glass** | Luminous jewel-toned gothic leaded glass | Sacred legends, cathedral lore |
  | **Paper Cutout** | Layered 3D tactile papercraft with depth | Bedtime, children, whimsical |
  | **Pop Art Comic** | Ben-Day dots, bold ink lines, dynamic angles | Superhero, action graphic novels |
- **Shimmer Skeleton Preloaders**: High-polish animated loading states while graphics are rendered.
- **Single-Scene Regenerator**: Re-roll any individual illustration with adjusted style or prompt overrides.

### 3. 🎙️ Expressive Audio Narration & Web Audio Synth
- **Multi-Provider TTS**: Google Gemini Expressive TTS (Default), OpenAI Voice Engine (Alloy, Echo, Fable, Onyx, Nova, Shimmer), and Pollinations TTS.
- **Continuous Global Audio Player**: Floating bottom controller with playback progression, chapter skips, speed controls (0.75x–2.0x), and volume mixer.
- **Procedural Ambient Music Engine**: Custom Web Audio oscillators generate generative drones, pad chords, and atmospheric textures matched to genre and sentiment without external audio files.

### 4. 🧠 Entity Lore & Knowledge Graph
- **Entity Semantic Extraction**: Identifies characters, locations, artifacts, factions, and key plot events.
- **Relationship Triples**: Maps connections (e.g., `[Elena] --(guards)--> [Sunken Relic]`).
- **Emotional Timeline**: Visualizes sentiment evolution per character across the story.
- **Context Injection**: Automatically injects lore summaries into future LLM generation prompts to eliminate character amnesia.

### 5. 📚 Automated eBook & PDF Publishing
- **Standard EPUB 3.0 Compiler**: Pure client-side generation of valid `.epub` files ready for major eBook readers.
- **OffscreenCanvas Web Worker PDF Export**: Multi-page rendering offloaded to dedicated web workers to eliminate UI freezing during high-res canvas composition.
- **15 Designer PDF Themes**: *Midnight Slate*, *Classic Ivory*, *Emerald Parchment*, *Royal Slate*, *Cyberpunk*, *Sunset Crimson*, *Warm Amber*, *Rose Gold*, *Starlight Sapphire*, *Forest Whisper*, *Lavender Dream*, *Dark Obsidian*, *Cozy Autumn*, *Nordic Frost*, *Neon Synthwave*.
- **Themed Borders & Refined Layout**: Story images feature delicate theme-matched rounded borders, bottom-aligned page transitions, and proportional cover page titles.
- **Story-Titled Naming**: Automatic filename sanitization ensuring all exports match the story's actual title.

### 6. 🎬 Social Video Reels Studio & Karaoke Subtitles
- **Multi-Aspect Ratio Canvas**: 9:16 (TikTok / Reels / Shorts), 16:9 (YouTube), 1:1 (Instagram).
- **Discreet Top-Right Watermark**: Elegant `✦ StorySpark AI` branding rendered in the top-right corner across video exports and real-time previews.
- **Karaoke Word-by-Word Subtitles**: Synchronized golden active word highlighting matching speech cadence.
- **Ken Burns Cinematic Motion**: Dynamic zoom-and-pan cameras across scene illustrations.
- **Dual-Stem Audio Recorder**: Combines speech voiceovers and procedural ambient background music into a single recorded canvas stream.

### 7. 🌐 Cloud Storage & Community Integrations
- **Google Workspace & Drive**: Export chapters as formatted Google Docs and manage Google Drive cloud backups.
- **GitHub Gists**: Publish open markdown storybooks directly to GitHub.
- **Discord Community Webhooks**: Dispatch story releases, art cards, and branching polls to Discord server channels.
- **Puter.js Cloud Sync**: Instant cloud synchronization of story libraries with zero backend requirement.

---

## 🔌 Model Context Protocol (MCP) Agent Studio

Novellaio implements the official **Model Context Protocol (MCP 2024-11-05 specification)** at `/api/mcp`. It exposes the full storytelling and publishing pipeline as JSON-RPC 2.0 tools for autonomous agents.

```
  ┌────────────────────────────────────────────────────────┐
  │             External AI Agent Ecosystem               │
  │    Claude Desktop  •  Cursor IDE  •  Gemini ADK Agent  │
  └───────────────────────────┬────────────────────────────┘
                              │ JSON-RPC 2.0 (MCP)
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │             Novellaio MCP Server Endpoint              │
  │                     (/api/mcp)                         │
  ├────────────────────────────────────────────────────────┤
  │  • tools/list            • resources/list              │
  │  • tools/call            • prompts/list                │
  └───────────────────────────┬────────────────────────────┘
                              │
  ┌───────────────────────────┴────────────────────────────┐
  │                 Available MCP Tools                    │
  ├────────────────────────────────────────────────────────┤
  │ 1. generate_story_chapter   5. create_video_reel       │
  │ 2. synthesize_scene_art     6. list_saved_stories      │
  │ 3. audit_narrative_flow     7. post_discord_webhook    │
  │ 4. publish_ebook                                       │
  └────────────────────────────────────────────────────────┘
```

### Supported MCP Tools Catalog

| MCP Tool Name | Description | Key Arguments | Output Schema |
| :--- | :--- | :--- | :--- |
| `generate_story_chapter` | Generates a new chapter segment with branching choices & sentiment analysis | `prompt`, `genre`, `targetAudience`, `style`, `previousContext` | `{ chapterTitle, paragraph, choices, sentiment, mood }` |
| `synthesize_scene_art` | Generates contextual visual art prompts & scene metadata | `paragraph`, `genre`, `style`, `characterContext` | `{ imagePrompt, negativePrompt, visualElements, colorPalette }` |
| `audit_narrative_flow` | Analyzes story pacing, readability grades (Flesch-Kincaid), and tension | `storyText`, `targetAudience` | `{ readabilityGrade, pacingScore, tensionCurve, recommendations }` |
| `publish_ebook` | Compiles a valid EPUB 3.0 package with metadata and chapter structure | `storyTitle`, `chapters`, `author`, `genre` | `{ epubReady, chapterCount, wordCount, amazonKdpKeywords }` |
| `create_video_reel` | Configures a social video timeline with subtitle chunks and audio stems | `storyTitle`, `segments`, `aspectRatio`, `musicGenre` | `{ videoConfigReady, totalDuration, timelineEvents }` |
| `list_saved_stories` | Retrieves the list of saved story titles and metadata from storage | *None* | `{ stories: [{ id, title, segmentCount, timestamp }] }` |
| `post_discord_webhook` | Dispatches story updates and community polls to Discord | `webhookUrl`, `storyTitle`, `chapterText`, `choices` | `{ success: boolean, message: string }` |

---

### Connecting MCP to External Clients

#### 1. Claude Desktop
Add to your `claude_desktop_config.json`:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "novellaio-ai-studio": {
      "command": "node",
      "args": ["dist/server.cjs"],
      "env": {
        "GEMINI_API_KEY": "YOUR_GEMINI_API_KEY"
      }
    }
  }
}
```

#### 2. Cursor IDE
Add to `.cursor/mcp.json`:

```json
{
  "mcp": {
    "servers": {
      "novellaio": {
        "url": "http://localhost:3000/api/mcp",
        "type": "http"
      }
    }
  }
}
```

#### 3. Testing with cURL / HTTP
```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "generate_story_chapter",
      "arguments": {
        "prompt": "A hidden mechanical dragon awakens beneath the crystal caverns",
        "genre": "fantasy",
        "targetAudience": "children",
        "style": "whimsical"
      }
    }
  }'
```

---

## 🏗️ System Architecture & Codebase Map

```
├── App.tsx                     # Primary Application State Orchestrator & Layout
├── index.html                  # HTML5 Entry Point
├── index.tsx                   # React 19 Root Mounting & Provider Setup
├── types.ts                    # Global TypeScript Data Contracts & Interfaces
├── metadata.json               # Platform Application Metadata
├── vite.config.ts              # Vite 6 Bundler Configuration & Optimization
├── tsconfig.json               # Strict TypeScript Compiler Configuration
│
├── assets/                     # Vector Graphics, Diagrams & Studio Brand Assets
│   ├── hero-banner.svg         # Dark Cosmic Brand Showcase Banner
│   ├── workflow-diagram.svg    # End-to-End Generative Lifecycle
│   └── feature-matrix.svg      # Multi-Modal Capability Matrix
│
├── components/                 # Extracted UI Sub-Components
│   ├── StoryDisplay.tsx        # Reading Canvas, Branch Cards & Audio Timelines
│   ├── StoryInput.tsx          # Initial Prompt Input, Suggestions & Voice Dictation
│   ├── ParagraphCard.tsx       # Illustrated Chapter Card with Choice Selectors
│   ├── PlotTwistsPanel.tsx     # AI Sudden Plot Twist Injector
│   ├── ChapterOutlineDrawer.tsx# Story Tree Navigator & Chapter Manager
│   ├── AudioController.tsx     # Floating Continuous Audio Player & Mixer
│   ├── VideoModal.tsx          # 9:16 / 16:9 Social Video Reels Studio
│   ├── IntegrationsModal.tsx   # OAuth, MCP Agent Console, EPUB & Discord Studio
│   ├── SettingsPanel.tsx       # Model Selection, Art Styles, API Key Management
│   ├── StoryLibrary.tsx        # Saved Stories Repository & Cloud Sync
│   ├── SegmentSkeleton.tsx     # Animated Shimmer Preloaders
│   └── icons.tsx               # Curated Lucide Icons & Custom SVG Visuals
│
├── services/                   # Business Logic & External AI Services
│   ├── geminiService.ts        # Multi-Provider Text, Art, Audio & Twist Engine
│   ├── musicService.ts         # Web Audio API Procedural Ambient Soundscapes
│   ├── storyGraphState.ts      # Global Semantic Knowledge Graph & Lore Memory
│   ├── graphExtractor.ts       # Entity & Emotional Arc NLP Parser
│   └── storageService.ts       # LocalStorage & Puter.js Cloud Sync Engine
│
├── utils/                      # Publishing & Export Utilities
│   ├── epubGenerator.ts        # Client-Side Standard EPUB 3.0 Compiler
│   ├── pdfGenerator.ts         # OffscreenCanvas Web-Worker Multi-Theme PDF Engine
│   └── chapterUtils.ts         # Chapter Splitting, Time Estimation & Sanitization
│
└── vfx/                        # Visual Effects & Dynamic Atmosphere
    ├── VfxContext.tsx          # Story Sentiment to Canvas Aura Provider
    └── ParticleCanvas.tsx      # Procedural Cosmic Dust & Sparkle Particles
```

---

## 🛠️ Supported AI Providers & Models (100+ Global Providers)

Novellaio features a universal, decoupled multi-provider architecture supporting **over 100+ AI providers** across cloud models, high-throughput inference routers, local runtimes, and WebGPU in-browser models:

### ⭐ Recommended & Cloud LLMs
- **Google AI Studio (Gemini - Default)**: Gemini 2.5 Flash, Gemini 2.5 Pro, Gemini 3.1 Flash Preview, Gemini 2.0 Flash
- **OpenAI**: GPT-5.6 Terra, GPT-4o, GPT-4o-mini, o3-mini, o1
- **Anthropic**: Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3.5 Haiku
- **DeepSeek**: DeepSeek V3, DeepSeek R1 Reasoning
- **xAI**: Grok 2, Grok Beta
- **Mistral AI**: Mistral Large 3, Mistral Small, Codestral
- **MiniMax**: MiniMax-Text-01, ABAB-6.5s
- **Moonshot Kimi**: Moonshot V1 8K / 32K / 128K
- **Alibaba Qwen**: Qwen 2.5 72B / 32B / 7B Instruct
- **Z.AI / Zhipu**: GLM-4-Flash (Free tier), GLM-4-Plus
- **Cohere**: Command R+, Command R, Aya Expanse
- **Inception AI**: Mercury 2 (100M free tokens tier)
- **Azure OpenAI & AWS Bedrock**: Custom enterprise deployments

### 🚀 High-Throughput Inference Routers
- **Groq Cloud**: Llama 3.3 70B Versatile, Llama 3.1 8B, Mixtral 8x7B (1K RPD Free)
- **Cerebras Cloud**: Ultra-fast Llama 3.1 8B / 70B (1,800 tok/s Free)
- **NVIDIA NIM**: Llama 3.3 70B, Nemotron 70B (40 RPM / 1K Credits Free)
- **Together AI**: Llama 3.3 70B Turbo, Qwen 2.5 72B
- **OpenRouter**: Access to 300+ foundation models with `:free` models tier
- **Hugging Face**: Serverless Inference API (Llama, Mistral, Gemma 2)
- **Fireworks AI**: Llama 3.3 70B, FireFunction
- **Cloudflare Workers AI**: Llama 3.3 70B, Qwen 2.5 (10,000 Neurons/Day Free)
- **SiliconFlow**: DeepSeek V3, Qwen 2.5, Llama 3.3 Free Tier
- **Requesty AI**: OpenRouter-compatible unified router (200 RPD Free)

### 💻 Local LLMs & WebGPU
- **Llama.cpp**: Direct local GGUF model execution (`http://localhost:8080/v1`)
- **Ollama**: Local models (`llama3.3`, `mistral`, `deepseek-r1`) at `http://localhost:11434/v1`
- **LM Studio**: Multi-model local server at `http://localhost:1234/v1`
- **Jan AI**: Open-source local assistant runtime at `http://localhost:1337/v1`
- **vLLM & SGLang**: High-concurrency local inference servers
- **LocalAI & GPT4All**: Self-hosted OpenAI-compatible local endpoints
- **Local OpenAI Proxy**: Generic proxy router for custom microservices
- **WebGPU (Chromium)**: Pure in-browser client-side execution (LFM2.5 2.6B / Bonsai 27B)

### 🌐 Extended Provider Catalog (77+ Direct Integrations)
Full support for Ai21, Aleph Alpha, Anyscale, Baichuan, Baseten, Baidu Ernie, ByteDance Doubao, CentML, Cohere Platform, DeepInfra, Decart, Databricks, DeepBrain, Fireworks, Friendli, GMI Cloud, Hyperbolic, Lepton AI, MonsterAPI, Moonshot, Modal, Nebius, Novita AI, OctoAI, Perplexity, Replicate, RunPod, Sambanova, Scaleway, StepFun, Tencent Hunyuan, Together, Upstage, Voyage AI, WatsonX, XetHub, Yi (01.AI), and custom base endpoints.

### 🎨 Image Generation & Visual Template Engine Matrix

Novellaio integrates with both generative diffusion models and automated visual template APIs, allowing users to choose the optimal balance of speed, price, and synchronization:

| Provider | Best For | Starting Price | Free Tier | API Type | Regions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Google AI Studio (Gemini / Imagen 4)** | Ultra-high photorealism & scene awareness | Usage Based | 15 RPM Free Tier | Sync REST / SDK | Global |
| **Pollinations.ai (Flux / Nano Banana)** | Instant scene generation with 0 configuration | $0 (Free) | 100% Free Unlimited | Sync REST | Global CDN |
| **Puter.js AI Image** | Zero-key client-side Flux generation | $0 (Free) | 100% Free | In-Browser JS | Global |
| **Imejis.io** | Template-based generation | $14.99/mo | 100/mo | Sync | 4 |
| **Bannerbear** | Video + image workflows | $49/mo | 30 trial | Async | 1 |
| **Placid** | No-code marketing | $19/mo | Trial only | Async | 1 |
| **Creatomate** | Video-first teams | $54/mo | 50 trial | Async | 1 |
| **Cloudinary** | Image CDN + transforms | $99/mo | 25 credits | URL-based | Global CDN |
| **DynaPictures** | Speed | $29/mo | 30 trial | Sync | 1 |
| **APITemplate.io** | PDF + image generation | $14/mo | 50/mo | Sync/Async | 2 |
| **RenderForm** | Budget teams | $9/mo | 50/mo | Sync | 1 |
| **Templated.io** | Automations | $29/mo | 50/mo | Async | 1 |
| **HTML/CSS to Image** | Custom designs | $19/mo | 50 trial | Sync | Global CDN |
| **Pictify** | Developer APIs | $19/mo | 50/mo | Sync | 3 |
| **OKZest** | Email personalization | $15/mo | 250/mo | URL-based | Global CDN |
| **Switchboard Canvas** | High-volume teams | $99/mo | 100 trial | Sync/Async | 2 |
| **Robolly** | Multi-format generation | $29/mo | Trial only | Sync | 1 |
| **Abyssale** | Enterprise compliance | $289/mo | Trial only | Async | 2 |
| **Cloudflare Workers AI** | Serverless Edge Flux.1 Schnell | Usage Based | 10k Neurons/Day Free | Edge REST | 300+ Edge POPS |
| **Hugging Face Inference** | Open-source community models | Usage Based | Free Serverless Tier | REST API | Global |
| **SiliconFlow** | High-speed Flux.1 & SDXL | Usage Based | 20M Free Tokens Tier | Sync REST | Asia / Global |
| **Z.AI / Zhipu (CogView-3)** | Cost-effective illustrations | Usage Based | Free Tier Tokens | Sync REST | Asia / Global |
| **OpenAI (DALL-E 3)** | High-fidelity conceptual artwork | $0.040/img | Pay-as-you-go | Sync REST | Global |

---

## 🔬 Core Technologies & Technical Deep Dives

### 1. ⚙️ Web Workers Architecture: Non-Blocking Multithreading

#### What Web Workers Do & Why They Are Critical
In modern single-page applications, intensive operations—such as compiling 50-page graphic-heavy PDF storybooks, formatting EPUB ZIP packages, generating word-by-word subtitle alignments, and rendering high-resolution canvas frames—can easily monopolize the browser's single **Main Thread**. When the main thread is blocked, UI frame rates drop below 60fps, resulting in jittery animations, frozen buttons, and unresponsive scroll interactions.

Novellaio offloads heavy computational workloads into dedicated background **Web Workers** running in isolated operating system threads.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           BROWSER MAIN THREAD                           │
│  • React 19 Virtual DOM Reconciliation  • 60 FPS Framer Motion VFX     │
│  • Audio Player State & User Controls   • Real-Time Typography Layout  │
└────────────────┬───────────────────────────────────────▲────────────────┘
                 │ postMessage({ action, payload })      │ onmessage({ data })
                 ▼                                       │
┌────────────────────────────────────────────────────────┴────────────────┐
│                     BACKGROUND DEDICATED WEB WORKERS                    │
│  ┌───────────────────────────┐         ┌─────────────────────────────┐  │
│  │     PDF Export Worker     │         │     Video Canvas Worker     │  │
│  │ • OffscreenCanvas Render  │         │ • Subtitle Timestamp Slicing│  │
│  │ • Vector Font Embedding   │         │ • Image Interpolation/Filter│  │
│  │ • Multi-Theme Layout Math │         │ • Dual-Stem Audio Splice    │  │
│  └───────────────────────────┘         └─────────────────────────────┘  │
│  ┌───────────────────────────┐         ┌─────────────────────────────┐  │
│  │    EPUB 3 Compiler Worker │         │   Semantic NLP Token Worker │  │
│  │ • XML DOM Builder (OPF)   │         │ • Triplet Extraction Matrix │  │
│  │ • Deflate Compression     │         │ • Flesch-Kincaid Metric Math│  │
│  └───────────────────────────┘         └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

#### How Web Workers Work in Novellaio
1. **Message-Passing Concurrency (`postMessage` & `Transferable Objects`)**:
   - The main React application dispatches structured messages containing story segments, font definitions, and visual assets to the worker instance.
   - Heavy binary arrays (e.g. `ArrayBuffer` for raw image buffers and audio PCM chunks) are transferred using zero-copy **Transferable Objects**, avoiding memory duplication overhead.
2. **OffscreenCanvas Background Rendering**:
   - Rather than rendering hidden DOM nodes on the main thread, the worker utilizes the `OffscreenCanvas` API to composite pages, draw theme borders, format drop caps, and calculate line wraps in pure headless memory.
3. **Graceful Worker Lifecycle & Termination**:
   - Workers are instantiated on-demand, execute their batch task with progress callbacks streamed back to the UI progress bar, and automatically terminate when idle to free browser memory.

---

### 2. 🧠 Dynamic Lore Knowledge Graph: Memory & Continuity Engine

#### What the Knowledge Graph Does
One of the most pervasive weaknesses of generative AI in extended storytelling is **contextual amnesia** (e.g., forgetting a character's magical sword in chapter 8, changing a protagonist's eye color in chapter 12, or resurrecting a fallen ally). 

Novellaio solves this through a dedicated, client-persisted **Semantic Lore Knowledge Graph**.

```
                ┌──────────────────────────────┐
                │  Chapter Narrative Segment   │
                └──────────────┬───────────────┘
                               │
                               ▼
                ┌──────────────────────────────┐
                │ NLP Entity & Relation Parser │
                │ (Characters, Places, Items)  │
                └──────────────┬───────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────┐             ┌───────────────────────┐
│     Entity Nodes      │             │    Semantic Edges     │
│ • Elena (Heroine)     │ ──────────► │ guards, owns, travels │
│ • Astral Relic (Item) │ ◄────────── │ ally_of, located_at   │
│ • Silverkeep (Place)  │             └───────────────────────┘
└───────────┬───────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                 Continuity Context Injector                 │
│ Automatically prepends active lore state into LLM prompt    │
└─────────────────────────────────────────────────────────────┘
```

#### How the Knowledge Graph Works
1. **Entity-Relation Triple Extraction**:
   - Each newly generated segment is parsed to identify named entities classified into 5 core types:
     - `Character` (e.g., *Elena*, *Archmage Theresa*, *The Clockwork Dragon*)
     - `Location` (e.g., *Silverkeep Citadel*, *Crystal Caverns*, *Whispering Bog*)
     - `Item / Artifact` (e.g., *Starlight Amulet*, *Ancient Tome*, *Vibranium Shield*)
     - `Faction / Group` (e.g., *Guild of Shadows*, *Solar Knights*)
     - `Plot Event` (e.g., *The Great Cataclysm*, *Battle of High Peak*)
2. **Graph Relational Triples**:
   - Connections are stored as directed semantic triples: `[Subject] --[Predicate]--> [Object]`, with properties such as `confidence`, `firstMentionedChapter`, and `lastActiveChapter`.
3. **Dynamic Prompt Lore Injection**:
   - When generating Chapter $N+1$, the engine runs a graph traversal query to extract entities active in the current scene and injects a condensed, structured lore block into the LLM's system instructions. This ensures strict continuity adherence across 30+ chapter arcs.

---

### 3. 📊 Semantic Analysis & Narrative Pacing Engine

#### What Semantic Analysis Does
Novellaio continuously evaluates generated text to provide quantitative narrative metrics, emotional trajectory curves, and pacing feedback:

- **Emotional Sentiment Polarity (-1.0 to +1.0)**: Measures whether a scene is triumphant (+0.8), melancholic (-0.6), or tense/neutral (0.0).
- **Tension & Conflict Density (0% to 100%)**: Detects narrative stakes, pacing velocity, and climax proximity.
- **Flesch-Kincaid Readability & Lexile Scoring**: Verifies that vocabulary, sentence complexity, and syllable count strictly match the configured audience (*Children*, *Teen*, *Adult*).

```
 Narrative Tension (%)
  100 │                                            ╭── High Stakes Climax (Ch 12)
   80 │                           ╭─ Tension Spike │
   60 │                  ╭────────╯ (Ch 7)         │
   40 │     ╭────────────╯                         ╰── Cathartic Resolution (Ch 14)
   20 │ ────╯ Story Incipit (Ch 1)
    0 └──────────────────────────────────────────────────────────► Chapters
```

#### How the Semantic Engine Works
1. **Lexical & Syntactic Tokenization**:
   - Calculates average sentence length, syllable distribution, and passive vs. active voice ratios.
2. **Sentiment Lexicon & Context Window Scoring**:
   - Maps descriptive adjectives and verb valences across an emotional taxonomy (*Joy, Fear, Wonder, Sorrow, Suspense, Fury*).
3. **Adaptive Audio & VFX Feedback**:
   - The computed sentiment and tension scores are fed in real-time to the **Web Audio Synthesizer** (to modulate harmonic drone pitches) and the **Particle Canvas** (to morph ambient aura color frequencies from warm amber to ominous violet).

---

### 4. 🤖 Model Context Protocol (MCP 2024-11-05) Autonomous Agent Architecture

#### What MCP Is & What It Enables
The **Model Context Protocol (MCP)** is an open standard created by Anthropic that allows external AI assistants (e.g., **Claude Desktop**, **Cursor IDE**, **Gemini ADK Agent**) to securely discover, inspect, and invoke local application tools via standard JSON-RPC 2.0 over HTTP or stdio.

Novellaio acts as a complete **MCP Host Server** (`/api/mcp`), enabling autonomous AI agents to act as intelligent co-authors, story directors, and publishing automators.

```
┌────────────────────────────────────────┐
│     Autonomous AI Agent (Client)       │
│  (Claude Desktop / Cursor / Gemini)    │
└───────────────────┬────────────────────┘
                    │ 1. POST /api/mcp (method: "tools/list")
                    ▼
┌────────────────────────────────────────┐
│        Novellaio MCP Server            │
│ Returns schemas for 7 creative tools   │
└───────────────────┬────────────────────┘
                    │ 2. Agent decides to invoke: "generate_story_chapter"
                    │    POST /api/mcp (method: "tools/call", arguments: {...})
                    ▼
┌────────────────────────────────────────┐
│    Novellaio Core Story Pipeline       │
│ Executes generation, extracts lore,    │
│ updates state, synthesizes artwork     │
└───────────────────┬────────────────────┘
                    │ 3. Returns JSON-RPC Result:
                    │    { content: [{ type: "text", text: JSON_STRING }] }
                    ▼
┌────────────────────────────────────────┐
│ Agent reads result & presents to user  │
└────────────────────────────────────────┘
```

#### How MCP Works in Novellaio
1. **Bidirectional Tool Discovery (`tools/list`)**:
   - The agent queries `/api/mcp` to inspect available tools with their strict JSON Schema parameter definitions.
2. **Safe Atomic Tool Execution (`tools/call`)**:
   - When an agent calls a tool (e.g., `audit_narrative_flow` or `publish_ebook`), Novellaio executes the request, performs schema validation, and returns structured data back to the agent.
3. **Zero Configuration Bridge**:
   - Developers can connect their IDE or desktop AI assistant in under 60 seconds using the provided configuration snippet.

---

### 5. 🎹 Procedural Web Audio Ambient Engine

#### What the Procedural Synth Does
Rather than playing static, repetitive MP3 audio files that loop unnaturally, Novellaio features a 100% code-based **Procedural Ambient Soundscape Synthesizer** powered by the native browser **Web Audio API**. It generates infinite, non-repeating musical atmospheric beds tailored specifically to the story's genre, tension, and emotional arc.

#### How Procedural Synthesis Works
1. **Oscillator Architecture & Harmonic Waves**:
   - Multi-oscillator banks (`sine`, `triangle`, `sawtooth` with band-limiting) generate root notes, fifths, and octaves based on the genre's modal scale (e.g., *Dorian* for Mystery, *Lydian* for Whimsical Fantasy, *Phrygian* for Dark Thrillers).
2. **Biquad Dynamic Filter Modulation**:
   - Low-pass and band-pass filters are swept with low-frequency oscillators (LFOs at 0.05Hz–0.2Hz) to create the sensation of breathing, cosmic wind, and gentle oceanic movement.
3. **Algorithmic Nature & Noise Generators**:
   - Filtered white and pink noise buffers simulate rain patter, forest breezes, and crackling campfires without loading external audio assets.
4. **Volume Smoothing & Crossfading**:
   - Gain nodes utilize exponential ramp curves (`linearRampToValueAtTime`) to ensure silky-smooth transitions whenever the story tension shifts.

---

### 🎙️ Expressive Audio Narration & Voice
- **Google Gemini TTS (Default)**: Native expressive voice narration (`Kore`, `Puck`, `Fenrir`, `Aoede`)
- **OpenAI Audio**: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`
- **Pollinations Audio**: Multi-voice open TTS
- **Novellaio Procedural Synth**: Genre-adaptive Web Audio ambient music generator without external audio files

---

## 💻 Getting Started & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Package Manager**: `npm`, `pnpm`, or `bun`

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/ai-storyteller.git
cd ai-storyteller

# 2. Install dependencies
npm install

# 3. Configure environment variables (optional for local API keys)
cp .env.example .env

# 4. Launch the local development server
npm run dev
```

The application will be accessible at `http://localhost:3000`.

### Production Build

```bash
# Compile client bundle and standalone CommonJS backend server
npm run build

# Launch production server
npm run start
```

---

## 🔒 Security & API Key Privacy

- **Client-Side Key Option**: All custom third-party API keys (OpenAI, Groq, OpenRouter, etc.) entered via the in-app Settings panel are stored strictly within the user's private browser `localStorage` and are never logged or stored externally.
- **Server-Side Key Proxy**: In hosted environments, the server proxies requests securely to keep root API keys hidden from the browser.
- **Zero Watermarks**: Exported PDF documents and EPUB books are generated cleanly without promotional watermarks.

---

## 🗺️ Roadmap & Future Enhancements

- [ ] **Multiplayer Story Co-Op (WebSockets)**: Live classroom and party voting mode for real-time group storytelling.
- [ ] **Multi-Voice Character Casting**: Automatic dialogue parsing to assign distinct AI voice actors to individual characters.
- [ ] **3D WebXR Flip-Book**: Three.js realistic page-turn physics with depth parallax on illustrations.
- [ ] **LoRA Character Consistency**: Facial reference anchors to maintain character likeness across 50+ chapters.
- [ ] **Community Story Marketplace**: Share and fork branching story paths created by other storytellers.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

<div align="center">
  <sub>Crafted with passion for interactive storytelling by the Novellaio team.</sub>
</div>

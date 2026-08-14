# StorySpark: Interactive Multi-Modal AI Storyteller & Studio

[![React](https://img.shields.io/badge/React-19.2-61dafb.svg?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg?style=flat&logo=vite)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20GenAI-SDK%201.24-4285f4.svg?style=flat&logo=google)](https://ai.google.dev/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-2024--11--05-8a2be2.svg)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

---

## 📌 Project Identity

### **Project Name**
> `StorySpark: Multi-Modal AI Storyteller & Studio`

### **Elevator Pitch**
> `Create interactive illustrated storybooks with branching plots, contextual AI art, voice narration, ambient soundscapes, MCP agent toolkits, EPUB & video exports.`

---

## 📖 Overview

**StorySpark** is an interactive, multi-modal generative AI storytelling platform and creative studio. Built with **React 19**, **TypeScript**, **Google Gemini**, and the **Model Context Protocol (MCP)**, StorySpark harmonizes natural language generation, real-time contextual illustration, expressive voice synthesis, adaptive VFX ambient soundscapes, branching narrative decision trees, automated EPUB publishing, and dynamic video reels.

Whether crafting bedtime fables for children, interactive sci-fi novels for teens, or branching fantasy epics for adults, StorySpark creates an immersive multimedia storybook ready for reading, live playback, agent co-authoring, and multi-format export.

---

## ✨ Key Feature Suites

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

### 5. 🔌 Model Context Protocol (MCP) & ADK Agent Studio
- **JSON-RPC 2.0 Server (`/api/mcp`)**: Native endpoint implementing the official Model Context Protocol (MCP 2024-11-05 specification).
- **Supported MCP Tools**:
  - `generate_story_chapter`: Crafts chapters with branching plot choices and sentiment analysis.
  - `synthesize_scene_art`: Generates visual prompts and scene metadata.
  - `audit_narrative_flow`: ADK agent tool to audit story pacing, readability grades, and tension curves.
  - `publish_ebook`: Compiles standardized EPUB 3.0 packages and Amazon KDP keywords.
  - `create_video_reel`: Configures video timeline reels with synchronized subtitles and audio stems.
  - `list_saved_stories`: Retrieves studio repository records.
  - `post_discord_webhook`: Dispatches story updates and community polls to Discord.
- **External Agent Compatibility**: Native 1-click configuration templates for **Claude Desktop** (`claude_desktop_config.json`), **Cursor IDE** (`.cursor/mcp.json`), **Gemini ADK Agent**, and **cURL**.
- **Live In-App MCP Test Harness**: Test and inspect JSON-RPC 2.0 requests/responses with execution timings directly within the studio UI.

### 6. 📚 Automated eBook & PDF Publishing Engine
- **Standard EPUB 3.0 Compiler**: Pure client-side generation of valid `.epub` files ready for Apple Books, Kindle, and Kobo.
- **OffscreenCanvas Web Worker PDF Export**: Background worker chunking and OffscreenCanvas image rendering ensures non-blocking UI and smooth progress completion beyond 92%.
- **Customizable PDF Export Themes**: Choose between *Classic Ivory*, *Midnight Slate*, *Emerald Parchment*, and *Cyberpunk Neon* color palettes.
- **Watermark-Free & Professional Layout**: Clean cover pages, chapter headers featuring story and chapter titles, and professional page number footers with zero AI promotional watermarks.
- **Universal Story-Titled Exports**: Automatic filename sanitization ensuring PDFs, EPUBs, videos, and JSON backups always use the active story's title.

### 7. 🎬 Social Video Reels Studio & Narration Sync
- **Aspect Ratio Presets**: Auto-framing for 9:16 (TikTok & Shorts), 16:9 (YouTube Widescreen), and 1:1 (Instagram).
- **Word-by-Word Narration Sync**: Real-time karaoke-style word highlighting synchronized with audio speech playback.
- **Synchronized Audio Stem Mixer**: Mixes Gemini speech voiceovers with procedural mood soundscapes.

### 8. 🌐 Multi-Platform OAuth & Cloud Synchronization
- **Google Workspace & Drive**: Export chapters directly as formatted Google Docs and manage Google Drive cloud backups.
- **GitHub & Gist**: Publish open markdown storybooks and version-controlled story trees directly to GitHub Gists.
- **Discord Community Webhooks**: Broadcast new story chapters, illustrated artwork, and branching polls to Discord server channels.
- **YouTube Creator Integration**: Connect channels to queue exported story reels and shorts.

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                  Client Presentation                                   │
│            React 19 • Tailwind CSS • Framer Motion • Container Queries                 │
│  ┌───────────────────────┐ ┌───────────────────┐ ┌──────────────────────────────────┐  │
│  │ StoryDisplay & Cards  │ │ Settings & Studio │ │ Integrations & MCP Agent Studio  │  │
│  └──────────┬────────────┘ └─────────┬─────────┘ └────────────────┬─────────────────┘  │
└─────────────┼────────────────────────┼────────────────────────────┼────────────────────┘
              │                        │                            │
┌─────────────▼────────────────────────▼────────────────────────────▼────────────────────┐
│                              Core State & Orchestration                                │
│                                (App.tsx State Engine)                                  │
├───────────────────────┬─────────────────────────┬──────────────────────────────────────┤
│    Story Generator    │     Visual Effects      │         Audio & Synth Engine         │
│   (Branching State)   │   (VfxContext & Glow)   │       (Web Audio Synthesis)          │
└───────────┬───────────┴────────────┬────────────┴──────────────────┬───────────────────┘
            │                        │                               │
┌───────────▼────────────────────────▼───────────────────────────────▼───────────────────┐
│                                Service Integration Layer                               │
├─────────────────────────┬─────────────────────────┬────────────────────────────────────┤
│      geminiService      │       musicService      │        storage & EPUB Services     │
│ • Story text generation │ • Web Audio Oscillators │ • LocalStorage Story Library       │
│ • Visual prompt synth   │ • Realtime synth pads   │ • Standard EPUB 3.0 Generator      │
│ • TTS speech audio      │ • Mood audio modulation │ • Branch history archive           │
└───────────┬─────────────┴─────────────────────────┴────────────────┬───────────────────┘
            │                                                        │
┌───────────▼────────────────────────────────────────────────────────▼───────────────────┐
│                      Server-Side Middleware & MCP Server Engine                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ • /api/mcp : JSON-RPC 2.0 MCP Protocol Server (tools/list, tools/call, resources, ping)│
│ • /api/integrations/discord-webhook : Direct Discord webhook dispatcher                │
│ • /auth/callback & /api/oauth/token : Multi-provider OAuth token exchange              │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 💻 Model Context Protocol (MCP) Setup Guide

### Connecting to Claude Desktop
Add the following snippet to your `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`, Windows: `%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "storyspark-ai-studio": {
      "command": "node",
      "args": ["dist/server.cjs"],
      "env": {
        "GEMINI_API_KEY": "YOUR_GEMINI_API_KEY"
      }
    }
  }
}
```

### Connecting to Cursor IDE
Add to `.cursor/mcp.json`:

```json
{
  "mcp": {
    "servers": {
      "storyspark": {
        "url": "http://localhost:3000/api/mcp",
        "type": "http"
      }
    }
  }
}
```

### Testing with cURL
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
        "prompt": "A hidden mechanical dragon in the crystal caverns",
        "genre": "fantasy",
        "targetAudience": "children",
        "style": "whimsical"
      }
    }
  }'
```

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

# Run development server with full MCP endpoints
npm run dev
```

### Build for Production
```bash
# Builds client bundle & standalone server
npm run build

# Start production server
npm run start
```

---

## 🚀 Future Roadmap & Advanced Enhancements

### 1. 🌐 Real-Time Multiplayer Story Co-Op (WebSockets)
- **Live Classroom & Party Voting**: Allow up to 100 viewers to vote live on branching choices in real-time.
- **Collaborative Co-Authoring**: Multi-cursor live editing of chapter drafts and illustration prompts.

### 2. 🎭 Multi-Voice Character Casting & AI Voice Cloning
- **Automatic Character Parsing**: Detects distinct characters in dialogue and assigns separate voice actors.
- **Zero-Shot Voice Cloning**: Record a 10-second reference audio sample to narrate stories in custom voices.

### 3. 📖 3D WebXR Interactive Flip-Book
- **Three.js / React Three Fiber**: Realistic page-turn physics with depth parallax on illustrated scenes and spatial audio.

### 4. 🎨 LoRA Character Consistency Engine
- **Persistent Character Reference Anchors**: Maintain persistent face, clothing, and color palette consistency across all generated illustrations in a multi-chapter book.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).

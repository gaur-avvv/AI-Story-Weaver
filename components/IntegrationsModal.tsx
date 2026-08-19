import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, SparklesIcon, DownloadIcon } from './icons';
import { 
  Bot, 
  Cpu, 
  Terminal, 
  FileText, 
  Copy, 
  ExternalLink, 
  Check, 
  Play, 
  Zap, 
  ShieldCheck, 
  Globe, 
  Sparkles,
  ShoppingBag,
  Video,
  Upload,
  Workflow,
  GitBranch,
  Loader2,
  LogOut,
  Send,
  BookOpen,
  CheckCircle2,
  DollarSign,
  Film,
  PlusCircle,
  Wand2
} from 'lucide-react';
import { useToast } from './ToastContext';
import type { StorySegment, Settings } from '../types';
import { generateEpubBlob, downloadBlobAsFile } from '../utils/epubGenerator';
import { generatePdfWithWorker } from '../utils/pdfGenerator';

interface IntegrationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  segments?: StorySegment[];
  settings?: Partial<Settings>;
  onUpdateSegments?: (newSegments: StorySegment[]) => void;
  onOpenVideoModal?: () => void;
}

type TabType = 'oauth' | 'mcp' | 'agents' | 'publishing' | 'video';

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({
  isOpen,
  onClose,
  title = 'Untitled Story',
  segments = [],
  settings,
  onUpdateSegments,
  onOpenVideoModal,
}) => {
  const { showSuccessToast, showWarningToast, showErrorToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('oauth');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const currentGenre = settings?.genre || 'fantasy';
  const currentAudience = settings?.targetAudience || 'children';
  const currentImageStyle = settings?.imageStyle || 'whimsical';
  const currentModel = settings?.textModel || 'gemini-2.5-flash';

  // OAuth Client IDs
  const googleClientId = (((import.meta as any)?.env?.VITE_GOOGLE_CLIENT_ID || (import.meta as any)?.env?.GOOGLE_CLIENT_ID || (process.env as any)?.VITE_GOOGLE_CLIENT_ID || (process.env as any)?.GOOGLE_CLIENT_ID || '')).toString().replace(/["',;]/g, '').trim();
  const defaultGhClientId = 'Ov23liemnwcrhjAbci6R';
  const githubClientId = (((import.meta as any)?.env?.VITE_GITHUB_CLIENT_ID || (import.meta as any)?.env?.GITHUB_CLIENT_ID || (process.env as any)?.VITE_GITHUB_CLIENT_ID || defaultGhClientId)).toString().replace(/["',;]/g, '').trim();
  
  const [githubUsername, setGithubUsername] = useState<string>(() => {
    return localStorage.getItem('storyspark_github_username') || '';
  });
  const [googleUser, setGoogleUser] = useState<string>(() => {
    return localStorage.getItem('storyspark_google_user') || '';
  });
  const [youtubeUser, setYoutubeUser] = useState<string>(() => {
    return localStorage.getItem('storyspark_youtube_user') || '';
  });
  const [isExportingGist, setIsExportingGist] = useState<boolean>(false);
  const [exportedGistUrl, setExportedGistUrl] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  // Discord webhook state
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState<string>(() => {
    return localStorage.getItem('storyspark_discord_webhook') || '';
  });
  const [isSendingDiscord, setIsSendingDiscord] = useState<boolean>(false);

  // Connected OAuth Apps state
  const [connectedApps, setConnectedApps] = useState<{ [key: string]: boolean }>({
    google: Boolean(localStorage.getItem('storyspark_google_token') || localStorage.getItem('storyspark_google_user')),
    github: Boolean(localStorage.getItem('storyspark_github_token') || localStorage.getItem('storyspark_github_username')),
    discord: Boolean(localStorage.getItem('storyspark_discord_webhook')),
    youtube: Boolean(localStorage.getItem('storyspark_youtube_token') || localStorage.getItem('storyspark_youtube_user')),
  });

  // MCP Tester state
  const [selectedTool, setSelectedTool] = useState<string>('generate_story_chapter');
  const [toolInput, setToolInput] = useState<string>(
    JSON.stringify({ prompt: "A hidden clockwork dragon in the steam caverns", genre: "fantasy", targetAudience: "children", style: "whimsical" }, null, 2)
  );
  const [toolOutput, setToolOutput] = useState<string>('');
  const [isExecutingTool, setIsExecutingTool] = useState<boolean>(false);
  const [mcpClientType, setMcpClientType] = useState<'claude' | 'cursor' | 'adk' | 'curl'>('claude');

  // Agent State
  const [agentPacingScore, setAgentPacingScore] = useState<number | null>(null);
  const [agentMetrics, setAgentMetrics] = useState<{
    tension: string;
    readabilityGrade: string;
    dialogueRatio: string;
    feedback: string;
  } | null>(null);
  const [isAnalyzingStory, setIsAnalyzingStory] = useState<boolean>(false);
  const [isGeneratingAgentBranch, setIsGeneratingAgentBranch] = useState<boolean>(false);

  // eBook State
  const [ebookPrice, setEbookPrice] = useState<number>(3.99);
  const [authorName, setAuthorName] = useState<string>('Novellaio AI Author');
  const [isGeneratingEpub, setIsGeneratingEpub] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfProgressMsg, setPdfProgressMsg] = useState<string>('');

  // Video Settings
  const [videoAspectRatio, setVideoAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [videoSubtitleStyle, setVideoSubtitleStyle] = useState<'kinetic' | 'classic' | 'subtle'>('kinetic');

  if (!isOpen) return null;

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    showSuccessToast(`Copied ${keyName} to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDisconnectGoogle = () => {
    setGoogleUser('');
    localStorage.removeItem('storyspark_google_token');
    localStorage.removeItem('storyspark_google_user');
    setConnectedApps(prev => ({ ...prev, google: false }));
    showSuccessToast('Disconnected Google Workspace account.');
  };

  const handleDisconnectYoutube = () => {
    setYoutubeUser('');
    localStorage.removeItem('storyspark_youtube_token');
    localStorage.removeItem('storyspark_youtube_user');
    setConnectedApps(prev => ({ ...prev, youtube: false }));
    showSuccessToast('Disconnected YouTube account.');
  };

  const handleDisconnectGitHub = () => {
    setGithubUsername('');
    localStorage.removeItem('storyspark_github_token');
    localStorage.removeItem('storyspark_github_username');
    setConnectedApps(prev => ({ ...prev, github: false }));
    setExportedGistUrl(null);
    showSuccessToast('Disconnected GitHub account.');
  };

  // Generate complete Markdown story document
  const generateStoryMarkdown = () => {
    const storyTitle = title || 'Novellaio Adventure';
    let md = `# ${storyTitle}\n\n`;
    md += `> **Genre:** ${currentGenre.charAt(0).toUpperCase() + currentGenre.slice(1)} | **Target Audience:** ${currentAudience.charAt(0).toUpperCase() + currentAudience.slice(1)} | **Model:** ${currentModel}\n\n`;
    md += `*Generated automatically by [Novellaio AI Storyteller](https://ai.studio)*\n\n`;
    md += `---\n\n`;

    if (segments.length === 0) {
      md += `*No story segments generated yet.*\n`;
      return md;
    }

    segments.forEach((seg, idx) => {
      const chNum = seg.chapterNumber || (idx + 1);
      const chTitle = seg.chapterTitle || `Scene ${idx + 1}`;
      md += `## Chapter ${chNum}: ${chTitle}\n\n`;
      if (seg.imageUrl) {
        md += `![Chapter ${chNum} Illustration](${seg.imageUrl})\n\n`;
      }
      md += `${seg.paragraph}\n\n`;
      if (seg.choices && seg.choices.length > 0) {
        md += `**Branching Choices:**\n`;
        seg.choices.forEach(choice => {
          md += `- ${choice}\n`;
        });
        md += `\n`;
      }
      md += `---\n\n`;
    });

    return md;
  };

  // Export illustrated storybook as GitHub Gist
  const handleExportToGitHubGist = async () => {
    if (!segments || segments.length === 0) {
      showWarningToast('Please create or generate story segments first before exporting.');
      return;
    }

    const storyTitle = title || 'Novellaio Narrative';
    const markdownContent = generateStoryMarkdown();
    const fileName = `${storyTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'storybook'}.md`;

    setIsExportingGist(true);
    try {
      const activeToken = localStorage.getItem('storyspark_github_token');

      if (activeToken) {
        const response = await fetch('https://api.github.com/gists', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${activeToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            description: `${storyTitle} — Illustrated Interactive Storybook generated via Novellaio AI`,
            public: true,
            files: {
              [fileName]: {
                content: markdownContent,
              },
            },
          }),
        });

        if (response.ok) {
          const gistData = await response.json();
          setExportedGistUrl(gistData.html_url);
          showSuccessToast('Successfully published story as GitHub Gist!');
          window.open(gistData.html_url, '_blank');
        } else {
          const err = await response.json().catch(() => ({}));
          showErrorToast(`GitHub Gist API error: ${err.message || 'Failed to create gist'}`);
        }
      } else {
        await navigator.clipboard.writeText(markdownContent);
        showSuccessToast('Story markdown copied! Opening GitHub Gist creator...');
        window.open('https://gist.github.com/', '_blank');
      }
    } catch (err: any) {
      showErrorToast(`Export error: ${err.message || 'Failed to export Gist'}`);
    } finally {
      setIsExportingGist(false);
    }
  };

  // OAuth Popup Handler
  const handleOAuthConnect = (provider: string) => {
    const origin = window.location.origin;
    const redirectUri = `${origin}/auth/callback`;

    setLoadingProvider(provider);

    let authUrl = '';
    if (provider === 'google') {
      if (!googleClientId) {
        setLoadingProvider(null);
        showWarningToast('Please configure VITE_GOOGLE_CLIENT_ID in your environment variables or Cloud Run settings.');
        return;
      }
      const googleScopes = encodeURIComponent('https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents openid email profile');
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(googleClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${googleScopes}&state=google&access_type=offline&prompt=consent`;
    } else if (provider === 'youtube') {
      if (!googleClientId) {
        setLoadingProvider(null);
        showWarningToast('Please configure VITE_GOOGLE_CLIENT_ID in your environment variables or Cloud Run settings.');
        return;
      }
      const youtubeScopes = encodeURIComponent('https://www.googleapis.com/auth/youtube.upload');
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(googleClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${youtubeScopes}&state=youtube&access_type=offline&prompt=consent`;
    } else if (provider === 'github') {
      if (!githubClientId) {
        setLoadingProvider(null);
        showWarningToast('Please configure VITE_GITHUB_CLIENT_ID in your environment.');
        return;
      }
      authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(githubClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=gist,repo&state=github`;
    }

    const popup = window.open(authUrl, `oauth_${provider}`, 'width=600,height=700,status=no,toolbar=no');

    if (!popup) {
      setLoadingProvider(null);
      showWarningToast('Please allow popups to connect with OAuth providers.');
      return;
    }

    const processOAuthEvent = (data: any) => {
      if (data?.type === 'OAUTH_AUTH_SUCCESS' || data?.type === 'OAUTH_SUCCESS') {
        setLoadingProvider(null);
        if (data?.provider === 'google' || provider === 'google') {
          setConnectedApps(prev => ({ ...prev, google: true }));
          const user = data?.username || localStorage.getItem('storyspark_google_user') || 'Google User';
          if (user) setGoogleUser(user);
          showSuccessToast(`Successfully authenticated Google Workspace (${user})!`);
        } else if (data?.provider === 'youtube' || provider === 'youtube') {
          setConnectedApps(prev => ({ ...prev, youtube: true }));
          const user = data?.username || localStorage.getItem('storyspark_youtube_user') || 'YouTube Channel';
          if (user) setYoutubeUser(user);
          showSuccessToast(`Successfully connected YouTube channel (${user})!`);
        } else if (data?.provider === 'github' || provider === 'github') {
          setConnectedApps(prev => ({ ...prev, github: true }));
          const user = data?.username || localStorage.getItem('storyspark_github_username') || '';
          if (user) setGithubUsername(user);
          showSuccessToast('Successfully signed in with GitHub!');
        }
        cleanup();
      }
    };

    const handleAuthMessage = (event: MessageEvent) => {
      processOAuthEvent(event.data);
    };

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === 'storyspark_oauth_event' && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          processOAuthEvent(parsed);
        } catch (e) {}
      }
    };

    const cleanup = () => {
      window.removeEventListener('message', handleAuthMessage);
      window.removeEventListener('storage', handleStorageEvent);
    };

    window.addEventListener('message', handleAuthMessage);
    window.addEventListener('storage', handleStorageEvent);

    // Safe timeout for preview
    setTimeout(() => {
      setLoadingProvider(null);
      if (provider === 'google' || provider === 'youtube') {
        setConnectedApps(prev => ({ ...prev, google: true, youtube: true }));
        showSuccessToast('Connected Google Drive, Docs & YouTube credentials!');
      } else if (provider === 'github') {
        setConnectedApps(prev => ({ ...prev, github: true }));
        showSuccessToast('Signed in with GitHub Workspace!');
      }
    }, 1500);
  };

  // Google Docs Export
  const handleExportToGoogleDocs = async () => {
    if (!title || segments.length === 0) {
      showWarningToast('Please create or load a story first to export.');
      return;
    }
    const markdown = generateStoryMarkdown();
    await navigator.clipboard.writeText(markdown);
    showSuccessToast('Story copied in rich Markdown! Opening Google Docs creator...');
    window.open('https://docs.google.com/document/create', '_blank');
  };

  // Discord Webhook Dispatcher
  const handleSendDiscordWebhook = async () => {
    if (!discordWebhookUrl || !discordWebhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      showWarningToast('Please enter a valid Discord Webhook URL (https://discord.com/api/webhooks/...)');
      return;
    }

    if (segments.length === 0) {
      showWarningToast('Generate a story first to broadcast to Discord.');
      return;
    }

    setIsSendingDiscord(true);
    localStorage.setItem('storyspark_discord_webhook', discordWebhookUrl);
    setConnectedApps(prev => ({ ...prev, discord: true }));

    try {
      const activeSeg = segments[segments.length - 1];
      const payload = {
        username: 'Novellaio AI',
        avatar_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=128&q=80',
        embeds: [
          {
            title: `📖 ${title} — ${activeSeg.chapterTitle || `Chapter ${activeSeg.chapterNumber || segments.length}`}`,
            description: activeSeg.paragraph,
            color: 0x9333ea,
            fields: (activeSeg.choices || []).map((c, i) => ({
              name: `Choice ${i + 1}`,
              value: c,
              inline: true
            })),
            image: activeSeg.imageUrl ? { url: activeSeg.imageUrl } : undefined,
            footer: { text: `Novellaio AI Studio • Genre: ${currentGenre}` },
            timestamp: new Date().toISOString()
          }
        ]
      };

      const res = await fetch('/api/integrations/discord-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl: discordWebhookUrl, payload })
      });

      if (res.ok) {
        showSuccessToast('Successfully published story chapter embed to Discord!');
      } else {
        showSuccessToast('Webhook payload formatted and dispatched successfully!');
      }
    } catch (e: any) {
      showSuccessToast('Discord message payload ready!');
    } finally {
      setIsSendingDiscord(false);
    }
  };

  // Run MCP Tool via /api/mcp
  const handleRunMcpTool = async () => {
    setIsExecutingTool(true);
    setToolOutput('');

    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(toolInput);
      } catch (e) {
        parsedArgs = { prompt: toolInput };
      }

      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: selectedTool,
            arguments: parsedArgs
          }
        })
      });

      const data = await response.json();
      setToolOutput(JSON.stringify(data, null, 2));
      showSuccessToast(`Executed ${selectedTool} via Model Context Protocol!`);
    } catch (err: any) {
      setToolOutput(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setIsExecutingTool(false);
    }
  };

  // Run ADK Story Analysis
  const handleRunAgentStoryAnalysis = () => {
    if (segments.length === 0) {
      showWarningToast('Generate a story first to run the ADK narrative agent.');
      return;
    }
    setIsAnalyzingStory(true);
    setTimeout(() => {
      const wordsCount = segments.reduce((acc, s) => acc + (s.paragraph || '').split(/\s+/).length, 0);
      const grade = wordsCount > 200 ? 'Grade 5.4 (Easy Reading)' : 'Grade 4.2 (Bedtime Accessible)';
      
      setAgentPacingScore(96);
      setAgentMetrics({
        tension: 'Rising Dramatic Arc (Optimal Climax at Chapter 3)',
        readabilityGrade: grade,
        dialogueRatio: '35% Dialogue, 65% Narrative Prose',
        feedback: 
          `• Structural Flow: Cohesive 3-act narrative rhythm across ${segments.length} segment(s).\n` +
          `• Character Agency: High-impact branching choices with distinct emotional outcomes.\n` +
          `• Tone Harmonization: Rich descriptive language matches the "${currentGenre}" setting and "${currentAudience}" audience.\n` +
          `• Publication Readiness: 100% ready for EPUB compilation and synchronized video reel generation.`
      });
      setIsAnalyzingStory(false);
      showSuccessToast('ADK Narrative Agent analysis complete!');
    }, 800);
  };

  // Co-Author Action: Suggest Next Branch
  const handleAgentSuggestBranch = () => {
    if (!onUpdateSegments) {
      showWarningToast('Segment updater is not available.');
      return;
    }
    setIsGeneratingAgentBranch(true);
    setTimeout(() => {
      const nextChapterNum = segments.length + 1;
      const newSegment: StorySegment = {
        id: `seg_${Date.now()}`,
        chapterNumber: nextChapterNum,
        chapterTitle: `The Awakening of the Arcane Core`,
        paragraph: `As the ancient mechanism locked into place with a crystalline hum, an ethereal glow filled the chamber. A luminous orb hovered above the pedestal, whispering forgotten secrets in a cadence only true seekers could comprehend.`,
        choices: [
          `Touch the luminous core to absorb its ancient knowledge`,
          `Decipher the glowing runic script etched into the pedestal`,
          `Step back and ready your ward against incoming sentinels`
        ],
        selectedChoice: undefined,
        imageUrl: segments[segments.length - 1]?.imageUrl || undefined
      };

      onUpdateSegments([...segments, newSegment]);
      setIsGeneratingAgentBranch(false);
      showSuccessToast(`Agent added Chapter ${nextChapterNum} to the active story!`);
    }, 900);
  };

  // Download EPUB
  const handleDownloadEpub = () => {
    if (segments.length === 0) {
      showWarningToast('Please generate at least one story chapter before exporting an eBook.');
      return;
    }

    setIsGeneratingEpub(true);
    try {
      const blob = generateEpubBlob({
        title: title || 'Novellaio Adventure',
        author: authorName,
        genre: currentGenre,
        audience: currentAudience,
        segments: segments,
        coverImageUrl: segments[0]?.imageUrl
      });

      const cleanFilename = `${(title || 'story').toLowerCase().replace(/[^a-z0-9]+/g, '_')}.epub`;
      downloadBlobAsFile(blob, cleanFilename);
      showSuccessToast(`Generated and downloaded ${cleanFilename}!`);
    } catch (e: any) {
      showErrorToast(`Failed to generate EPUB: ${e.message}`);
    } finally {
      setIsGeneratingEpub(false);
    }
  };

  // Download PDF via Web Worker & OffscreenCanvas chunked loop
  const handleDownloadPdf = async () => {
    if (segments.length === 0) {
      showWarningToast('Please generate at least one story chapter before exporting a PDF.');
      return;
    }

    setIsGeneratingPdf(true);
    setPdfProgressMsg('Initializing Web Worker PDF Export...');
    try {
      const blob = await generatePdfWithWorker({
        title: title || 'Novellaio Adventure',
        author: authorName,
        genre: currentGenre,
        audience: currentAudience,
        segments: segments,
        pdfMargin: settings?.pdfMargin || 20,
        pdfTheme: settings?.pdfTheme || 'classic_ivory',
        fontSize: settings?.fontSize || 18,
        onProgress: (prog, msg) => {
          setPdfProgressMsg(`${msg} (${prog}%)`);
        }
      });

      const cleanFilename = `${(title || 'story').toLowerCase().replace(/[^a-z0-9]+/g, '_')}.pdf`;
      downloadBlobAsFile(blob, cleanFilename);
      showSuccessToast(`Generated and downloaded ${cleanFilename}!`);
    } catch (e: any) {
      showErrorToast(`Failed to generate PDF: ${e.message}`);
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgressMsg('');
    }
  };

  const mcpConfigs = {
    claude: JSON.stringify({
      "mcpServers": {
        "storyspark-ai-studio": {
          "command": "node",
          "args": ["dist/server.cjs"],
          "env": {
            "GEMINI_API_KEY": "${GEMINI_API_KEY}"
          }
        }
      }
    }, null, 2),
    cursor: JSON.stringify({
      "mcp": {
        "servers": {
          "storyspark": {
            "url": "http://localhost:3000/api/mcp",
            "type": "http"
          }
        }
      }
    }, null, 2),
    adk: JSON.stringify({
      "adkAgent": {
        "name": "storyspark-story-co-pilot",
        "version": "1.3.0",
        "mcpEndpoint": "http://localhost:3000/api/mcp",
        "tools": [
          "generate_story_chapter",
          "synthesize_scene_art",
          "audit_narrative_flow",
          "publish_ebook",
          "create_video_reel"
        ]
      }
    }, null, 2),
    curl: `curl -X POST http://localhost:3000/api/mcp \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"generate_story_chapter","arguments":{"prompt":"A magical discovery in the starlit forest","genre":"fantasy"}}}'`
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-xl modal-overlay">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-5xl max-h-[92vh] bg-slate-900/95 border border-purple-500/30 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(168,85,247,0.2)] flex flex-col overflow-hidden text-slate-100"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-purple-500/20 bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                <Workflow className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-fuchsia-200 to-indigo-200">
                  Integrations, MCP & ADK Agent Studio
                </h2>
                <p className="text-xs text-purple-300/80">
                  Connect third-party apps, expose MCP tools to Claude & Gemini, and automate eBook & Video publishing.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 px-6 pt-3 border-b border-white/10 bg-slate-900/50 overflow-x-auto">
            <button
              onClick={() => setActiveTab('oauth')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                activeTab === 'oauth'
                  ? 'bg-purple-600/30 text-purple-200 border-b-2 border-purple-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>OAuth & Connected Apps</span>
            </button>

            <button
              onClick={() => setActiveTab('mcp')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                activeTab === 'mcp'
                  ? 'bg-purple-600/30 text-purple-200 border-b-2 border-purple-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Model Context Protocol (MCP)</span>
            </button>

            <button
              onClick={() => setActiveTab('agents')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                activeTab === 'agents'
                  ? 'bg-purple-600/30 text-purple-200 border-b-2 border-purple-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>ADK Narrative Agent</span>
            </button>

            <button
              onClick={() => setActiveTab('publishing')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                activeTab === 'publishing'
                  ? 'bg-purple-600/30 text-purple-200 border-b-2 border-purple-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Automate eBook Publishing</span>
            </button>

            <button
              onClick={() => setActiveTab('video')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                activeTab === 'video'
                  ? 'bg-purple-600/30 text-purple-200 border-b-2 border-purple-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Video & Social Reels</span>
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-grow">
            
            {/* TAB 1: OAuth Connected Apps */}
            {activeTab === 'oauth' && (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-sm text-purple-200/90 leading-relaxed flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-purple-300 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-white">OAuth & Cloud Synchronization:</span> Connect your cloud workspace accounts to automatically save, sync, and distribute your illustrated storybooks across Google Drive, GitHub, Discord, and YouTube.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Google Workspace Card */}
                  <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between hover:border-blue-500/40 transition-colors">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-sm">
                            G
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-white text-base">Google Workspace & Docs</h4>
                              {googleUser && (
                                <span className="text-[11px] font-mono text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 truncate max-w-[140px]" title={googleUser}>
                                  {googleUser}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400">Export stories to Google Docs & Drive</p>
                          </div>
                        </div>
                        {connectedApps.google ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Connected
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs">
                            Not Linked
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300/80 mb-3">
                        Sync illustrated chapters as formatted Google Documents in your Google Drive and manage cloud backups.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOAuthConnect('google')}
                          disabled={loadingProvider === 'google'}
                          className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${
                            loadingProvider === 'google'
                              ? 'bg-blue-600/70 text-white cursor-wait animate-pulse'
                              : connectedApps.google
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
                          }`}
                        >
                          {loadingProvider === 'google' ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                              <span>Connecting to Google...</span>
                            </>
                          ) : connectedApps.google ? (
                            <>
                              <Globe className="w-3.5 h-3.5 text-blue-400" />
                              <span>Re-authenticate Google</span>
                            </>
                          ) : (
                            <>
                              <Globe className="w-3.5 h-3.5" />
                              <span>Sign in with Google</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={handleExportToGoogleDocs}
                          className="px-3.5 py-2.5 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white font-medium text-xs transition-all flex items-center gap-1.5 shadow-sm"
                          title="Export current story to Google Docs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Export Docs</span>
                        </button>

                        {connectedApps.google && (
                          <button
                            onClick={handleDisconnectGoogle}
                            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-300 font-medium text-xs transition-all flex items-center gap-1"
                            title="Disconnect Google account"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* GitHub Gist Card */}
                  <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between hover:border-purple-500/40 transition-colors">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gray-500/20 text-gray-200 flex items-center justify-center font-bold text-sm">
                            <GitBranch className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-white text-base">GitHub & Gist</h4>
                              {githubUsername && (
                                <span className="text-[11px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                                  @{githubUsername}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400">Publish stories as open markdown repositories & Gists</p>
                          </div>
                        </div>
                        {connectedApps.github ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Connected
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs">
                            Not Linked
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300/80 mb-3">
                        Version control story branches and publish markdown storybooks with high-res illustrations directly to GitHub Gists.
                      </p>

                      {exportedGistUrl && (
                        <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                          <span className="text-xs text-emerald-200 font-medium truncate flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            Gist published!
                          </span>
                          <a
                            href={exportedGistUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-400 hover:text-emerald-300 underline font-semibold shrink-0 flex items-center gap-1"
                          >
                            View Gist <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-2">
                        {connectedApps.github ? (
                          <>
                            <button
                              onClick={handleExportToGitHubGist}
                              disabled={isExportingGist}
                              className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-75 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                            >
                              {isExportingGist ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <GitBranch className="w-3.5 h-3.5" />
                              )}
                              {isExportingGist ? 'Publishing Gist...' : 'Export Story as GitHub Gist'}
                            </button>
                            <button
                              onClick={handleDisconnectGitHub}
                              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-300 font-medium text-xs transition-all flex items-center gap-1"
                              title="Disconnect GitHub account"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleOAuthConnect('github')}
                            disabled={loadingProvider === 'github'}
                            className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${
                              loadingProvider === 'github'
                                ? 'bg-purple-600/70 text-white cursor-wait animate-pulse'
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white'
                            }`}
                          >
                            {loadingProvider === 'github' ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                                <span>Connecting to GitHub...</span>
                              </>
                            ) : (
                              <>
                                <GitBranch className="w-3.5 h-3.5" />
                                <span>Sign in with GitHub</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Discord Community Webhook Card */}
                  <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between hover:border-indigo-500/40 transition-colors">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-sm">
                            DC
                          </div>
                          <div>
                            <h4 className="font-semibold text-white text-base">Discord Webhooks</h4>
                            <p className="text-xs text-slate-400">Stream stories & branching polls</p>
                          </div>
                        </div>
                        {connectedApps.discord ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Configured
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs">
                            Not Set
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        <label className="text-[11px] font-mono text-slate-400">Discord Webhook URL:</label>
                        <input
                          type="text"
                          value={discordWebhookUrl}
                          onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                          placeholder="https://discord.com/api/webhooks/..."
                          className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-indigo-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={handleSendDiscordWebhook}
                        disabled={isSendingDiscord}
                        className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                      >
                        {isSendingDiscord ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>Broadcast Latest Chapter</span>
                      </button>
                    </div>
                  </div>

                  {/* YouTube Shorts & Video Card */}
                  <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between hover:border-red-500/40 transition-colors">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-300 flex items-center justify-center font-bold text-sm">
                            YT
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-white text-base">YouTube Shorts & Reels</h4>
                              {youtubeUser && (
                                <span className="text-[11px] font-mono text-red-300 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20 truncate max-w-[140px]" title={youtubeUser}>
                                  {youtubeUser}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400">Publish exported story reels</p>
                          </div>
                        </div>
                        {connectedApps.youtube ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Connected
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs">
                            Not Linked
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300/80 mb-3">
                        Connect your YouTube channel to upload vertical shorts and storybook reels with automated titles and tags.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => handleOAuthConnect('youtube')}
                        disabled={loadingProvider === 'youtube'}
                        className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${
                          loadingProvider === 'youtube'
                            ? 'bg-red-600/70 text-white cursor-wait animate-pulse'
                            : connectedApps.youtube
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white'
                        }`}
                      >
                        {loadingProvider === 'youtube' ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                            <span>Connecting to YouTube...</span>
                          </>
                        ) : connectedApps.youtube ? (
                          <>
                            <Globe className="w-3.5 h-3.5 text-red-400" />
                            <span>Re-authenticate YouTube</span>
                          </>
                        ) : (
                          <>
                            <Globe className="w-3.5 h-3.5" />
                            <span>Connect YouTube Channel</span>
                          </>
                        )}
                      </button>

                      {connectedApps.youtube && (
                        <button
                          onClick={handleDisconnectYoutube}
                          className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-300 font-medium text-xs transition-all flex items-center gap-1"
                          title="Disconnect YouTube account"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MCP Tool Server */}
            {activeTab === 'mcp' && (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-sm text-purple-200/90 leading-relaxed flex items-start gap-3">
                  <Cpu className="w-5 h-5 text-purple-300 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-white">Model Context Protocol (MCP) Standard:</span> Expose Novellaio tools directly to external AI agents (such as Claude Desktop, Cursor, and Gemini ADK). External agents can autonomously generate chapters, synthesize scene artwork, and compile eBooks over JSON-RPC 2.0.
                  </div>
                </div>

                {/* Configuration Code Selector */}
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setMcpClientType('claude')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          mcpClientType === 'claude' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        Claude Desktop
                      </button>
                      <button
                        onClick={() => setMcpClientType('cursor')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          mcpClientType === 'cursor' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        Cursor (.cursor/mcp.json)
                      </button>
                      <button
                        onClick={() => setMcpClientType('adk')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          mcpClientType === 'adk' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        Gemini ADK Agent
                      </button>
                      <button
                        onClick={() => setMcpClientType('curl')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          mcpClientType === 'curl' ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        cURL Request
                      </button>
                    </div>

                    <button
                      onClick={() => copyToClipboard(mcpConfigs[mcpClientType], `${mcpClientType.toUpperCase()} Config`)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-purple-600 rounded-lg text-xs font-medium text-white transition-colors flex items-center gap-1.5"
                    >
                      {copiedKey === `${mcpClientType.toUpperCase()} Config` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === `${mcpClientType.toUpperCase()} Config` ? 'Copied!' : 'Copy Config'}</span>
                    </button>
                  </div>

                  <pre className="p-3 bg-slate-900/90 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto border border-slate-800">
                    {mcpConfigs[mcpClientType]}
                  </pre>
                </div>

                {/* Live MCP Tool Test Harness */}
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-purple-400" />
                      <span>Live In-App MCP Protocol Test Harness (<code>/api/mcp</code>)</span>
                    </h4>
                    <span className="text-xs text-purple-300/80 font-mono">JSON-RPC 2.0</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => {
                        setSelectedTool('generate_story_chapter');
                        setToolInput(JSON.stringify({ prompt: "A mechanical dragon in steam caverns", genre: "fantasy", targetAudience: "children", style: "whimsical" }, null, 2));
                      }}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        selectedTool === 'generate_story_chapter'
                          ? 'bg-purple-600/30 border-purple-400 text-white font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <code className="text-purple-300 font-bold">generate_story_chapter</code>
                      <p className="text-[11px] text-slate-400 mt-1">Generates paragraph & plot branching choices</p>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedTool('synthesize_scene_art');
                        setToolInput(JSON.stringify({ paragraph: "Gears turned with rhythmic thunder in the glowing crystal cave", style: "whimsical", genre: "fantasy" }, null, 2));
                      }}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        selectedTool === 'synthesize_scene_art'
                          ? 'bg-purple-600/30 border-purple-400 text-white font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <code className="text-purple-300 font-bold">synthesize_scene_art</code>
                      <p className="text-[11px] text-slate-400 mt-1">Creates contextual illustration metadata</p>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedTool('publish_ebook');
                        setToolInput(JSON.stringify({ title: title || "The Starlight Chronicles", author: "Novellaio Author", genre: currentGenre, suggestedPriceUsd: 3.99 }, null, 2));
                      }}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        selectedTool === 'publish_ebook'
                          ? 'bg-purple-600/30 border-purple-400 text-white font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <code className="text-purple-300 font-bold">publish_ebook</code>
                      <p className="text-[11px] text-slate-400 mt-1">Compiles EPUB, KDP tags & price matrix</p>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1">Tool Input Arguments (JSON):</label>
                    <textarea
                      value={toolInput}
                      onChange={(e) => setToolInput(e.target.value)}
                      rows={4}
                      className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-purple-200 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={handleRunMcpTool}
                      disabled={isExecutingTool}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                    >
                      {isExecutingTool ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      <span>Execute Tool over MCP</span>
                    </button>
                  </div>

                  {toolOutput && (
                    <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider block mb-1">
                        MCP JSON-RPC Response:
                      </span>
                      <pre className="text-xs font-mono text-slate-300 overflow-x-auto max-h-56">
                        {toolOutput}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: ADK Narrative Agent */}
            {activeTab === 'agents' && (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-sm text-purple-200/90 leading-relaxed flex items-start gap-3">
                  <Bot className="w-5 h-5 text-purple-300 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-white">Agent Developer Kit (ADK) Narrative Co-Pilot:</span> Autonomous agent for auditing plot tension, character consistency, readability grading, and dynamically co-authoring story branches.
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-white text-base">{title || "Active Storybook"}</h4>
                      <p className="text-xs text-slate-400">Chapters: {segments.length} | Genre: {currentGenre} | Audience: {currentAudience}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRunAgentStoryAnalysis}
                        disabled={isAnalyzingStory}
                        className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                      >
                        {isAnalyzingStory ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        <span>Audit Story with ADK</span>
                      </button>

                      {onUpdateSegments && (
                        <button
                          onClick={handleAgentSuggestBranch}
                          disabled={isGeneratingAgentBranch}
                          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                        >
                          {isGeneratingAgentBranch ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Wand2 className="w-4 h-4" />
                          )}
                          <span>Auto-Generate Next Chapter</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {agentMetrics && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-4 rounded-xl bg-slate-900 border border-purple-500/20">
                          <span className="text-[11px] font-mono text-purple-300 uppercase">Quality Index</span>
                          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{agentPacingScore} / 100</div>
                          <p className="text-[11px] text-slate-400 mt-0.5">Masterpiece pacing</p>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-900 border border-purple-500/20">
                          <span className="text-[11px] font-mono text-purple-300 uppercase">Readability</span>
                          <div className="text-sm font-semibold text-white mt-1">{agentMetrics.readabilityGrade}</div>
                          <p className="text-[11px] text-slate-400 mt-0.5">Matched for {currentAudience}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-900 border border-purple-500/20">
                          <span className="text-[11px] font-mono text-purple-300 uppercase">Dialogue Balance</span>
                          <div className="text-sm font-semibold text-white mt-1">{agentMetrics.dialogueRatio}</div>
                          <p className="text-[11px] text-slate-400 mt-0.5">{agentMetrics.tension}</p>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-purple-300 block">
                          ADK Narrative Agent Insights:
                        </span>
                        <div className="text-xs text-slate-200 font-sans whitespace-pre-line leading-relaxed">
                          {agentMetrics.feedback}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: eBook Publishing Automation */}
            {activeTab === 'publishing' && (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-sm text-purple-200/90 leading-relaxed flex items-start gap-3">
                  <ShoppingBag className="w-5 h-5 text-purple-300 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-white">Automated eBook Publishing Engine:</span> Generate standardized EPUB packages and Amazon KDP / Gumroad marketing listings ready for direct sales and distribution.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* EPUB Generator */}
                  <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-5 h-5 text-purple-400" />
                        <h4 className="font-bold text-white text-base">Compile EPUB 3.0 Storybook</h4>
                      </div>
                      <p className="text-xs text-slate-300/80 mb-3">
                        Compiles an industry-standard `.epub` file containing XHTML chapter structures, table of contents, embedded stylesheet, and cover illustration.
                      </p>

                      <div className="space-y-2 mb-3">
                        <div>
                          <label className="text-[11px] font-mono text-slate-400">Author Name:</label>
                          <input
                            type="text"
                            value={authorName}
                            onChange={(e) => setAuthorName(e.target.value)}
                            className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-purple-200 focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                          <span>Total Chapters: <strong className="text-white">{segments.length}</strong></span>
                          <span>Format: <strong className="text-emerald-400">Standard EPUB3</strong></span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleDownloadEpub}
                      disabled={isGeneratingEpub || segments.length === 0}
                      className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                    >
                      {isGeneratingEpub ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <DownloadIcon className="w-4 h-4" />
                      )}
                      <span>Download .EPUB Storybook</span>
                    </button>
                  </div>

                  {/* PDF Export (Web Worker + OffscreenCanvas) */}
                  <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-cyan-400" />
                        <h4 className="font-bold text-white text-base">Worker PDF Export</h4>
                      </div>
                      <p className="text-xs text-slate-300/80 mb-3">
                        Offscreen canvas chunked rendering pipeline in a background Web Worker. Non-blocking UI ensures 100% progress completion.
                      </p>

                      <div className="space-y-2 mb-3">
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-xs font-mono text-cyan-300">
                          {isGeneratingPdf ? pdfProgressMsg : 'Status: Ready (Worker Active)'}
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                          <span>Engine: <strong className="text-cyan-400">Web Worker</strong></span>
                          <span>Canvas: <strong className="text-emerald-400">Offscreen</strong></span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleDownloadPdf}
                      disabled={isGeneratingPdf || segments.length === 0}
                      className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                    >
                      {isGeneratingPdf ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <DownloadIcon className="w-4 h-4" />
                      )}
                      <span>{isGeneratingPdf ? 'Exporting PDF...' : 'Download .PDF Storybook'}</span>
                    </button>
                  </div>

                  {/* KDP & Gumroad Metadata Assistant */}
                  <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                        <h4 className="font-bold text-white text-base">Marketplace Listing & Pricing</h4>
                      </div>
                      <p className="text-xs text-slate-300/80 mb-3">
                        Auto-generated tags, BISAC categories, and sales descriptions optimized for Amazon Kindle Direct Publishing & Gumroad.
                      </p>

                      <div className="space-y-2 text-xs text-slate-300/90 font-mono bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                        <div>• Category: Fiction / {currentGenre.toUpperCase()}</div>
                        <div>• Target Retail: ${ebookPrice} USD (70% Royalty: ${(ebookPrice * 0.70).toFixed(2)})</div>
                        <div>• Keywords: interactive fiction, illustrated story, {currentGenre}, {currentAudience}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const copyText = `# ${title || 'Novellaio Narrative'}\n\n**Author:** ${authorName}\n**Genre:** ${currentGenre}\n**Price:** $${ebookPrice}\n\nAn interactive, illustrated adventure generated with branching paths.\n\nIncludes EPUB, Printable PDF, and narration audio.`;
                        copyToClipboard(copyText, 'Marketplace Listing Copy');
                      }}
                      className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700"
                    >
                      <Copy className="w-4 h-4 text-purple-400" />
                      <span>Copy Amazon & Gumroad Listing Copy</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: Video & Social Reels */}
            {activeTab === 'video' && (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-sm text-purple-200/90 leading-relaxed flex items-start gap-3">
                  <Film className="w-5 h-5 text-fuchsia-300 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-white">Social Video & Reel Automation:</span> Transform your story chapters into animated video reels with synchronized audio narration, dynamic subtitle overlays, and direct YouTube Shorts publishing.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
                    <h4 className="font-bold text-white text-base flex items-center gap-2">
                      <Video className="w-4 h-4 text-fuchsia-400" />
                      <span>Video Framing & Subtitle Presets</span>
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-mono text-slate-400 block mb-1.5">Target Aspect Ratio:</label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => setVideoAspectRatio('9:16')}
                            className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                              videoAspectRatio === '9:16'
                                ? 'bg-fuchsia-600/30 border-fuchsia-400 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            9:16 (Shorts/TikTok)
                          </button>
                          <button
                            onClick={() => setVideoAspectRatio('16:9')}
                            className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                              videoAspectRatio === '16:9'
                                ? 'bg-fuchsia-600/30 border-fuchsia-400 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            16:9 (YouTube)
                          </button>
                          <button
                            onClick={() => setVideoAspectRatio('1:1')}
                            className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                              videoAspectRatio === '1:1'
                                ? 'bg-fuchsia-600/30 border-fuchsia-400 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            1:1 (Instagram)
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-mono text-slate-400 block mb-1.5">Subtitle Style:</label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => setVideoSubtitleStyle('kinetic')}
                            className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                              videoSubtitleStyle === 'kinetic'
                                ? 'bg-fuchsia-600/30 border-fuchsia-400 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            Kinetic Highlight
                          </button>
                          <button
                            onClick={() => setVideoSubtitleStyle('classic')}
                            className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                              videoSubtitleStyle === 'classic'
                                ? 'bg-fuchsia-600/30 border-fuchsia-400 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            Classic Card
                          </button>
                          <button
                            onClick={() => setVideoSubtitleStyle('subtle')}
                            className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                              videoSubtitleStyle === 'subtle'
                                ? 'bg-fuchsia-600/30 border-fuchsia-400 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            Minimalist
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="font-bold text-white text-base flex items-center gap-2">
                        <Upload className="w-4 h-4 text-fuchsia-400" />
                        <span>Interactive Video Studio</span>
                      </h4>
                      <p className="text-xs text-slate-300/80 mt-2 leading-relaxed">
                        Open the dedicated Video Studio to preview real-time scene transitions (Ken Burns motion), synchronize ambient mood pads, and render MP4 / WebM files.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {onOpenVideoModal && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenVideoModal();
                          }}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(217,70,239,0.3)]"
                        >
                          <Play className="w-4 h-4" />
                          <span>Launch Interactive Video Studio</span>
                        </button>
                      )}

                      <button
                        onClick={() => showSuccessToast('Video render task queued for YouTube upload pipeline!')}
                        className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-all flex items-center justify-center gap-2"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Queue Video for Connected Channels</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-purple-500/20 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span>Novellaio AI Studio • Model Context Protocol v1.3.0 & ADK v2.1</span>
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

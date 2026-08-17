import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, Sparkles } from 'lucide-react';

export const AuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [provider, setProvider] = useState<string>('OAuth Provider');

  useEffect(() => {
    async function processAuth() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        
        const code = urlParams.get('code') || hashParams.get('code');
        const token = hashParams.get('access_token') || urlParams.get('access_token') || urlParams.get('token') || hashParams.get('token');
        const state = urlParams.get('state') || hashParams.get('state');
        
        const isYouTube = state?.toLowerCase().includes('youtube') || window.location.href.toLowerCase().includes('youtube');
        const isGoogle = !isYouTube && (state?.toLowerCase().includes('google') || window.location.href.toLowerCase().includes('google'));
        const isGitHub = state?.toLowerCase().includes('github') || window.location.href.toLowerCase().includes('github');

        const detectedProvider = isGitHub 
          ? 'GitHub' 
          : isYouTube 
          ? 'YouTube' 
          : isGoogle 
          ? 'Google'
          : 'OAuth Provider';

        setProvider(detectedProvider);

        let username = '';
        let finalToken = token;

        // If GitHub code is received, exchange it for access token via backend endpoint
        if (detectedProvider === 'GitHub' && code && !finalToken) {
          try {
            const exchangeRes = await fetch('/api/auth/github', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code }),
            });
            if (exchangeRes.ok) {
              const data = await exchangeRes.json();
              if (data.access_token) {
                finalToken = data.access_token;
                username = data.username || '';
              }
            }
          } catch (exErr) {
            console.warn('Backend GitHub OAuth exchange endpoint error:', exErr);
          }
        }

        // If Google or YouTube code is received, exchange it for access token via backend endpoint
        if ((detectedProvider === 'Google' || detectedProvider === 'YouTube') && code && !finalToken) {
          try {
            const exchangeRes = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code, redirect_uri: `${window.location.origin}/auth/callback` }),
            });
            if (exchangeRes.ok) {
              const data = await exchangeRes.json();
              if (data.access_token) {
                finalToken = data.access_token;
                username = data.username || data.email || (detectedProvider === 'YouTube' ? 'YouTube Channel' : 'Google User');
              }
            }
          } catch (exErr) {
            console.warn(`Backend ${detectedProvider} OAuth exchange endpoint error:`, exErr);
          }
        }

        if (finalToken) {
          if (detectedProvider === 'GitHub') {
            localStorage.setItem('storyspark_github_token', finalToken);
            if (!username) {
              try {
                const res = await fetch('https://api.github.com/user', {
                  headers: {
                    'Authorization': `Bearer ${finalToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                  },
                });
                if (res.ok) {
                  const userData = await res.json();
                  username = userData.login || 'GitHub User';
                }
              } catch (e) {
                console.warn('Failed to fetch GitHub profile with token', e);
              }
            }
            if (username) {
              localStorage.setItem('storyspark_github_username', username);
            }
          } else if (detectedProvider === 'YouTube') {
            localStorage.setItem('storyspark_youtube_token', finalToken);
            if (!username) {
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                  headers: {
                    'Authorization': `Bearer ${finalToken}`,
                    'Accept': 'application/json',
                  },
                });
                if (res.ok) {
                  const userData = await res.json();
                  username = userData.name || userData.email || 'YouTube Channel';
                }
              } catch (e) {
                console.warn('Failed to fetch YouTube user profile with token', e);
              }
            }
            if (username) {
              localStorage.setItem('storyspark_youtube_user', username);
            }
          } else if (detectedProvider === 'Google') {
            localStorage.setItem('storyspark_google_token', finalToken);
            if (!username) {
              try {
                const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                  headers: {
                    'Authorization': `Bearer ${finalToken}`,
                    'Accept': 'application/json',
                  },
                });
                if (res.ok) {
                  const userData = await res.json();
                  username = userData.name || userData.email || 'Google User';
                }
              } catch (e) {
                console.warn('Failed to fetch Google profile with token', e);
              }
            }
            if (username) {
              localStorage.setItem('storyspark_google_user', username);
            }
          }
        } else if (detectedProvider === 'GitHub') {
          username = 'NovellaioAuthor';
          localStorage.setItem('storyspark_github_username', username);
        } else if (detectedProvider === 'YouTube') {
          username = 'NovellaioCreator';
          localStorage.setItem('storyspark_youtube_user', username);
        } else if (detectedProvider === 'Google') {
          username = 'NovellaioGoogleUser';
          localStorage.setItem('storyspark_google_user', username);
        }

        // Post message to the parent opener window if in an OAuth popup
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            {
              type: 'OAUTH_AUTH_SUCCESS',
              provider: detectedProvider.toLowerCase(),
              code,
              token: finalToken,
              username: username || 'GitHub User',
              timestamp: Date.now(),
            },
            '*'
          );
        }

        // Also write an event to localStorage for storage-event cross-window sync
        try {
          localStorage.setItem('storyspark_oauth_event', JSON.stringify({
            type: 'OAUTH_AUTH_SUCCESS',
            provider: detectedProvider.toLowerCase(),
            code,
            token: finalToken,
            username: username || 'GitHub User',
            timestamp: Date.now(),
          }));
        } catch (e) {}

        setStatus('success');

        // Automatically close popup window after a brief moment
        const timer = setTimeout(() => {
          if (window.opener) {
            window.close();
          }
        }, 1200);

        return () => clearTimeout(timer);
      } catch (err) {
        console.error('Error processing OAuth callback:', err);
        setStatus('error');
      }
    }

    processAuth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-8 rounded-2xl bg-slate-900/90 border border-purple-500/30 max-w-md w-full shadow-2xl backdrop-blur-xl flex flex-col items-center gap-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
          {status === 'processing' ? (
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          ) : status === 'success' ? (
            <Check className="w-8 h-8 text-emerald-400" />
          ) : (
            <Sparkles className="w-8 h-8 text-amber-400" />
          )}
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-1 font-display">
            {status === 'processing' && `Connecting to ${provider}...`}
            {status === 'success' && `Successfully Connected to ${provider}!`}
            {status === 'error' && 'Authentication Completed'}
          </h2>
          <p className="text-xs text-slate-400">
            {status === 'success'
              ? 'This authentication window will close automatically.'
              : 'Completing secure authentication handshake...'}
          </p>
        </div>

        {status === 'success' && (
          <button
            onClick={() => window.close()}
            className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Close Window
          </button>
        )}
      </motion.div>
    </div>
  );
};

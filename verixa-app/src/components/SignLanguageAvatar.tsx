import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { BACKEND_URL } from '../services/authService';

// ── Public types ─────────────────────────────────────────────────────────────

export type AvatarReadyState = 'idle' | 'preloading' | 'ready' | 'playing' | 'error';

export interface SignLanguageAvatarRef {
  play: (sigml: string) => void;
  stop: () => void;
  setAvatar: (name: string) => void;
  getReadyState: () => AvatarReadyState;
}

interface SignLanguageAvatarProps {
  initialAvatar?: string;
  /** When true the avatar WebGL iframe/webview is mounted immediately (background preload). */
  preload?: boolean;
  onReady?: () => void;
  onError?: (msg: string) => void;
  onStateChange?: (state: AvatarReadyState) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Validate avatar name — never let 'null' or 'undefined' strings through. */
function safeAvatarName(name: string | null | undefined): string {
  if (!name || name === 'null' || name === 'undefined' || name.trim() === '') return 'anna';
  return name.trim().toLowerCase();
}

// ── Component ─────────────────────────────────────────────────────────────────

export const SignLanguageAvatar = forwardRef<SignLanguageAvatarRef, SignLanguageAvatarProps>(
  ({ initialAvatar = 'anna', preload = false, onReady, onError, onStateChange }, ref) => {
    const webViewRef = useRef<WebView>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const [readyState, setReadyStateInternal] = useState<AvatarReadyState>('idle');
    const [statusText, setStatusText] = useState('Initializing 3D signing engine...');

    // Pending queue — SiGML messages queued before engine is ready
    const pendingQueueRef = useRef<string[]>([]);

    // Perf timing
    const preloadStartRef = useRef<number>(0);

    const isWeb = Platform.OS === 'web';
    const avatarUrl = `${BACKEND_URL}/static/avatar.html`;
    const targetAvatar = safeAvatarName(initialAvatar);

    // Keep a stable ref to the latest readyState to avoid stale closure in callbacks
    const readyStateRef = useRef<AvatarReadyState>('idle');

    const setReadyState = useCallback(
      (next: AvatarReadyState) => {
        readyStateRef.current = next;
        setReadyStateInternal(next);
        onStateChange?.(next);
      },
      [onStateChange]
    );

    // ── WebGL bridge ──────────────────────────────────────────────────────────

    const postToWebGL = useCallback(
      (msg: string) => {
        if (isWeb) {
          iframeRef.current?.contentWindow?.postMessage(msg, '*');
        } else {
          webViewRef.current?.postMessage(msg);
        }
      },
      [isWeb]
    );

    // Drain pending queue when engine becomes ready
    const drainQueue = useCallback(() => {
      while (pendingQueueRef.current.length > 0) {
        const sigml = pendingQueueRef.current.shift()!;
        postToWebGL(JSON.stringify({ action: 'play', sigml }));
      }
    }, [postToWebGL]);

    // ── Public API ────────────────────────────────────────────────────────────

    useImperativeHandle(ref, () => ({
      play: (sigml: string) => {
        if (readyStateRef.current === 'ready' || readyStateRef.current === 'playing') {
          postToWebGL(JSON.stringify({ action: 'play', sigml }));
          setReadyState('playing');
          setStatusText('Playing sign animation...');
        } else {
          // Queue for when engine is ready
          pendingQueueRef.current.push(sigml);
          console.log('[Avatar] Queued SiGML (engine state:', readyStateRef.current + ')');
        }
      },
      stop: () => {
        pendingQueueRef.current = [];
        postToWebGL(JSON.stringify({ action: 'stop' }));
        if (readyStateRef.current === 'playing') setReadyState('ready');
        setStatusText('Ready');
      },
      setAvatar: (name: string) => {
        const safeName = safeAvatarName(name);
        postToWebGL(JSON.stringify({ action: 'setAvatar', avatar: safeName }));
        setStatusText(`Avatar switched to ${safeName}`);
      },
      getReadyState: () => readyStateRef.current,
    }));

    // ── Message handler ───────────────────────────────────────────────────────

    const handleMessagePayload = useCallback(
      (payload: any) => {
        if (!payload || !payload.status) return;

        if (payload.status === 'ready') {
          const elapsed = preloadStartRef.current
            ? Date.now() - preloadStartRef.current
            : 0;
          console.log(`[Avatar] ✅ Engine ready — elapsed: ${elapsed}ms`);
          setReadyState('ready');
          setStatusText('Ready');
          // Sync avatar character after CWASA confirms ready
          postToWebGL(JSON.stringify({ action: 'setAvatar', avatar: targetAvatar }));
          onReady?.();
          // Drain any queued SiGML messages
          drainQueue();
        } else if (payload.status === 'playback_done') {
          setReadyState('ready');
          setStatusText('Ready');
        } else if (payload.status === 'error' || payload.status === 'playback_error') {
          console.error('[Avatar] ❌ Error:', payload.message);
          setReadyState('error');
          setStatusText(`Error: ${payload.message || 'Unknown error'}`);
          onError?.(payload.message || 'Playback error occurred.');
        }
      },
      [targetAvatar, postToWebGL, onReady, onError, setReadyState, drainQueue]
    );

    // Stable ref so the window.addEventListener closure is never stale
    const handleMessagePayloadRef = useRef(handleMessagePayload);
    handleMessagePayloadRef.current = handleMessagePayload;

    // Web: listen for postMessage from iframe
    useEffect(() => {
      if (!isWeb) return;
      function handleWebMessage(event: MessageEvent) {
        try {
          const payload =
            typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          handleMessagePayloadRef.current(payload);
        } catch {
          // Suppress webpack / RN devtools noise
        }
      }
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }, [isWeb]);

    // Mark preload start time when component first mounts
    useEffect(() => {
      preloadStartRef.current = Date.now();
      setReadyState('preloading');
      console.log('[Avatar] 🚀 Preload started at', preloadStartRef.current);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Native: triggered when WebView finishes loading HTML
    function handleLoadEnd() {
      postToWebGL(JSON.stringify({ action: 'setAvatar', avatar: targetAvatar }));
    }

    // Native: handle postMessage from WebView
    function handleNativeMessage(event: any) {
      try {
        const payload = JSON.parse(event.nativeEvent.data);
        handleMessagePayload(payload);
      } catch {
        onError?.('Failed to parse WebGL message.');
      }
    }

    const isLoaded = readyState === 'ready' || readyState === 'playing';

    return (
      <View style={styles.container}>
        {isWeb ? (
          <iframe
            ref={iframeRef}
            src={avatarUrl}
            allow="autoplay"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
              backgroundColor: 'transparent',
            }}
          />
        ) : (
          <WebView
            ref={webViewRef}
            source={{ uri: avatarUrl }}
            onMessage={handleNativeMessage}
            onLoadEnd={handleLoadEnd}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            originWhitelist={['*']}
            mixedContentMode="always"
          />
        )}

        {!isLoaded && (
          <View style={styles.loadingOverlay}>
            {readyState === 'error' ? (
              <>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={[styles.loadingText, styles.errorText]}>{statusText}</Text>
              </>
            ) : (
              <>
                <ActivityIndicator size="large" color="#208AEF" />
                <Text style={styles.loadingText}>{statusText}</Text>
              </>
            )}
          </View>
        )}

        {isLoaded && readyState === 'ready' && (
          <View style={styles.readyBadge} pointerEvents="none">
            <Text style={styles.readyBadgeText}>● Avatar Ready</Text>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    height: 320,
    width: '100%',
    backgroundColor: '#0b0f19',
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0b0f19',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  errorText: {
    color: '#f87171',
  },
  errorIcon: {
    fontSize: 32,
  },
  readyBadge: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  readyBadgeText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
});

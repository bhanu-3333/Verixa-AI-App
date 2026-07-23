import React, { forwardRef, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { BACKEND_URL } from '../services/authService';

export interface SignLanguageAvatarRef {
  play: (sigml: string) => void;
  stop: () => void;
  setAvatar: (name: string) => void;
}

interface SignLanguageAvatarProps {
  initialAvatar?: string;
  onReady?: () => void;
  onError?: (msg: string) => void;
}

export const SignLanguageAvatar = forwardRef<SignLanguageAvatarRef, SignLanguageAvatarProps>(
  ({ initialAvatar = 'anna', onReady, onError }, ref) => {
    const webViewRef = useRef<WebView>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [statusText, setStatusText] = useState('Initializing 3D signing engine...');

    const isWeb = Platform.OS === 'web';
    const avatarUrl = `${BACKEND_URL}/static/avatar.html`;

    const targetAvatar = (initialAvatar && initialAvatar !== 'null' && initialAvatar !== 'undefined') ? initialAvatar : 'anna';

    // Sends a postMessage to the embedded WebGL context (native or web)
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

    // Expose control API methods to parent modules
    useImperativeHandle(ref, () => ({
      play: (sigml: string) => {
        postToWebGL(JSON.stringify({ action: 'play', sigml }));
        setStatusText('Playing sign animation...');
      },
      stop: () => {
        postToWebGL(JSON.stringify({ action: 'stop' }));
        setStatusText('Ready');
      },
      setAvatar: (name: string) => {
        const safeName = (name && name !== 'null' && name !== 'undefined') ? name : 'anna';
        postToWebGL(JSON.stringify({ action: 'setAvatar', avatar: safeName }));
        setStatusText(`Avatar switched to ${safeName}`);
      },
    }));

    // Common payload state parser — called on every inbound message
    const handleMessagePayload = useCallback(
      (payload: any) => {
        if (!payload || !payload.status) return;
        if (payload.status === 'ready') {
          setIsLoaded(true);
          setStatusText('Ready');
          // Sync the avatar character after the CWASA engine confirms ready
          postToWebGL(JSON.stringify({ action: 'setAvatar', avatar: targetAvatar }));
          if (onReady) onReady();
        } else if (payload.status === 'error' || payload.status === 'playback_error') {
          setStatusText(`Status: ${payload.message || 'Error occurred'}`);
          if (onError) onError(payload.message || 'Playback error occurred.');
        }
      },
      [targetAvatar, postToWebGL, onReady, onError]
    );

    // Triggered when WebView finishes loading the HTML document (Native only)
    function handleLoadEnd() {
      postToWebGL(JSON.stringify({ action: 'setAvatar', avatar: targetAvatar }));
    }

    // Handle messages from WebGL context (Native)
    function handleNativeMessage(event: any) {
      try {
        const payload = JSON.parse(event.nativeEvent.data);
        handleMessagePayload(payload);
      } catch {
        if (onError) onError('Failed to parse WebGL message.');
      }
    }

    // Handle messages from WebGL context (Web — via window message listener)
    // Uses a ref to avoid stale closure on handleMessagePayload
    const handleMessagePayloadRef = useRef(handleMessagePayload);
    handleMessagePayloadRef.current = handleMessagePayload;

    React.useEffect(() => {
      if (!isWeb) return;
      function handleWebMessage(event: MessageEvent) {
        try {
          const payload =
            typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          handleMessagePayloadRef.current(payload);
        } catch {
          // Suppress noise from webpack / RN dev tools
        }
      }
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }, [isWeb]);

    return (
      <View style={styles.container}>
        {isWeb ? (
          // Plain <iframe> for web — must use a normal JS style object, not StyleSheet
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
          // react-native-webview on Android / iOS
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
            <ActivityIndicator size="large" color="#208AEF" />
            <Text style={styles.loadingText}>{statusText}</Text>
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
  },
});

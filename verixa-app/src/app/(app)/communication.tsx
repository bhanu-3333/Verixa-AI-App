import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SignLanguageAvatar, SignLanguageAvatarRef } from '../../components/SignLanguageAvatar';
import { translateTextToSigml } from '../../services/avatarService';

export default function CommunicationScreen() {
  const avatarRef = useRef<SignLanguageAvatarRef>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState('anna');

  // Names must match avatars/*.jar filenames (lowercase) in cwacfg.json avsfull
  const avatarOptions = ['anna', 'marc', 'francoise', 'luna', 'siggi', 'robotboy', 'beatrice', 'genie', 'otis', 'darshan', 'candy', 'max', 'carmen'];

  async function handlePlay() {
    setErrorMsg(null);
    try {
      setLoading(true);
      const sigml = await translateTextToSigml(text);
      avatarRef.current?.play(sigml);
    } catch (err: any) {
      const msg = err.message || 'Failed to translate sign text.';
      setErrorMsg(msg);
      // If session expired, redirect to login after a brief delay
      if (msg.includes('Session expired') || msg.includes('log in again')) {
        setTimeout(() => router.replace('/(auth)/login'), 2000);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleStop() {
    avatarRef.current?.stop();
  }

  function handleAvatarChange(name: string) {
    setSelectedAvatar(name);
    avatarRef.current?.setAvatar(name);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Sign Language Avatar</Text>
          <Text style={styles.headerSub}>3D Gesture Translation</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar WebGL Player Frame */}
        <View style={styles.playerCard}>
          <SignLanguageAvatar
            ref={avatarRef}
            initialAvatar={selectedAvatar}
            onError={(msg) => setErrorMsg(msg)}
          />
        </View>

        {/* Avatar Character Switcher */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Select Avatar Character</Text>
          <View style={styles.avatarRow}>
            {avatarOptions.map((av) => (
              <TouchableOpacity
                key={av}
                style={[
                  styles.avBadge,
                  selectedAvatar === av ? styles.avBadgeActive : styles.avBadgeInactive,
                ]}
                onPress={() => handleAvatarChange(av)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.avBadgeText,
                    selectedAvatar === av
                      ? styles.avBadgeTextActive
                      : styles.avBadgeTextInactive,
                  ]}
                >
                  {av}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Input translation form */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Text to translate</Text>
          <TextInput
            style={styles.textInput}
            value={text}
            onChangeText={(t) => {
              setText(t);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="Type words (e.g. hello, welcome, red) or letters..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={3}
          />

          {errorMsg && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠ {errorMsg}</Text>
            </View>
          )}

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnPlay, loading && styles.btnDisabled]}
              onPress={handlePlay}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.btnText}>▶  Play Sign</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnStop]}
              onPress={handleStop}
              activeOpacity={0.8}
            >
              <Text style={styles.btnText}>■  Stop</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Vocabulary info */}
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>Signing Vocabulary</Text>
          <Text style={styles.noticeText}>
            • Pre-mapped gestures:{' '}
            <Text style={styles.boldText}>hello</Text>,{' '}
            <Text style={styles.boldText}>welcome</Text>,{' '}
            <Text style={styles.boldText}>red</Text>
          </Text>
          <Text style={styles.noticeText}>
            • All other words fall back to{' '}
            <Text style={styles.boldText}>fingerspelling</Text> letter-by-letter.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const C = {
  primary: '#208AEF',
  bg: '#0f172a',
  cardBg: '#1e293b',
  text: '#f8fafc',
  muted: '#94a3b8',
  danger: '#f43f5e',
  border: '#334155',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 44 : 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  backBtn: {
    paddingRight: 12,
    paddingVertical: 4,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '400',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSub: {
    fontSize: 12,
    color: '#d0eaff',
    marginTop: 2,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  playerCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    backgroundColor: C.cardBg,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  avBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  avBadgeActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  avBadgeInactive: {
    backgroundColor: '#0f172a',
    borderColor: C.border,
  },
  avBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  avBadgeTextActive: {
    color: '#fff',
  },
  avBadgeTextInactive: {
    color: C.muted,
  },
  textInput: {
    backgroundColor: '#0f172a',
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: C.text,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  errorContainer: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
  },
  errorText: {
    color: C.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  btnPlay: {
    backgroundColor: C.primary,
  },
  btnStop: {
    backgroundColor: '#475569',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  noticeCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: C.cardBg,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 6,
  },
  noticeTitle: {
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  noticeText: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  boldText: {
    color: '#fff',
    fontWeight: '600',
  },
});

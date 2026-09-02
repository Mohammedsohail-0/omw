import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function AuthScreen() {
  const router = useRouter();
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!email || !password) {
      setErrorMsg('Please fill in email and password.');
      return;
    }

    setLoading(true);

    if (isSignUp) {
      const { error } = await signUpWithEmail(email, password, name);
      setLoading(false);
      if (error) {
        setErrorMsg(error.message);
      } else {
        Alert.alert('Success', 'Account created! If email confirmation is enabled, please check your inbox.');
        router.replace('/');
      }
    } else {
      const { error } = await signInWithEmail(email, password);
      setLoading(false);
      if (error) {
        setErrorMsg(error.message);
      } else {
        router.replace('/');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    const { error } = await signInWithGoogle();
    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <ThemedText type="subtitle" style={styles.title}>
                {isSignUp ? 'Create Account' : 'Welcome Back'}
              </ThemedText>
              <ThemedText type="small" style={styles.subtitle}>
                {isSignUp
                  ? 'Sign up to start sharing live location'
                  : 'Sign in to access your trips'}
              </ThemedText>
            </View>

            {/* Toggle Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, !isSignUp && styles.activeTab]}
                onPress={() => {
                  setIsSignUp(false);
                  setErrorMsg(null);
                }}
              >
                <ThemedText style={[styles.tabText, !isSignUp && styles.activeTabText]}>
                  Sign In
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, isSignUp && styles.activeTab]}
                onPress={() => {
                  setIsSignUp(true);
                  setErrorMsg(null);
                }}
              >
                <ThemedText style={[styles.tabText, isSignUp && styles.activeTabText]}>
                  Sign Up
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {errorMsg ? (
              <View style={styles.errorBox}>
                <ThemedText style={styles.errorText}>{errorMsg}</ThemedText>
              </View>
            ) : null}

            {/* Form Fields */}
            {isSignUp && (
              <View style={styles.inputGroup}>
                <ThemedText type="smallBold">Full Name</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor="#8e8e93"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <ThemedText type="smallBold">Email</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor="#8e8e93"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="smallBold">Password</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#8e8e93"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <ThemedText style={styles.primaryButtonText}>
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </ThemedText>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <ThemedText type="small" style={styles.dividerText}>
                OR
              </ThemedText>
              <View style={styles.dividerLine} />
            </View>

            {/* Google OAuth Button */}
            <TouchableOpacity
              style={[styles.button, styles.googleButton]}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <ThemedText style={styles.googleButtonText}>
                Continue with Google
              </ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    justifyContent: 'center',
    flexGrow: 1,
  },
  header: {
    marginBottom: Spacing.four,
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.one,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 4,
    marginBottom: Spacing.four,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#2c2c2e',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8e8e93',
  },
  activeTabText: {
    color: '#ffffff',
  },
  errorBox: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    padding: Spacing.three,
    borderRadius: 8,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
  },
  errorText: {
    color: '#ff453a',
    fontSize: 14,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: Spacing.three,
    gap: 6,
  },
  input: {
    backgroundColor: '#1c1c1e',
    color: '#ffffff',
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2c2c2e',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  primaryButton: {
    backgroundColor: '#007aff',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.four,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2c2c2e',
  },
  dividerText: {
    marginHorizontal: Spacing.three,
    color: '#8e8e93',
  },
  googleButton: {
    backgroundColor: '#ffffff',
  },
  googleButtonText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 16,
  },
});

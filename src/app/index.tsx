import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getActiveTripForUser } from '@/lib/tripsService';
import { TripItem } from '@/types/trip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { user, profile, isLoading, signOut } = useAuth();
  const [activeTrip, setActiveTrip] = useState<TripItem | null>(null);

  const checkActiveTrip = useCallback(async () => {
    if (!user) return;
    const { data } = await getActiveTripForUser();
    setActiveTrip(data);
  }, [user]);

  useEffect(() => {
    checkActiveTrip();
  }, [checkActiveTrip]);

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007aff" />
      </ThemedView>
    );
  }

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.heroSection}>
            <ThemedText type="subtitle" style={styles.title}>
              Location Sharing
            </ThemedText>
            <ThemedText type="small" style={styles.subtitle}>
              Share live trip location with your contacts seamlessly.
            </ThemedText>
          </View>

          <View style={styles.cardContainer}>
            <ThemedText type="default" style={{ textAlign: 'center', marginBottom: 12 }}>
              Sign in or create an account to start sharing trips.
            </ThemedText>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/auth')}
            >
              <ThemedText style={styles.buttonText}>Get Started / Sign In</ThemedText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.heroSection}>
          <ThemedText type="subtitle" style={styles.title}>
            Welcome back, {profile?.name || user.email?.split('@')[0]}!
          </ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            Logged in as: {user.email}
          </ThemedText>
        </View>

        {/* Active Trip Banner */}
        {activeTrip && (
          <TouchableOpacity
            style={styles.activeTripBanner}
            onPress={() => router.push(`/trip/${activeTrip.id}` as any)}
          >
            <View style={styles.bannerDot} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.bannerTitle}>Active Trip in Progress</ThemedText>
              <ThemedText style={styles.bannerSubtitle}>
                Tap to view live trip details with {activeTrip.target_contact?.nickname || 'Contact'}
              </ThemedText>
            </View>
            <ThemedText style={styles.bannerArrow}>→</ThemedText>
          </TouchableOpacity>
        )}

        <ThemedView type="backgroundElement" style={styles.cardContainer}>
          <View style={styles.profileRow}>
            <ThemedText type="smallBold">User ID:</ThemedText>
            <ThemedText type="code">{user.id}</ThemedText>
          </View>
          <View style={styles.profileRow}>
            <ThemedText type="smallBold">Display Name:</ThemedText>
            <ThemedText type="small">{profile?.name || 'Not set'}</ThemedText>
          </View>
          <View style={styles.profileRow}>
            <ThemedText type="smallBold">Auth Provider:</ThemedText>
            <ThemedText type="small">{user.app_metadata.provider || 'email'}</ThemedText>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/contacts' as any)}
          >
            <ThemedText style={styles.buttonText}>👥 Manage Contacts & Nicknames</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
            <ThemedText style={styles.signOutButtonText}>Sign Out</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'stretch',
    gap: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  activeTripBanner: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.4)',
    padding: Spacing.three,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  bannerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34c759',
  },
  bannerTitle: {
    color: '#34c759',
    fontWeight: '700',
    fontSize: 15,
  },
  bannerSubtitle: {
    fontSize: 12,
    opacity: 0.8,
    marginTop: 2,
  },
  bannerArrow: {
    color: '#34c759',
    fontSize: 18,
    fontWeight: '700',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  cardContainer: {
    padding: Spacing.four,
    borderRadius: 16,
    gap: Spacing.three,
    backgroundColor: '#1c1c1e',
  },
  profileRow: {
    flexDirection: 'column',
    gap: 4,
  },
  primaryButton: {
    backgroundColor: '#007aff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  signOutButton: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  signOutButtonText: {
    color: '#ff453a',
    fontWeight: '600',
  },
});

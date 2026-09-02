import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getTripById, endTrip } from '@/lib/tripsService';
import { supabase } from '@/lib/supabase';
import { TripItem } from '@/types/trip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [trip, setTrip] = useState<TripItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);

  const fetchTrip = async () => {
    if (!id) return;
    setIsLoading(true);
    const { data, error } = await getTripById(id as string);
    if (error) {
      Alert.alert('Error', error.message || 'Could not load trip details');
    } else {
      setTrip(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTrip();

    // Subscribe to realtime updates on this specific trip
    if (!id) return;
    const subscription = supabase
      .channel(`trip-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          if (payload.new) {
            setTrip((prev) => (prev ? { ...prev, ...(payload.new as Partial<TripItem>) } : null));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id]);

  const handleEndTrip = async () => {
    if (!trip) return;

    Alert.alert('End Trip', 'Are you sure you want to end this trip?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Trip',
        style: 'destructive',
        onPress: async () => {
          setIsEnding(true);
          const { error } = await endTrip(trip.id, 'manual');
          setIsEnding(false);

          if (error) {
            Alert.alert('Error', error.message || 'Could not end trip');
          } else {
            setTrip((prev) => (prev ? { ...prev, status: 'ended', end_reason: 'manual' } : null));
            Alert.alert('Trip Ended', 'The trip has been manually ended.');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007aff" />
      </ThemedView>
    );
  }

  if (!trip) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText style={{ opacity: 0.7, marginBottom: 16 }}>Trip not found.</ThemedText>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/')}>
          <ThemedText style={styles.buttonText}>Go Home</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  const isActive = trip.status === 'active';
  const isStarter = user?.id === trip.starter_id;
  const contactName = trip.target_contact?.nickname || 'Contact';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ThemedText style={styles.backButtonText}>← Back</ThemedText>
          </TouchableOpacity>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Trip Details
          </ThemedText>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Status Badge */}
          <View style={[styles.statusCard, isActive ? styles.statusActive : styles.statusEnded]}>
            <View style={[styles.statusDot, isActive ? styles.dotActive : styles.dotEnded]} />
            <ThemedText style={[styles.statusTitle, isActive ? styles.titleActive : styles.titleEnded]}>
              {isActive ? 'Trip is Currently Active' : 'Trip Has Ended'}
            </ThemedText>
            <ThemedText style={styles.statusSubtitle}>
              {isStarter ? `Sharing location with ${contactName}` : `Receiving location from trip starter`}
            </ThemedText>
          </View>

          {/* Details Card */}
          <ThemedView type="backgroundElement" style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <ThemedText type="smallBold">Contact Nickname:</ThemedText>
              <ThemedText type="small">{contactName}</ThemedText>
            </View>

            <View style={styles.detailRow}>
              <ThemedText type="smallBold">Contact Email:</ThemedText>
              <ThemedText type="small">{trip.target_contact?.contact_email || 'N/A'}</ThemedText>
            </View>

            <View style={styles.detailRow}>
              <ThemedText type="smallBold">Role:</ThemedText>
              <ThemedText type="small">{isStarter ? 'Trip Starter (Sender)' : 'Target Contact (Receiver)'}</ThemedText>
            </View>

            <View style={styles.detailRow}>
              <ThemedText type="smallBold">Start Time:</ThemedText>
              <ThemedText type="small">{new Date(trip.start_time).toLocaleString()}</ThemedText>
            </View>

            {trip.predicted_eta && (
              <View style={styles.detailRow}>
                <ThemedText type="smallBold">Estimated Arrival (ETA):</ThemedText>
                <ThemedText type="small">{new Date(trip.predicted_eta).toLocaleTimeString()}</ThemedText>
              </View>
            )}

            {trip.end_time && (
              <View style={styles.detailRow}>
                <ThemedText type="smallBold">Ended At:</ThemedText>
                <ThemedText type="small">{new Date(trip.end_time).toLocaleString()}</ThemedText>
              </View>
            )}

            {trip.end_reason && (
              <View style={styles.detailRow}>
                <ThemedText type="smallBold">End Reason:</ThemedText>
                <ThemedText type="small" style={{ textTransform: 'capitalize' }}>
                  {trip.end_reason}
                </ThemedText>
              </View>
            )}
          </ThemedView>

          {/* Mapbox placeholder indicator for Phase 1 Task 5 */}
          {isActive && (
            <View style={styles.infoBanner}>
              <ThemedText type="small" style={styles.infoBannerText}>
                📍 Live GPS location ping loop activates in Task 4. Live Mapbox map view activates in Task 5.
              </ThemedText>
            </View>
          )}

          {/* Action Buttons */}
          {isActive ? (
            <TouchableOpacity
              style={[styles.endButton, isEnding && styles.disabledButton]}
              onPress={handleEndTrip}
              disabled={isEnding}
            >
              {isEnding ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <ThemedText style={styles.endButtonText}>🛑 End Trip</ThemedText>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/')}>
              <ThemedText style={styles.buttonText}>Return to Home</ThemedText>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingBottom: BottomTabInset,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    paddingVertical: 6,
  },
  backButtonText: {
    color: '#007aff',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  statusCard: {
    padding: Spacing.four,
    borderRadius: 16,
    alignItems: 'center',
    gap: 6,
  },
  statusActive: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.4)',
  },
  statusEnded: {
    backgroundColor: 'rgba(142, 142, 147, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.3)',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    backgroundColor: '#34c759',
  },
  dotEnded: {
    backgroundColor: '#8e8e93',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  titleActive: {
    color: '#34c759',
  },
  titleEnded: {
    color: '#8e8e93',
  },
  statusSubtitle: {
    fontSize: 14,
    opacity: 0.8,
    textAlign: 'center',
  },
  detailsCard: {
    padding: Spacing.four,
    borderRadius: 14,
    backgroundColor: '#1c1c1e',
    gap: Spacing.three,
  },
  detailRow: {
    flexDirection: 'column',
    gap: 2,
  },
  infoBanner: {
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    padding: Spacing.three,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  infoBannerText: {
    color: '#007aff',
    textAlign: 'center',
  },
  endButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  disabledButton: {
    opacity: 0.5,
  },
  endButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#007aff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
});

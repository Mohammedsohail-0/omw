import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { getUserContacts, deleteContact, syncUnlinkedContacts } from '@/lib/contactsService';
import { ContactItem } from '@/types/contact';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function ContactsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadContacts = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    await syncUnlinkedContacts();
    const { data, error } = await getUserContacts();
    if (error) {
      Alert.alert('Error', error.message || 'Failed to load contacts');
    } else {
      setContacts(data || []);
    }
    setIsLoading(false);
  }, [user]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await syncUnlinkedContacts();
    const { data } = await getUserContacts();
    if (data) setContacts(data);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleDelete = (contact: ContactItem) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to remove "${contact.nickname}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteContact(contact.id);
            if (error) {
              Alert.alert('Error', error.message || 'Could not delete contact');
            } else {
              setContacts((prev) => prev.filter((c) => c.id !== contact.id));
            }
          },
        },
      ]
    );
  };

  const renderContactCard = ({ item }: { item: ContactItem }) => {
    const isOnApp = Boolean(item.contact_user_id);

    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.nameContainer}>
            <ThemedText type="subtitle" style={styles.nickname}>
              {item.nickname}
            </ThemedText>
            <ThemedText type="small" style={styles.email}>
              {item.contact_email}
            </ThemedText>
          </View>

          <View style={[styles.badge, isOnApp ? styles.badgeRegistered : styles.badgeUnregistered]}>
            <View style={[styles.statusDot, isOnApp ? styles.dotRegistered : styles.dotUnregistered]} />
            <ThemedText style={[styles.badgeText, isOnApp ? styles.badgeTextRegistered : styles.badgeTextUnregistered]}>
              {isOnApp ? 'On OMW' : 'Not Registered'}
            </ThemedText>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item)}
          >
            <ThemedText style={styles.deleteButtonText}>Remove</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ThemedText style={styles.backButtonText}>← Back</ThemedText>
          </TouchableOpacity>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Contacts
          </ThemedText>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/contacts/add' as any)}
          >
            <ThemedText style={styles.addButtonText}>+ Add</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {isLoading && !isRefreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#007aff" />
          </View>
        ) : (
          <FlatList
            data={contacts}
            keyExtractor={(item) => item.id}
            renderItem={renderContactCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#007aff" />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <ThemedText type="default" style={styles.emptyText}>
                  No contacts added yet.
                </ThemedText>
                <ThemedText type="small" style={styles.emptySubtext}>
                  Add contacts with nicknames to start live trip sharing when ready.
                </ThemedText>
                <TouchableOpacity
                  style={styles.primaryAddButton}
                  onPress={() => router.push('/contacts/add' as any)}
                >
                  <ThemedText style={styles.primaryAddButtonText}>+ Add First Contact</ThemedText>
                </TouchableOpacity>
              </View>
            }
          />
        )}
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
    paddingHorizontal: 10,
  },
  backButtonText: {
    color: '#007aff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
  },
  addButton: {
    backgroundColor: '#007aff',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  card: {
    padding: Spacing.four,
    borderRadius: 14,
    backgroundColor: '#1c1c1e',
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameContainer: {
    flex: 1,
    marginRight: 10,
  },
  nickname: {
    fontSize: 17,
    fontWeight: '600',
  },
  email: {
    opacity: 0.7,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6,
  },
  badgeRegistered: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.4)',
  },
  badgeUnregistered: {
    backgroundColor: 'rgba(142, 142, 147, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.3)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotRegistered: {
    backgroundColor: '#34c759',
  },
  dotUnregistered: {
    backgroundColor: '#8e8e93',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextRegistered: {
    color: '#34c759',
  },
  badgeTextUnregistered: {
    color: '#8e8e93',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  deleteButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  deleteButtonText: {
    color: '#ff453a',
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.five * 2,
    gap: Spacing.two,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    textAlign: 'center',
    opacity: 0.6,
    paddingHorizontal: Spacing.four,
  },
  primaryAddButton: {
    backgroundColor: '#007aff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: Spacing.three,
  },
  primaryAddButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});

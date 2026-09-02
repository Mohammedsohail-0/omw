import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Contacts from 'expo-contacts';
import { createContact } from '@/lib/contactsService';
import { DeviceContactItem } from '@/types/contact';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function AddContactScreen() {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Phone Contacts Picker Modal state
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [deviceContacts, setDeviceContacts] = useState<DeviceContactItem[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  const handleOpenDeviceContacts = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Notice', 'Phone contacts access is not supported on web. Please type manually.');
      return;
    }

    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access contacts was denied.');
        return;
      }

      setIsLoadingContacts(true);
      setIsPickerVisible(true);

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Emails, Contacts.Fields.Name],
      });

      const parsed: DeviceContactItem[] = [];
      if (data && data.length > 0) {
        for (const item of data) {
          if (item.emails && item.emails.length > 0) {
            for (const emailObj of item.emails) {
              if (emailObj.email) {
                parsed.push({
                  id: `${item.id}-${emailObj.email}`,
                  name: item.name || 'Unknown Contact',
                  email: emailObj.email,
                });
              }
            }
          }
        }
      }

      setDeviceContacts(parsed);
    } catch (err) {
      Alert.alert('Error', 'Could not load phone contacts');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleSelectDeviceContact = (item: DeviceContactItem) => {
    setNickname(item.name);
    setEmail(item.email);
    setIsPickerVisible(false);
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert('Missing Field', 'Please enter a nickname for this contact.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await createContact({
      nickname,
      contact_email: email,
    });
    setIsSubmitting(false);

    if (error) {
      Alert.alert('Error', error.message || 'Failed to add contact.');
    } else {
      Alert.alert('Success', `Contact "${data?.nickname}" saved successfully!`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ThemedText style={styles.backButtonText}>Cancel</ThemedText>
          </TouchableOpacity>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            Add Contact
          </ThemedText>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.content}>
          {/* Pick from Phone Button */}
          <TouchableOpacity
            style={styles.devicePickerButton}
            onPress={handleOpenDeviceContacts}
          >
            <ThemedText style={styles.devicePickerButtonText}>
              📖 Pick from Phone Contacts
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <ThemedText style={styles.dividerText}>OR MANUAL ENTRY</ThemedText>
            <View style={styles.dividerLine} />
          </View>

          {/* Form Inputs */}
          <View style={styles.formGroup}>
            <ThemedText type="smallBold" style={styles.label}>
              Nickname
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="e.g. Alex, Mom, Bestie"
              placeholderTextColor="#666"
              value={nickname}
              onChangeText={setNickname}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText type="smallBold" style={styles.label}>
              Contact Email
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="e.g. friend@example.com"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <ThemedText type="small" style={styles.hint}>
            If this email is already registered on OMW, your contact will be automatically linked for live trip sharing!
          </ThemedText>

          <TouchableOpacity
            style={[styles.saveButton, isSubmitting && styles.disabledButton]}
            onPress={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText style={styles.saveButtonText}>Save Contact</ThemedText>
            )}
          </TouchableOpacity>
        </View>

        {/* Modal for Device Contacts */}
        <Modal
          visible={isPickerVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setIsPickerVisible(false)}
        >
          <ThemedView style={styles.modalContainer}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle">Select Phone Contact</ThemedText>
                <TouchableOpacity onPress={() => setIsPickerVisible(false)}>
                  <ThemedText style={styles.closeModalText}>Close</ThemedText>
                </TouchableOpacity>
              </View>

              {isLoadingContacts ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color="#007aff" />
                </View>
              ) : (
                <FlatList
                  data={deviceContacts}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.contactItem}
                      onPress={() => handleSelectDeviceContact(item)}
                    >
                      <ThemedText type="default" style={styles.contactItemName}>
                        {item.name}
                      </ThemedText>
                      <ThemedText type="small" style={styles.contactItemEmail}>
                        {item.email}
                      </ThemedText>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.centerContainer}>
                      <ThemedText style={{ opacity: 0.6 }}>No contacts with email addresses found.</ThemedText>
                    </View>
                  }
                />
              )}
            </SafeAreaView>
          </ThemedView>
        </Modal>
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
    gap: Spacing.three,
  },
  devicePickerButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  devicePickerButtonText: {
    color: '#007aff',
    fontWeight: '600',
    fontSize: 15,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.two,
    gap: Spacing.two,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    fontSize: 11,
    color: '#8e8e93',
    fontWeight: '600',
  },
  formGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
  },
  input: {
    backgroundColor: '#1c1c1e',
    color: '#ffffff',
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  hint: {
    opacity: 0.6,
    fontSize: 12,
    marginTop: -4,
  },
  saveButton: {
    backgroundColor: '#007aff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  disabledButton: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    paddingHorizontal: Spacing.four,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeModalText: {
    color: '#007aff',
    fontSize: 16,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  contactItem: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  contactItemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  contactItemEmail: {
    opacity: 0.7,
    marginTop: 2,
  },
});

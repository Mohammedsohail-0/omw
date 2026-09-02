import { supabase } from '@/lib/supabase';
import { ContactItem, CreateContactPayload } from '@/types/contact';

/**
 * Fetch all contacts owned by the currently logged-in user
 */
export async function getUserContacts(): Promise<{ data: ContactItem[] | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error };
    }

    return { data: data as ContactItem[], error: null };
  } catch (err: any) {
    return { data: null, error: err || new Error('Failed to fetch contacts') };
  }
}

/**
 * Create a new contact with automatic user matching by email
 */
export async function createContact(
  payload: CreateContactPayload
): Promise<{ data: ContactItem | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('User not authenticated') };
    }

    const cleanEmail = payload.contact_email.toLowerCase().trim();
    const cleanNickname = payload.nickname.trim();

    if (!cleanEmail) {
      return { data: null, error: new Error('Contact email is required') };
    }
    if (!cleanNickname) {
      return { data: null, error: new Error('Nickname is required') };
    }

    // Check if the contact email belongs to a registered OMW user
    let matchingUserId: string | null = null;
    const { data: matchedUsers } = await supabase
      .from('users')
      .select('id')
      .eq('email', cleanEmail)
      .limit(1);

    if (matchedUsers && matchedUsers.length > 0) {
      matchingUserId = matchedUsers[0].id;
    }

    // Insert new contact row
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        owner_id: user.id,
        contact_email: cleanEmail,
        nickname: cleanNickname,
        contact_user_id: matchingUserId,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error };
    }

    return { data: data as ContactItem, error: null };
  } catch (err: any) {
    return { data: null, error: err || new Error('Failed to create contact') };
  }
}

/**
 * Delete a contact by ID
 */
export async function deleteContact(contactId: string): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactId)
      .eq('owner_id', user.id);

    return { error };
  } catch (err: any) {
    return { error: err || new Error('Failed to delete contact') };
  }
}

/**
 * Re-scan un-linked contacts to see if any registered recently
 */
export async function syncUnlinkedContacts(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get unlinked contacts
    const { data: unlinked } = await supabase
      .from('contacts')
      .select('id, contact_email')
      .eq('owner_id', user.id)
      .is('contact_user_id', null);

    if (!unlinked || unlinked.length === 0) return;

    for (const contact of unlinked) {
      const { data: matched } = await supabase
        .from('users')
        .select('id')
        .eq('email', contact.contact_email.toLowerCase())
        .limit(1);

      if (matched && matched.length > 0) {
        await supabase
          .from('contacts')
          .update({ contact_user_id: matched[0].id })
          .eq('id', contact.id);
      }
    }
  } catch (err) {
    console.warn('Error syncing unlinked contacts:', err);
  }
}

import { supabase } from '@/lib/supabase';
import { TripItem } from '@/types/trip';

/**
 * Fetch active trip where current user is starter or target receiver
 */
export async function getActiveTripForUser(): Promise<{ data: TripItem | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };

    // Fetch active trip where user is starter
    const { data: starterTrips, error: starterError } = await supabase
      .from('trips')
      .select('*, target_contact:contacts(*)')
      .eq('starter_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (starterError) return { data: null, error: starterError };
    if (starterTrips && starterTrips.length > 0) {
      return { data: starterTrips[0] as TripItem, error: null };
    }

    // Fetch active trip where user is target contact
    const { data: userContacts } = await supabase
      .from('contacts')
      .select('id')
      .eq('contact_user_id', user.id);

    if (userContacts && userContacts.length > 0) {
      const contactIds = userContacts.map((c) => c.id);
      const { data: targetTrips, error: targetError } = await supabase
        .from('trips')
        .select('*, target_contact:contacts(*)')
        .in('target_contact_id', contactIds)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (targetError) return { data: null, error: targetError };
      if (targetTrips && targetTrips.length > 0) {
        return { data: targetTrips[0] as TripItem, error: null };
      }
    }

    return { data: null, error: null };
  } catch (err: any) {
    return { data: null, error: err || new Error('Failed to fetch active trip') };
  }
}

/**
 * Fetch a trip by ID
 */
export async function getTripById(tripId: string): Promise<{ data: TripItem | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*, target_contact:contacts(*)')
      .eq('id', tripId)
      .single();

    if (error) return { data: null, error };
    return { data: data as TripItem, error: null };
  } catch (err: any) {
    return { data: null, error: err || new Error('Failed to fetch trip') };
  }
}

/**
 * Start a new trip to a registered contact (enforcing one-active-trip rule)
 */
export async function startTrip(targetContactId: string): Promise<{ data: TripItem | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('User not authenticated') };

    // 1. Enforce one-active-trip rule for starter
    const { data: existingActive } = await supabase
      .from('trips')
      .select('id')
      .eq('starter_id', user.id)
      .eq('status', 'active');

    if (existingActive && existingActive.length > 0) {
      return {
        data: null,
        error: new Error('You already have an active trip. End your current trip before starting a new one.'),
      };
    }

    // 2. Check target contact validity
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, contact_user_id, nickname')
      .eq('id', targetContactId)
      .single();

    if (contactError || !contact) {
      return { data: null, error: new Error('Contact not found') };
    }

    if (!contact.contact_user_id) {
      return {
        data: null,
        error: new Error(`"${contact.nickname}" is not registered on OMW yet. Invite links will be available in Phase 2.`),
      };
    }

    // 3. Create placeholder ETA (30 mins from now)
    const now = new Date();
    const placeholderEta = new Date(now.getTime() + 30 * 60 * 1000);

    // 4. Insert trip row
    const { data: createdTrip, error: insertError } = await supabase
      .from('trips')
      .insert({
        starter_id: user.id,
        target_contact_id: targetContactId,
        status: 'active',
        start_time: now.toISOString(),
        predicted_eta: placeholderEta.toISOString(),
      })
      .select('*, target_contact:contacts(*)')
      .single();

    if (insertError) return { data: null, error: insertError };
    return { data: createdTrip as TripItem, error: null };
  } catch (err: any) {
    return { data: null, error: err || new Error('Failed to start trip') };
  }
}

/**
 * End an active trip manually or by proximity
 */
export async function endTrip(
  tripId: string,
  endReason: 'manual' | 'proximity' | 'timeout' = 'manual'
): Promise<{ error: Error | null }> {
  try {
    const now = new Date();
    const { error } = await supabase
      .from('trips')
      .update({
        status: 'ended',
        end_time: now.toISOString(),
        end_reason: endReason,
      })
      .eq('id', tripId);

    return { error };
  } catch (err: any) {
    return { error: err || new Error('Failed to end trip') };
  }
}

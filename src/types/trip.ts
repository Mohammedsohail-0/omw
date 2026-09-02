export interface TripItem {
  id: string;
  starter_id: string;
  target_contact_id: string;
  status: 'active' | 'ended';
  start_time: string;
  end_time: string | null;
  end_reason: 'proximity' | 'manual' | 'timeout' | null;
  predicted_eta: string | null;
  created_at: string;
  // Expanded relation fields (optional)
  target_contact?: {
    id: string;
    nickname: string;
    contact_email: string;
    contact_user_id: string | null;
  };
  starter_user?: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

export interface CreateTripPayload {
  target_contact_id: string;
}

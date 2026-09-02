export interface ContactItem {
  id: string;
  owner_id: string;
  contact_email: string;
  nickname: string;
  contact_user_id: string | null;
  created_at: string;
}

export interface CreateContactPayload {
  contact_email: string;
  nickname: string;
}

export interface DeviceContactItem {
  id: string;
  name: string;
  email: string;
}

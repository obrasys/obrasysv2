export interface ClientObraAccess {
  id: string;
  client_user_id: string;
  obra_id: string;
  granted_by: string | null;
  ativo: boolean;
  created_at: string;
}

export interface ClientAccessLog {
  id: string;
  client_user_id: string;
  obra_id: string;
  event_type: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
}

export type PortalEventType = 
  | 'portal_open'
  | 'rdo_open'
  | 'rdo_download'
  | 'photo_open'
  | 'album_open';

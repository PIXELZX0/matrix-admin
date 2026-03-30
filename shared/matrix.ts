export interface MatrixLoginFlow {
  type: string;
}

export interface MatrixFeatures {
  unstable_features?: Record<string, boolean>;
  versions: string[];
}

export interface SessionUserIdentity {
  id: string;
  fullName: string;
}

export interface SessionView {
  authenticated: boolean;
  baseUrl?: string;
  csrfToken?: string;
  homeServer?: string;
  identity?: SessionUserIdentity;
}

export interface DiscoveryResult {
  baseUrl: string;
  loginFlows: MatrixLoginFlow[];
  matrixVersions: string[];
  serverVersion?: string;
  supportsPassword: boolean;
  supportsSso: boolean;
}

export interface DashboardSummary {
  destinationCount: number;
  failingDestinationCount: number;
  matrixVersions: string[];
  openReportCount: number;
  roomCount: number;
  serverVersion?: string;
  userCount: number;
}

export interface Threepid {
  address: string;
  added_at?: number;
  medium: string;
  validated_at?: number;
}

export interface ExternalId {
  auth_provider: string;
  external_id: string;
}

export interface User {
  admin: 0 | 1;
  appservice_id?: string;
  avatar_url?: string;
  consent_server_notice_sent?: string;
  consent_ts?: number;
  consent_version?: string;
  creation_ts: number;
  deactivated: 0 | 1;
  displayname?: string;
  erased: boolean;
  external_ids: ExternalId[];
  is_guest: 0 | 1;
  locked: boolean;
  name: string;
  shadow_banned: 0 | 1;
  threepids: Threepid[];
  user_type?: string | null;
}

export interface Device {
  device_id: string;
  display_name?: string;
  last_seen_ip?: string;
  last_seen_ts?: number;
  last_seen_user_agent?: string;
  user_id: string;
}

export interface WhoisConnection {
  ip: string;
  last_seen: number;
  user_agent: string;
}

export interface WhoisResponse {
  devices: Record<
    string,
    {
      sessions: Array<{
        connections: WhoisConnection[];
      }>;
    }
  >;
  user_id: string;
}

export interface Pusher {
  app_display_name: string;
  app_id: string;
  data: {
    format: string;
    url?: string;
  };
  device_display_name: string;
  format: string;
  kind: string;
  lang: string;
  profile_tag: string;
  pushkey: string;
  url?: string;
}

export interface Room {
  avatar_url?: string;
  canonical_alias?: string;
  creator: string;
  encryption?: string;
  federatable: boolean;
  guest_access?: "can_join" | "forbidden";
  history_visibility: "invited" | "joined" | "shared" | "world_readable";
  joined_local_members: number;
  joined_members: number;
  join_rules: "public" | "knock" | "invite" | "private";
  name?: string;
  public: boolean;
  room_id: string;
  room_type?: string;
  state_events: number;
  topic?: string;
  version: number;
}

export interface RoomStateEvent {
  age: number;
  content: Record<string, unknown>;
  event_id: string;
  origin_server_ts: number;
  room_id: string;
  sender: string;
  state_key: string;
  type: string;
  user_id?: string;
  unsigned?: {
    age?: number;
  };
}

export interface ForwardExtremity {
  depth: number;
  event_id: string;
  received_ts: number;
  state_group: number;
}

export interface EventReport {
  canonical_alias?: string;
  event_id: string;
  id: number;
  name: string;
  reason?: string;
  received_ts: number;
  room_id: string;
  score?: number;
  sender: string;
  user_id: string;
}

export interface UserMedia {
  created_ts: number;
  last_access_ts?: number;
  media_id: string;
  media_length: number;
  media_type: string;
  quarantined_by?: string;
  safe_from_quarantine: boolean;
  upload_name?: string;
}

export interface UserMediaStatistic {
  displayname?: string;
  media_count: number;
  media_length: number;
  user_id: string;
}

export interface RegistrationToken {
  completed: number;
  expiry_time?: number;
  pending: number;
  token: string;
  uses_allowed: number | null;
}

export interface Destination {
  destination: string;
  failure_ts: number;
  last_successful_stream_ordering?: number;
  retry_interval: number;
  retry_last_ts: number;
}

export interface DestinationRoom {
  room_id: string;
  stream_ordering: number;
}

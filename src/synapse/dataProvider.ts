import queryString from "query-string";
import type { DataProvider, DeleteParams, Identifier, PaginationPayload, RaRecord, SortPayload } from "react-admin";

import type {
  Destination,
  DestinationRoom,
  EventReport,
  ForwardExtremity,
  RegistrationToken,
  Room,
  RoomStateEvent,
  User,
  UserMedia,
  UserMediaStatistic,
  Device,
  Pusher,
  WhoisResponse,
} from "@shared/matrix";

import { apiRequest } from "../lib/api";
import { getMediaThumbnailUrl } from "./synapse";

type JsonObject = Record<string, any>;
type ResourceMapper = (record: any) => RaRecord;
type TotalResolver = (json: JsonObject, from?: number, perPage?: number) => number;
type CreateRequest = (data: any) => {
  body?: JsonObject;
  endpoint: string;
  method: "POST" | "PUT";
};
type DeleteRequest = (params: DeleteParams) => {
  body?: JsonObject;
  endpoint: string;
  method?: "DELETE" | "POST" | "PUT";
};
type ReferenceRequest = (id: Identifier) => {
  endpoint: string;
};

interface ResourceConfigBase {
  create?: CreateRequest;
  data: string;
  delete?: DeleteRequest;
  map: ResourceMapper;
  total?: TotalResolver;
}

interface CollectionResourceConfig extends ResourceConfigBase {
  path: string;
}

interface ReferenceResourceConfig extends ResourceConfigBase {
  reference: ReferenceRequest;
}

interface ActionResourceConfig extends ResourceConfigBase {
  path?: never;
  reference?: never;
}

type ResourceConfig = CollectionResourceConfig | ReferenceResourceConfig | ActionResourceConfig;
type ResourceMap = Record<string, ResourceConfig>;

export interface DeleteMediaParams {
  before_ts: number | string;
  keep_profiles: boolean;
  size_gt: number;
}

export interface DeleteMediaResult {
  deleted_media: Identifier[];
  total: number;
}

export interface SynapseDataProvider extends DataProvider {
  createMany: (resource: string, params: { data: RaRecord; ids: Identifier[] }) => Promise<{ data: unknown[] }>;
  deleteMedia: (params: DeleteMediaParams) => Promise<DeleteMediaResult>;
}

export const mxcUrlToHttp = (mxcUrl: string): string | null => getMediaThumbnailUrl(mxcUrl);

const userResourceConfigs = {
  users: {
    path: "/api/admin/users",
    map: (user: User) => ({
      ...user,
      admin: !!user.admin,
      avatar_src: user.avatar_url ? mxcUrlToHttp(user.avatar_url) : undefined,
      creation_ts_ms: user.creation_ts * 1000,
      deactivated: !!user.deactivated,
      id: user.name,
      is_guest: !!user.is_guest,
    }),
    data: "users",
    total: json => Number(json.total ?? 0),
    create: (data: RaRecord) => ({
      body: data,
      endpoint: "/api/admin/users",
      method: "POST",
    }),
    delete: (params: DeleteParams) => ({
      endpoint: `/api/admin/users/${encodeURIComponent(String(params.id))}`,
      method: "DELETE",
    }),
  },
  devices: {
    map: (device: Device) => ({
      ...device,
      id: device.device_id,
    }),
    data: "devices",
    total: json => Number(json.total ?? 0),
    reference: (id: Identifier) => ({
      endpoint: `/api/admin/users/${encodeURIComponent(String(id))}/devices`,
    }),
    delete: (params: DeleteParams) => ({
      endpoint: `/api/admin/users/${encodeURIComponent(String(params.previousData.user_id))}/devices/${encodeURIComponent(
        String(params.id)
      )}`,
      method: "DELETE",
    }),
  },
  connections: {
    path: "/api/admin/users/connections",
    map: (connection: WhoisResponse) => ({
      ...connection,
      id: connection.user_id,
    }),
    data: "connections",
  },
  pushers: {
    map: (pusher: Pusher) => ({
      ...pusher,
      id: pusher.pushkey,
    }),
    reference: (id: Identifier) => ({
      endpoint: `/api/admin/users/${encodeURIComponent(String(id))}/pushers`,
    }),
    data: "pushers",
    total: json => Number(json.total ?? 0),
  },
  joined_rooms: {
    map: (roomId: string) => ({
      id: roomId,
    }),
    reference: (id: Identifier) => ({
      endpoint: `/api/admin/users/${encodeURIComponent(String(id))}/joined-rooms`,
    }),
    data: "joined_rooms",
    total: json => Number(json.total ?? 0),
  },
  servernotices: {
    map: (notice: { event_id?: string }) => ({ id: notice.event_id ?? "ok" }),
    create: (data: { id: string; body: string }) => ({
      body: data,
      endpoint: "/api/admin/users/server-notices",
      method: "POST",
    }),
    data: "event_id",
  },
  registration_tokens: {
    path: "/api/admin/registration-tokens",
    map: (token: RegistrationToken) => ({
      ...token,
      id: token.token,
    }),
    data: "registration_tokens",
    total: json => (Array.isArray(json.registration_tokens) ? json.registration_tokens.length : 0),
    create: (data: RaRecord) => ({
      body: data,
      endpoint: "/api/admin/registration-tokens",
      method: "POST",
    }),
    delete: (params: DeleteParams) => ({
      endpoint: `/api/admin/registration-tokens/${encodeURIComponent(String(params.id))}`,
      method: "DELETE",
    }),
  },
} satisfies ResourceMap;

const roomResourceConfigs = {
  rooms: {
    path: "/api/admin/rooms",
    map: (room: Room) => ({
      ...room,
      alias: room.canonical_alias,
      avatar_src: room.avatar_url ? mxcUrlToHttp(room.avatar_url) : undefined,
      federatable: !!room.federatable,
      id: room.room_id,
      is_encrypted: !!room.encryption,
      local_members: room.joined_local_members,
      members: room.joined_members,
      public: !!room.public,
    }),
    data: "rooms",
    total: json => Number(json.total_rooms ?? 0),
    delete: (params: DeleteParams) => ({
      endpoint: `/api/admin/rooms/${encodeURIComponent(String(params.id))}`,
      method: "DELETE",
    }),
  },
  reports: {
    path: "/api/admin/reports",
    map: (eventReport: EventReport) => ({
      ...eventReport,
    }),
    data: "event_reports",
    total: json => Number(json.total ?? 0),
  },
  room_members: {
    map: (member: string) => ({
      id: member,
    }),
    reference: (id: Identifier) => ({
      endpoint: `/api/admin/rooms/${encodeURIComponent(String(id))}/members`,
    }),
    data: "members",
    total: json => Number(json.total ?? 0),
  },
  room_state: {
    map: (roomState: RoomStateEvent) => ({
      ...roomState,
      id: roomState.event_id,
    }),
    reference: (id: Identifier) => ({
      endpoint: `/api/admin/rooms/${encodeURIComponent(String(id))}/state`,
    }),
    data: "state",
    total: json => (Array.isArray(json.state) ? json.state.length : 0),
  },
  forward_extremities: {
    map: (extremity: ForwardExtremity) => ({
      ...extremity,
      id: extremity.event_id,
    }),
    reference: (id: Identifier) => ({
      endpoint: `/api/admin/rooms/${encodeURIComponent(String(id))}/forward-extremities`,
    }),
    data: "results",
    total: json => Number(json.count ?? 0),
  },
  room_directory: {
    path: "/api/admin/room-directory",
    map: (room: Room & { guest_can_join?: boolean; num_joined_members?: number; world_readable?: boolean }) => ({
      ...room,
      avatar_src: room.avatar_url ? mxcUrlToHttp(room.avatar_url) : undefined,
      guest_access: !!room.guest_access,
      id: room.room_id,
      public: !!room.public,
    }),
    data: "chunk",
    total: json => Number(json.total_room_count_estimate ?? 0),
    create: (data: RaRecord) => ({
      endpoint: `/api/admin/room-directory/${encodeURIComponent(String(data.id))}/publish`,
      method: "PUT",
    }),
    delete: (params: DeleteParams) => ({
      endpoint: `/api/admin/room-directory/${encodeURIComponent(String(params.id))}/unpublish`,
      method: "PUT",
    }),
  },
} satisfies ResourceMap;

const mediaResourceConfigs = {
  users_media: {
    map: (media: UserMedia) => ({
      ...media,
      id: media.media_id,
    }),
    reference: (id: Identifier) => ({
      endpoint: `/api/admin/users/${encodeURIComponent(String(id))}/media`,
    }),
    data: "media",
    total: json => Number(json.total ?? 0),
    delete: (params: DeleteParams) => ({
      endpoint: `/api/admin/media/${encodeURIComponent(String(params.id))}`,
      method: "DELETE",
    }),
  },
  protect_media: {
    map: (media: UserMedia) => ({ id: media.media_id }),
    create: (data: UserMedia) => ({
      endpoint: `/api/admin/media/${encodeURIComponent(data.media_id)}/protect`,
      method: "POST",
    }),
    delete: (params: DeleteParams) => ({
      endpoint: `/api/admin/media/${encodeURIComponent(String(params.id))}/unprotect`,
      method: "POST",
    }),
    data: "media_id",
  },
  quarantine_media: {
    map: (media: UserMedia) => ({ id: media.media_id }),
    create: (data: UserMedia) => ({
      endpoint: `/api/admin/media/${encodeURIComponent(data.media_id)}/quarantine`,
      method: "POST",
    }),
    delete: (params: DeleteParams) => ({
      endpoint: `/api/admin/media/${encodeURIComponent(String(params.id))}/unquarantine`,
      method: "POST",
    }),
    data: "media_id",
  },
  user_media_statistics: {
    path: "/api/admin/media/user-statistics",
    map: (statistic: UserMediaStatistic) => ({
      ...statistic,
      id: statistic.user_id,
    }),
    data: "users",
    total: json => Number(json.total ?? 0),
  },
} satisfies ResourceMap;

const federationResourceConfigs = {
  destinations: {
    path: "/api/admin/federation/destinations",
    map: (destination: Destination) => ({
      ...destination,
      id: destination.destination,
    }),
    data: "destinations",
    total: json => Number(json.total ?? 0),
    delete: (params: DeleteParams) => ({
      endpoint: `/api/admin/federation/destinations/${encodeURIComponent(String(params.id))}/reconnect`,
      method: "POST",
    }),
  },
  destination_rooms: {
    map: (destinationRoom: DestinationRoom) => ({
      ...destinationRoom,
      id: destinationRoom.room_id,
    }),
    reference: (id: Identifier) => ({
      endpoint: `/api/admin/federation/destinations/${encodeURIComponent(String(id))}/rooms`,
    }),
    data: "rooms",
    total: json => Number(json.total ?? 0),
  },
} satisfies ResourceMap;

const resourceMap = {
  ...federationResourceConfigs,
  ...mediaResourceConfigs,
  ...roomResourceConfigs,
  ...userResourceConfigs,
} satisfies ResourceMap;

export function filterNullValues(key: string, value: any) {
  if (value === null && key !== "user_type") {
    return undefined;
  }

  return value;
}

export const hasPath = (resource: ResourceConfig): resource is CollectionResourceConfig => "path" in resource;

export const hasReference = (resource: ResourceConfig): resource is ReferenceResourceConfig => "reference" in resource;

export const supportsCreate = (resource: ResourceConfig): resource is ResourceConfig & { create: CreateRequest } =>
  typeof resource.create === "function";

export const supportsDelete = (resource: ResourceConfig): resource is ResourceConfig & { delete: DeleteRequest } =>
  typeof resource.delete === "function";

export const isJsonArray = (value: unknown): value is unknown[] => Array.isArray(value);

export const getSearchOrder = (order: "ASC" | "DESC") => (order === "DESC" ? "b" : "f");

export const getResourceConfig = (resourceName: string): ResourceConfig => {
  const config = resourceMap[resourceName];

  if (!config) {
    throw new Error(`Unknown resource: ${resourceName}`);
  }

  return config;
};

export const getCollectionResource = (resourceName: string): CollectionResourceConfig => {
  const config = getResourceConfig(resourceName);

  if (!hasPath(config)) {
    throw new Error(`Resource ${resourceName} does not support collection requests`);
  }

  return config;
};

export const getReferenceResource = (resourceName: string): ReferenceResourceConfig => {
  const config = getResourceConfig(resourceName);

  if (!hasReference(config)) {
    throw new Error(`Resource ${resourceName} does not support reference requests`);
  }

  return config;
};

export const getResourceTotal = (config: ResourceConfig, json: JsonObject, from?: number, perPage?: number): number => {
  if (typeof config.total === "function") {
    return config.total(json, from, perPage);
  }

  const data = json[config.data];
  return isJsonArray(data) ? data.length : 0;
};

export const mapResourceData = (config: ResourceConfig, json: JsonObject): RaRecord[] => {
  const data = json[config.data];
  return isJsonArray(data) ? data.map(item => config.map(item)) : [];
};

const buildResourceUrl = (endpoint: string, query?: Record<string, unknown>) => {
  const search = queryString.stringify(query ?? {});
  return search ? `${endpoint}?${search}` : endpoint;
};

export const buildCollectionUrl = (resourceName: string, query?: Record<string, unknown>) =>
  buildResourceUrl(getCollectionResource(resourceName).path, query);

export const buildReferenceUrl = (resourceName: string, id: Identifier, query?: Record<string, unknown>) =>
  buildResourceUrl(getReferenceResource(resourceName).reference(id).endpoint, query);

export const fetchResourceRecord = async (resourceName: string, id: Identifier) => {
  const config = getCollectionResource(resourceName);
  const json = await apiRequest<JsonObject>(`${config.path}/${encodeURIComponent(String(id))}`);
  return config.map(json);
};

export const createResource = async (resourceName: string, data: Partial<RaRecord>) => {
  const config = getResourceConfig(resourceName);

  if (!supportsCreate(config)) {
    throw new Error(`Create ${resourceName} is not allowed`);
  }

  const request = config.create(data);
  const json = await apiRequest<JsonObject>(request.endpoint, {
    body: request.body ? JSON.stringify(request.body, filterNullValues) : undefined,
    headers: request.body
      ? {
          "Content-Type": "application/json",
        }
      : undefined,
    method: request.method,
  });

  return { data: config.map(json) };
};

export const deleteResource = async (resourceName: string, params: DeleteParams) => {
  const config = getResourceConfig(resourceName);

  if (supportsDelete(config)) {
    const request = config.delete(params);
    const json = await apiRequest<JsonObject>(request.endpoint, {
      body: request.body ? JSON.stringify(request.body, filterNullValues) : undefined,
      headers: request.body
        ? {
            "Content-Type": "application/json",
          }
        : undefined,
      method: request.method ?? "DELETE",
    });

    return { data: json };
  }

  const collectionConfig = getCollectionResource(resourceName);
  const json = await apiRequest<JsonObject>(`${collectionConfig.path}/${encodeURIComponent(String(params.id))}`, {
    body: JSON.stringify(params.previousData, filterNullValues),
    headers: {
      "Content-Type": "application/json",
    },
    method: "DELETE",
  });

  return { data: json };
};

export const deleteMedia = async ({
  before_ts,
  keep_profiles = true,
  size_gt = 0,
}: DeleteMediaParams): Promise<DeleteMediaResult> =>
  apiRequest<DeleteMediaResult>("/api/admin/media/bulk-delete", {
    body: JSON.stringify({
      before_ts,
      keep_profiles,
      size_gt,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

const dataProvider = {
  getList: async (resource, params) => {
    const { user_id, name, guests, deactivated, locked, search_term, destination, valid } = params.filter;
    const { page, perPage } = params.pagination as PaginationPayload;
    const { field, order } = params.sort as SortPayload;
    const from = (page - 1) * perPage;
    const query = {
      deactivated,
      destination,
      dir: getSearchOrder(order),
      from,
      guests,
      limit: perPage,
      locked,
      name,
      order_by: field,
      search_term,
      user_id,
      valid,
    };

    const config = getCollectionResource(resource);
    const json = await apiRequest<JsonObject>(buildCollectionUrl(resource, query));

    return {
      data: mapResourceData(config, json),
      total: getResourceTotal(config, json, from, perPage),
    };
  },

  getOne: async (resource, params) => ({
    data: await fetchResourceRecord(resource, params.id),
  }),

  getMany: async (resource, params) => {
    const responses = await Promise.all(params.ids.map(id => fetchResourceRecord(resource, id)));

    return {
      data: responses,
      total: responses.length,
    };
  },

  getManyReference: async (resource, params) => {
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;
    const from = (page - 1) * perPage;
    const query = {
      dir: getSearchOrder(order),
      from,
      limit: perPage,
      order_by: field,
    };

    const config = getReferenceResource(resource);
    const json = await apiRequest<JsonObject>(buildReferenceUrl(resource, params.id, query));

    return {
      data: mapResourceData(config, json),
      total: getResourceTotal(config, json, from, perPage),
    };
  },

  update: async (resource, params) => {
    const config = getCollectionResource(resource);
    const json = await apiRequest<JsonObject>(`${config.path}/${encodeURIComponent(String(params.id))}`, {
      body: JSON.stringify(params.data, filterNullValues),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PUT",
    });

    return { data: config.map(json) };
  },

  updateMany: async (resource, params) => {
    const config = getCollectionResource(resource);
    const responses = await Promise.all(
      params.ids.map(id =>
        apiRequest<JsonObject>(`${config.path}/${encodeURIComponent(String(id))}`, {
          body: JSON.stringify(params.data, filterNullValues),
          headers: {
            "Content-Type": "application/json",
          },
          method: "PUT",
        })
      )
    );

    return { data: responses };
  },

  create: async (resource, params) => createResource(resource, params.data),

  createMany: async (resource: string, params: { data: RaRecord; ids: Identifier[] }) => {
    const config = getResourceConfig(resource);

    if (!supportsCreate(config)) {
      throw new Error(`Create ${resource} is not allowed`);
    }

    const responses = await Promise.all(
      params.ids.map(id => {
        const request = config.create({ ...params.data, id });
        return apiRequest<JsonObject>(request.endpoint, {
          body: request.body ? JSON.stringify(request.body, filterNullValues) : undefined,
          headers: request.body
            ? {
                "Content-Type": "application/json",
              }
            : undefined,
          method: request.method,
        });
      })
    );

    return { data: responses };
  },

  delete: async (resource, params) => deleteResource(resource, params),

  deleteMany: async (resource, params) => {
    const config = getResourceConfig(resource);

    if (supportsDelete(config)) {
      const responses = await Promise.all(
        params.ids.map(id => {
          const request = config.delete({ ...params, id });
          return apiRequest<JsonObject>(request.endpoint, {
            body: request.body ? JSON.stringify(request.body) : undefined,
            headers: request.body
              ? {
                  "Content-Type": "application/json",
                }
              : undefined,
            method: request.method ?? "DELETE",
          });
        })
      );

      return {
        data: responses,
      };
    }

    const collectionConfig = getCollectionResource(resource);
    const responses = await Promise.all(
      params.ids.map(id =>
        apiRequest<JsonObject>(`${collectionConfig.path}/${encodeURIComponent(String(id))}`, {
          method: "DELETE",
        })
      )
    );

    return { data: responses };
  },

  deleteMedia,
} as SynapseDataProvider;

export default dataProvider;

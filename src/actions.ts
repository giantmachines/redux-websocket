import {
  DEFAULT_PREFIX,
  WEBSOCKET_BROKEN,
  WEBSOCKET_BEGIN_RECONNECT,
  WEBSOCKET_RECONNECT_ATTEMPT,
  WEBSOCKET_RECONNECTED,
  WEBSOCKET_CLOSED,
  WEBSOCKET_CONNECT,
  WEBSOCKET_DISCONNECT,
  WEBSOCKET_ERROR,
  WEBSOCKET_MESSAGE,
  WEBSOCKET_OPEN,
  WEBSOCKET_SEND,
} from './actionTypes';
import { Action } from './types';

type BuiltAction<T> = {
  type: string,
  meta: {
    timestamp: Date,
  },
  payload?: T,
}
type ConnectPayload = {
  url: string;
  protocols: string | string[];
};

/**
 * Create an FSA compliant action.
 *
 * @param {string} actionType
 * @param {T} payload
 *
 * @returns {BuiltAction<T>}
 */
function buildAction<T>(actionType: string, payload?: T, meta?: any): BuiltAction<T> {
  const base = {
    type: actionType,
    meta: {
      timestamp: new Date(),
      ...meta,
    },
    // Mixin the `error` key if the payload is an Error.
    ...(payload instanceof Error ? { error: true } : null),
  };

  return payload ? { ...base, payload } : base;
}

// Action creators for user dispatched actions. These actions are all optionally
// prefixed.
export const connect = (config: string | ConnectPayload, prefix?: string) =>
  buildAction(
    `${prefix || DEFAULT_PREFIX}::${WEBSOCKET_CONNECT}`,
    typeof config === "string"
      ? { url: config }
      : { url: config.url, protocols: config.protocols }
  );
export const disconnect = (prefix?: string) => buildAction(`${prefix || DEFAULT_PREFIX}::${WEBSOCKET_DISCONNECT}`);
export const send = (msg: any, prefix?: string) => buildAction(`${prefix || DEFAULT_PREFIX}::${WEBSOCKET_SEND}`, msg);

// Action creators for actions dispatched by redux-websocket. All of these must
// take a prefix. The default prefix should be used unless a user has created
// this middleware with the prefix option set.
export const beginReconnect = (prefix: string) => buildAction(`${prefix}::${WEBSOCKET_BEGIN_RECONNECT}`);
export const reconnectAttempt = (count: number, prefix: string) => buildAction(`${prefix}::${WEBSOCKET_RECONNECT_ATTEMPT}`, { count });
export const reconnected = (prefix: string) => buildAction(`${prefix}::${WEBSOCKET_RECONNECTED}`);
export const open = (event: Event, prefix: string) => buildAction(`${prefix}::${WEBSOCKET_OPEN}`, event);
export const broken = (prefix: string) => buildAction(`${prefix}::${WEBSOCKET_BROKEN}`);
export const closed = (event: Event, prefix: string) => buildAction(`${prefix}::${WEBSOCKET_CLOSED}`, event);
export const message = (event: MessageEvent, prefix: string) => (
  buildAction(`${prefix}::${WEBSOCKET_MESSAGE}`, {
    event,
    message: event.data,
    origin: event.origin,
  })
);
export const error = (originalAction: Action | null, err: Error, prefix: string) => (
  buildAction(`${prefix}::${WEBSOCKET_ERROR}`, err, {
    message: err.message,
    name: err.name,
    originalAction,
  })
);

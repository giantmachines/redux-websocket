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

type WithProtocols = [string[]] | [string[], string];
type WithPrefix = [string];
type WithStringDateAndPrefix = [boolean, string?];
type ConnectRestArgs = [] | WithPrefix | WithProtocols;

type BuiltAction<T> = {
  type: string;
  meta: {
    timestamp: Date | string;
  };
  payload?: T;
};

/**
 * Determine if the rest args to `connect` contains protocols or not.
 * @private
 */
const isProtocols = (args: ConnectRestArgs): args is WithProtocols =>
  Array.isArray(args[0]);

/**
 * Create an FSA compliant action.
 *
 * @param {string} actionType
 * @param {T} payload
 *
 * @returns {BuiltAction<T>}
 */
function buildAction<T>(
  actionType: string,
  string_timestamp: boolean,
  payload?: T,
  meta?: any
): BuiltAction<T> {
  var timestamp: Date | string = new Date();
  if (string_timestamp) {
    timestamp = timestamp.toJSON();
  }
  const base = {
    type: actionType,
    meta: {
      timestamp: timestamp,
      ...meta,
    },
    // Mixin the `error` key if the payload is an Error.
    ...(payload instanceof Error ? { error: true } : null),
  };

  return payload ? { ...base, payload } : base;
}

// Action creators for user dispatched actions. These actions are all optionally
// prefixed.
export const connect = (
  url: string,
  string_timestamp: boolean,
  ...args: ConnectRestArgs
) => {
  let prefix: string | undefined;
  let protocols: string[] | undefined;

  // If there's only one argument, check if it's protocols or a prefix.
  if (args.length === 1) {
    [protocols, prefix] = isProtocols(args) ? args : [undefined, args[0]];
  }

  // If there are two arguments after `url`, assume it's protocols and prefix.
  if (args.length === 2) {
    [protocols, prefix] = args;
  }

  return buildAction(
    `${prefix || DEFAULT_PREFIX}::${WEBSOCKET_CONNECT}`,
    string_timestamp,
    {
      url,
      protocols,
    }
  );
};
export const disconnect = (...args: WithStringDateAndPrefix) => {
  const [string_timestamp, prefix] = args;
  return buildAction(
    `${prefix || DEFAULT_PREFIX}::${WEBSOCKET_DISCONNECT}`,
    string_timestamp
  );
};
export const send = (msg: any, ...args: WithStringDateAndPrefix) => {
  const [string_timestamp, prefix] = args;
  return buildAction(
    `${prefix || DEFAULT_PREFIX}::${WEBSOCKET_SEND}`,
    string_timestamp,
    msg
  );
};

// Action creators for actions dispatched by redux-websocket. All of these must
// take a prefix. The default prefix should be used unless a user has created
// this middleware with the prefix option set.
export const beginReconnect = (...args: WithStringDateAndPrefix) => {
  const [string_timestamp, prefix] = args;
  return buildAction(
    `${prefix}::${WEBSOCKET_BEGIN_RECONNECT}`,
    string_timestamp
  );
};
export const reconnectAttempt = (
  count: number,
  ...args: WithStringDateAndPrefix
) => {
  const [string_timestamp, prefix] = args;
  return buildAction(
    `${prefix}::${WEBSOCKET_RECONNECT_ATTEMPT}`,
    string_timestamp,
    { count }
  );
};
export const reconnected = (...args: WithStringDateAndPrefix) => {
  const [string_timestamp, prefix] = args;
  return buildAction(`${prefix}::${WEBSOCKET_RECONNECTED}`, string_timestamp);
};
export const open = (event: Event, ...args: WithStringDateAndPrefix) => {
  const [string_timestamp, prefix] = args;
  return buildAction(`${prefix}::${WEBSOCKET_OPEN}`, string_timestamp, event);
};
export const broken = (...args: WithStringDateAndPrefix) => {
  const [string_timestamp, prefix] = args;
  return buildAction(`${prefix}::${WEBSOCKET_BROKEN}`, string_timestamp);
};
export const closed = (event: Event, ...args: WithStringDateAndPrefix) => {
  const [string_timestamp, prefix] = args;
  return buildAction(`${prefix}::${WEBSOCKET_CLOSED}`, string_timestamp, event);
};
export const message = (
  event: MessageEvent,
  ...args: WithStringDateAndPrefix
) => {
  const [string_timestamp, prefix] = args;
  return buildAction(`${prefix}::${WEBSOCKET_MESSAGE}`, string_timestamp, {
    event,
    message: event.data,
    origin: event.origin,
  });
};
export const error = (
  originalAction: Action | null,
  err: Error,
  ...args: WithStringDateAndPrefix
) => {
  const [string_timestamp, prefix] = args;
  return buildAction(`${prefix}::${WEBSOCKET_ERROR}`, string_timestamp, err, {
    message: err.message,
    name: err.name,
    originalAction,
  });
};

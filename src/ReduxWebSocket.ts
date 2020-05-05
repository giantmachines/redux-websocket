import { Dispatch, MiddlewareAPI } from 'redux';

import * as retry from 'retry';

import {
  beginReconnect,
  broken,
  closed,
  error,
  message,
  open,
  reconnectAttempt,
  reconnected,
  reconnectAbandoned,
} from './actions';
import { Action, Serializer } from './types';

interface ReduxWebSocketOptions {
  prefix: string;
  reconnectInterval: number;
  reconnectOnClose: boolean;
  onOpen?: (s: WebSocket) => void;
  serializer?: Serializer;
}

/**
 * ReduxWebSocket
 * @class
 *
 * Manages a WebSocket connection.
 */
export default class ReduxWebSocket {
  // Class options.
  private options: ReduxWebSocketOptions;

  // WebSocket connection.
  private websocket: WebSocket | null = null;

  // Keep track of how many times we've attempted to reconnect.
  private reconnectCount: number = 0;

  // Keep track of the last URL we connected to, so that when we automatically
  // try to reconnect, we can connect to the correct URL.

  // Keep track of if the WebSocket connection has ever successfully opened.
  private hasOpened = false;

  // Retry manager
  private retrier: retry.RetryOperation;

  /**
   * Constructor
   * @constructor
   *
   * @param {ReduxWebSocketOptions} options
   */
  constructor(options: ReduxWebSocketOptions) {
    this.options = options;

    this.retrier = retry.operation({
      forever: true,
      maxTimeout: 1000,
      minTimeout: 1000,
    });
  }

  /**
   * WebSocket connect event handler.
   *
   * @param {MiddlewareAPI} store
   * @param {Action} action
   */
  connect = ({ dispatch }: MiddlewareAPI, { payload }: Action) => {
    console.log('Top of connect');
    this.close();
    this.retrier.reset();

    this.retrier.attempt(
      () =>
        this.reliablyConnect(
          { dispatch } as MiddlewareAPI,
          { payload } as Action
        ),
      {
        timeout: 3000,
        cb: this.onTimeout,
      } as retry.AttemptTimeoutOptions
    );
  };

  private onTimeout = () => {
    console.log('Websocket connection timed out');
    this.websocket && this.websocket.close(1000, 'client-side timeout');
  };

  private attemptReconnection = (
    { dispatch }: MiddlewareAPI,
    reason: string
  ) => {
    const { prefix } = this.options;
    if (this.retrier.retry(new Error('Websocket closed: ' + reason))) {
      dispatch(broken(prefix));
      return;
    } else {
      dispatch(reconnectAbandoned(prefix));
    }
  };

  private reliablyConnect = (
    { dispatch }: MiddlewareAPI,
    { payload }: Action
  ) => {
    const { prefix } = this.options;

    // Announce what we're about to do
    const retries = this.retrier.attempts() - 1;

    if (retries) {
      // the BEGIN_RECONNECT action only fires for the first retry attempt
      if (retries === 1) {
        dispatch(beginReconnect(prefix));
      }

      dispatch(reconnectAttempt(retries, prefix));
    }

    this.websocket = payload.protocols
      ? new WebSocket(payload.url, payload.protocols)
      : new WebSocket(payload.url);

    this.websocket.addEventListener('close', (event) => {
      this.handleClose(dispatch, prefix, event);
      this.attemptReconnection({ dispatch } as MiddlewareAPI, event.reason);
    });

    this.websocket.addEventListener('error', () =>
      this.handleError(dispatch, prefix)
    );

    this.websocket.addEventListener('open', (event) => {
      this.handleOpen(dispatch, prefix, this.options.onOpen, event);
    });

    this.websocket.addEventListener('message', (event) =>
      this.handleMessage(dispatch, prefix, event)
    );
  };

  /**
   * WebSocket disconnect event handler.
   *
   * @throws {Error} Socket connection must exist.
   */
  disconnect = () => {
    if (this.websocket) {
      this.close();
    } else {
      throw new Error(
        'Socket connection not initialized. Dispatch WEBSOCKET_CONNECT first'
      );
    }
  };

  /**
   * WebSocket send event handler.
   *
   * @param {MiddlewareAPI} _store
   * @param {Action} action
   *
   * @throws {Error} Socket connection must exist.
   */
  send = (_store: MiddlewareAPI, { payload }: Action) => {
    if (this.websocket) {
      if (this.options.serializer) {
        this.websocket.send(this.options.serializer(payload));
      } else {
        throw new Error('Serializer not provided');
      }
    } else {
      throw new Error(
        'Socket connection not initialized. Dispatch WEBSOCKET_CONNECT first'
      );
    }
  };

  /**
   * Handle a close event.
   *
   * @param {Dispatch} dispatch
   * @param {string} prefix
   * @param {Event} event
   */
  private handleClose = (dispatch: Dispatch, prefix: string, event: Event) => {
    dispatch(closed(event, prefix));
  };

  /**
   * Handle an error event.
   *
   * @param {Dispatch} dispatch
   * @param {string} prefix
   * @param {Event} event
   */
  private handleError = (dispatch: Dispatch, prefix: string) => {
    dispatch(error(null, new Error('`redux-websocket` error'), prefix));
  };

  /**
   * Handle an open event.
   *
   * @param {Dispatch} dispatch
   * @param {string} prefix
   * @param {(s: WebSocket) => void | undefined} onOpen
   * @param {Event} event
   */
  private handleOpen = (
    dispatch: Dispatch,
    prefix: string,
    onOpen: ((s: WebSocket) => void) | undefined,
    event: Event
  ) => {
    // We don't need to retry any more if it works -- clears any retry timeouts, etc
    this.retrier.stop();
    this.retrier.reset();

    if (this.hasOpened) {
      dispatch(reconnected(prefix));
    }

    // Hook to allow consumers to get access to the raw socket.
    if (onOpen && this.websocket != null) {
      onOpen(this.websocket);
    }

    // Now we're fully open and ready to send messages.
    dispatch(open(event, prefix));

    // Track that we've been able to open the connection. We can use this flag
    // for error handling later, ensuring we don't try to reconnect when a
    // connection was never able to open in the first place.
    this.hasOpened = true;
  };

  /**
   * Handle a message event.
   *
   * @param {Dispatch} dispatch
   * @param {string} prefix
   * @param {MessageEvent} event
   */
  private handleMessage = (
    dispatch: Dispatch,
    prefix: string,
    event: MessageEvent
  ) => {
    dispatch(message(event, prefix));
  };

  /**
   * Close the WebSocket connection.
   * @private
   *
   * @param {number} [code]
   * @param {string} [reason]
   */
  private close = (code?: number, reason?: string) => {
    if (this.websocket) {
      this.retrier.stop();
      this.websocket.close(
        code || 1000,
        reason || 'WebSocket connection closed by redux-websocket.'
      );

      this.websocket = null;
      this.hasOpened = false;
    }
  };
}

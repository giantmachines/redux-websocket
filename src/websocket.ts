import { Config, ReduxWebSocket } from "./types";

/**
 * Formats args for creating the WebSocket instance
 */
const extractArgs = (config: Config) => {
  if (config.args) {
    return config.args;
  }

  if (config.url) {
    return [config.url];
  }

  return [];
};

/**
 * Create a websocket object from the incoming config
 */
export const createWebsocket = (payload: Config): ReduxWebSocket => {
  const args = extractArgs(payload);
  const websocket: any = payload.websocket ? payload.websocket : WebSocket;

  return new websocket(...args);
};

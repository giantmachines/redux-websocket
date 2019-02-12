/**
 * Formats args for creating the WebSocket instance
 */
const extractArgs = config => {
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
export const createWebsocket = payload => {
  const args = extractArgs(payload);
  const websocket = payload.websocket ? payload.websocket : WebSocket;

  return new websocket(...args);
};

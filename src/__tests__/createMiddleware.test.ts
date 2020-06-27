import * as actions from '../actions';
import middleware from '../createMiddleware';
import ReduxWebSocket from '../ReduxWebSocket';

jest.mock('../ReduxWebSocket');

const ReduxWebSocketMock = ReduxWebSocket as jest.Mock<ReduxWebSocket>;
const connectMock = jest.fn();
const disconnectMock = jest.fn();
const sendMock = jest.fn();
const dispatchMock = jest.fn((i) => i);
const mockStore = () => {
  const store = { getState: () => {}, dispatch: dispatchMock };
  const wrapper = middleware()(store);
  const dispatch = wrapper((i) => i);

  return { store, wrapper, dispatch };
};

// @ts-ignore
ReduxWebSocketMock.mockImplementation((options) => {
  /* eslint-disable lines-between-class-members */
  class Fake {
    close = () => {};
    connect = connectMock;
    disconnect = disconnectMock;
    handleBrokenConnection = () => {};
    hasOpened = false;
    lastSocketUrl = '';
    private options = options;
    reconnectCount = 0;
    reconnectionInterval = null;
    reconnectOnClose = false;
    send = sendMock;
    websocket = null;
    handleClose = () => {};
    handleError = () => {};
    handleOpen = () => {};
    handleMessage = () => {};
  }
  /* eslint-enable lines-between-class-members */

  return new Fake();
});

describe('middleware', () => {
  beforeEach(() => {
    ReduxWebSocketMock.mockClear();
    connectMock.mockClear();
    disconnectMock.mockClear();
    sendMock.mockClear();
  });

  it('creates a new ReduxWebSocket instance', () => {
    middleware();

    expect(ReduxWebSocketMock).toHaveBeenCalled();
  });

  it('passes default options to the ReduxWebSocket constructor', () => {
    middleware();

    expect(ReduxWebSocketMock).toHaveBeenCalledWith({
      prefix: 'REDUX_WEBSOCKET',
      stringTimestamp: false,
      reconnectInterval: 2000,
      reconnectOnClose: false,
      serializer: JSON.stringify,
    });
  });

  it('passes custom options to the ReduxWebSocket constructor', () => {
    middleware({ prefix: 'CUSTOM', stringTimestamp: false });

    expect(ReduxWebSocketMock).toHaveBeenCalledWith({
      prefix: 'CUSTOM',
      stringTimestamp: false,
      reconnectInterval: 2000,
      reconnectOnClose: false,
      serializer: JSON.stringify,
    });
  });

  it('can create multiple instances of ReduxWebSocket', () => {
    middleware({ prefix: 'ONE', stringTimestamp: false });
    middleware({
      prefix: 'TWO',
      stringTimestamp: false,
      reconnectOnClose: true,
    });

    expect(ReduxWebSocketMock).toHaveBeenCalledTimes(2);
    expect(ReduxWebSocketMock).toHaveBeenCalledWith({
      prefix: 'ONE',
      stringTimestamp: false,
      reconnectInterval: 2000,
      reconnectOnClose: false,
      serializer: JSON.stringify,
    });
    expect(ReduxWebSocketMock).toHaveBeenCalledWith({
      prefix: 'TWO',
      stringTimestamp: false,
      reconnectInterval: 2000,
      reconnectOnClose: true,
      serializer: JSON.stringify,
    });
  });

  it('should handle a REDUX_WEBSOCKET::CONNECT action', () => {
    const { store, dispatch } = mockStore();
    const dispatchedAction = {
      type: 'REDUX_WEBSOCKET::CONNECT',
      meta: { timestamp: expect.any(Date) },
      payload: {
        url: 'ws://example.com',
      },
    };

    const val = dispatch(actions.connect('ws://example.com', false));

    expect(val).toEqual(dispatchedAction);
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(connectMock).toHaveBeenCalledWith(store, dispatchedAction);
  });

  it('should handle a REDUX_WEBSOCKET::DISCONNECT action', () => {
    const { store, dispatch } = mockStore();
    const dispatchedAction = {
      type: 'REDUX_WEBSOCKET::DISCONNECT',
      meta: { timestamp: expect.any(Date) },
    };

    const val = dispatch(actions.disconnect(false));

    expect(val).toEqual(dispatchedAction);
    expect(disconnectMock).toHaveBeenCalledTimes(1);
    expect(disconnectMock).toHaveBeenCalledWith(store, dispatchedAction);
  });

  it('should handle a REDUX_WEBSOCKET::SEND action', () => {
    const { store, dispatch } = mockStore();
    const dispatchedAction = {
      type: 'REDUX_WEBSOCKET::SEND',
      meta: { timestamp: expect.any(Date) },
      payload: {
        test: 'message',
      },
    };

    const val = dispatch(actions.send({ test: 'message' }, false));

    expect(val).toEqual(dispatchedAction);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(store, dispatchedAction);
  });

  it('should not break on random actions', () => {
    const { dispatch } = mockStore();

    dispatch({
      type: `REDUX_WEBSOCKET::${Math.random().toString(36).substring(2, 15)}`,
    });
    dispatch({ type: 'something-else-entirely' });

    expect(connectMock).not.toHaveBeenCalled();
    expect(disconnectMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('shoud dispatch an error action if a handler throws an error', () => {
    const err = new Error('whoops');

    sendMock.mockImplementation(() => {
      throw err;
    });

    const { dispatch } = mockStore();
    const result = dispatch(actions.send({ test: 'message' }, false));
    const expectedResult = {
      type: 'REDUX_WEBSOCKET::SEND',
      meta: {
        timestamp: expect.any(Date),
      },
      payload: {
        test: 'message',
      },
    };

    expect(result).toEqual(expectedResult);
    expect(dispatchMock).toHaveBeenCalledTimes(1);
    expect(dispatchMock).toHaveBeenCalledWith({
      error: true,
      type: 'REDUX_WEBSOCKET::ERROR',
      meta: {
        timestamp: expect.any(Date),
        originalAction: expectedResult,
        name: 'Error',
        message: 'whoops',
      },
      payload: err,
    });
  });
});

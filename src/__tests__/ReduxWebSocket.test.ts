import ReduxWebSocket from '../ReduxWebSocket';
import { Action } from '../types';

declare global {
  namespace NodeJS {
    interface Global {
      WebSocket: any;
    }
  }
}

const CONNECT = 'CONNECT' as 'CONNECT';
const SEND = 'SEND' as 'SEND';

describe('ReduxWebSocket', () => {
  const store = { dispatch: jest.fn((i: any) => i), getState: () => {} };
  const url = 'ws://fake.com';
  const options = {
    prefix: 'REDUX_WEBSOCKET',
    stringTimestamp: false,
    reconnectInterval: 2000,
    reconnectOnClose: false,
    serializer: JSON.stringify,
  };
  const closeMock = jest.fn();
  const sendMock = jest.fn();
  const addEventListenerMock = jest.fn();
  let reduxWebSocket: ReduxWebSocket;

  beforeEach(() => {
    reduxWebSocket = new ReduxWebSocket(options);

    store.dispatch.mockClear();

    addEventListenerMock.mockClear();
    closeMock.mockClear();
    sendMock.mockClear();

    global.WebSocket = jest.fn(() => ({
      addEventListener: addEventListenerMock,
      close: closeMock,
      send: sendMock,
    }));
  });

  describe('connect', () => {
    const action = { type: SEND, payload: { url } };

    beforeEach(() => {
      reduxWebSocket.connect(store, action);
    });

    it('creates a new WebSocket instance', () => {
      expect(global.WebSocket).toHaveBeenCalledTimes(1);
      expect(global.WebSocket).toHaveBeenCalledWith(url);
    });

    it('closes any existing connections', () => {
      reduxWebSocket.connect(store, action);

      expect(closeMock).toHaveBeenCalledTimes(1);
      expect(closeMock).toHaveBeenCalledWith(
        1000,
        'WebSocket connection closed by redux-websocket.'
      );
    });

    it('binds all event listeners', () => {
      expect(addEventListenerMock).toHaveBeenCalledTimes(4);
      expect(addEventListenerMock).toHaveBeenCalledWith(
        'close',
        expect.any(Function)
      );
      expect(addEventListenerMock).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      );
      expect(addEventListenerMock).toHaveBeenCalledWith(
        'open',
        expect.any(Function)
      );
      expect(addEventListenerMock).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );
    });

    it('handles a close event', () => {
      const event = addEventListenerMock.mock.calls.find(
        (call) => call[0] === 'close'
      );

      event[1]('test event');

      expect(store.dispatch).toHaveBeenCalledTimes(1);
      expect(store.dispatch).toHaveBeenCalledWith({
        type: 'REDUX_WEBSOCKET::CLOSED',
        meta: {
          timestamp: expect.any(Date),
        },
        payload: 'test event',
      });
    });

    it('handles closed as broken if flag "reconnectOnClose" set', () => {
      const dispatch = jest.fn();
      const rws = new ReduxWebSocket({
        ...options,
        reconnectOnClose: true,
      });
      const event = new Event('');

      /* eslint-disable dot-notation */
      rws['handleBrokenConnection'] = jest.fn();
      rws['handleClose'](dispatch, false, 'prefix', event);
      expect(rws['handleBrokenConnection']).not.toHaveBeenCalled();
      rws['hasOpened'] = true;
      rws['handleClose'](dispatch, false, 'prefix', event);
      expect(rws['handleBrokenConnection']).toHaveBeenCalledTimes(1);
      expect(rws['handleBrokenConnection']).toHaveBeenCalledWith(dispatch);
      /* eslint-enable dot-notation */
    });

    it('handles a message event', () => {
      const event = addEventListenerMock.mock.calls.find(
        (call) => call[0] === 'message'
      );
      const data = '{ "test": "message" }';
      const testEvent = { data, origin: 'test origin' };

      event[1](testEvent);

      expect(store.dispatch).toHaveBeenCalledTimes(1);
      expect(store.dispatch).toHaveBeenCalledWith({
        type: 'REDUX_WEBSOCKET::MESSAGE',
        meta: {
          timestamp: expect.any(Date),
        },
        payload: {
          event: testEvent,
          message: data,
          origin: 'test origin',
        },
      });
    });

    describe('error event', () => {
      it('handles an error event', () => {
        const event = addEventListenerMock.mock.calls.find(
          (call) => call[0] === 'error'
        );
        const testEvent = { currentTarget: { url: 'test url' } };

        event[1](testEvent);

        expect(store.dispatch).toHaveBeenCalledTimes(1);
        expect(store.dispatch).toHaveBeenCalledWith({
          type: 'REDUX_WEBSOCKET::ERROR',
          meta: {
            timestamp: expect.any(Date),
            message: '`redux-websocket` error',
            name: 'Error',
            originalAction: null,
          },
          payload: expect.any(Error),
          error: true,
        });
      });

      it('calls handleBrokenConnection', () => {
        const dispatch = jest.fn();

        /* eslint-disable dot-notation */
        reduxWebSocket['handleBrokenConnection'] = jest.fn();
        reduxWebSocket['handleError'](dispatch, false, 'prefix');
        expect(reduxWebSocket['handleBrokenConnection']).not.toHaveBeenCalled();

        reduxWebSocket['hasOpened'] = true;
        reduxWebSocket['handleError'](dispatch, false, 'prefix');
        expect(reduxWebSocket['handleBrokenConnection']).toHaveBeenCalledTimes(
          1
        );
        expect(reduxWebSocket['handleBrokenConnection']).toHaveBeenCalledWith(
          dispatch
        );
        /* eslint-enable dot-notation */
      });
    });

    describe('open event', () => {
      it('dispatches an open action and sets the hasOpened flag', () => {
        const event = addEventListenerMock.mock.calls.find(
          (call) => call[0] === 'open'
        );

        event[1]();

        /* eslint-disable dot-notation */
        expect(store.dispatch).toHaveBeenCalledTimes(1);
        expect(store.dispatch).toHaveBeenCalledWith({
          type: 'REDUX_WEBSOCKET::OPEN',
          meta: {
            timestamp: expect.any(Date),
          },
        });
        expect(reduxWebSocket['hasOpened']).toEqual(true);
        /* eslint-enable dot-notation */
      });

      it('calls an onOpen function with a reference to the opened socket', () => {
        const onOpen = jest.fn();

        /* eslint-disable dot-notation */
        reduxWebSocket['options'].onOpen = onOpen;
        reduxWebSocket.connect(store, action);

        const event = addEventListenerMock.mock.calls.find(
          (call) => call[0] === 'open'
        );

        event[1]('test event');

        expect(onOpen).toHaveBeenCalledTimes(1);
        expect(onOpen).toHaveBeenCalledWith(reduxWebSocket['websocket']);
        /* eslint-enable dot-notation */
      });

      it('handles successful reconnection', () => {
        const event = addEventListenerMock.mock.calls.find(
          (call) => call[0] === 'open'
        );

        /* eslint-disable dot-notation */
        reduxWebSocket['reconnectionInterval'] = 1000 as any;
        reduxWebSocket['reconnectCount'] = 9999;

        global.clearInterval = jest.fn();

        event[1]('test event');

        expect(reduxWebSocket['reconnectionInterval']).toBeNull();
        expect(reduxWebSocket['reconnectCount']).toEqual(0);

        // Once for the reconnected action, once for the open action.
        expect(store.dispatch).toHaveBeenCalledTimes(2);
        expect(store.dispatch).toHaveBeenCalledWith({
          type: 'REDUX_WEBSOCKET::RECONNECTED',
          meta: {
            timestamp: expect.any(Date),
          },
        });
        expect(store.dispatch).toHaveBeenCalledWith({
          type: 'REDUX_WEBSOCKET::OPEN',
          meta: {
            timestamp: expect.any(Date),
          },
          payload: 'test event',
        });
        /* eslint-enable dot-notation */
      });
    });
  });

  describe('disconnect', () => {
    it('should close any open connection', () => {
      const action = { type: SEND, payload: { url } };

      reduxWebSocket.connect(store, action);
      reduxWebSocket.disconnect();

      expect(closeMock).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if no connection exists', () => {
      expect(() => reduxWebSocket.disconnect()).toThrow(
        'Socket connection not initialized. Dispatch WEBSOCKET_CONNECT first'
      );
    });
  });

  describe('send', () => {
    const sendAction = { type: SEND, payload: { test: 'value' } };
    const middlewareApi = {
      dispatch: jest.fn(),
      getState: jest.fn(),
    };

    it('should send a JSON message', () => {
      const connectAction = { type: CONNECT, payload: { url } };

      reduxWebSocket.connect(store, connectAction);
      reduxWebSocket.send(middlewareApi, sendAction);

      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock).toHaveBeenCalledWith('{"test":"value"}');
    });

    it('should use a JSON serialized Date if stringTimestamp is true', () => {
      reduxWebSocket = new ReduxWebSocket({
        ...options,
        stringTimestamp: true,
      });

      const connectAction = { type: CONNECT, payload: { url } };
      reduxWebSocket.connect(store, connectAction);

      const event = addEventListenerMock.mock.calls.find(
        (call) => call[0] === 'message'
      );
      const data = '{ "test": "message" }';
      const testEvent = { data, origin: 'test origin' };

      event[1](testEvent);

      expect(store.dispatch).toHaveBeenCalledTimes(1);
      expect(store.dispatch).toHaveBeenCalledWith({
        type: 'REDUX_WEBSOCKET::MESSAGE',
        meta: {
          timestamp: expect.anything(),
        },
        payload: {
          event: testEvent,
          message: data,
          origin: 'test origin',
        },
      });

      const call = store.dispatch.mock.calls[0][0];
      const { meta } = call;
      const { timestamp } = meta;
      const match = expect.stringMatching(/[0-9]{4}-[0-9]{2}-[0-9]{2}.*/);
      expect(timestamp).toEqual(match);
    });

    it('should send a custom message', () => {
      const action = { type: 'SEND', payload: { url } };
      const pld = { test: 'value', another: 'prop' };
      // Very basic test custom serializer; only works with objects.
      // Converts object to string: "key1.value1|key2.value2|...|keyN.valueN"
      const customSerializer = (payload: any) =>
        Object.entries(payload).reduce(
          (acc: string, cv: any) =>
            `${acc}${acc.length ? '|' : ''}${cv[0]}.${cv[1]}`,
          ''
        );

      // Pass in a custom serializer
      reduxWebSocket = new ReduxWebSocket({
        ...options,
        serializer: customSerializer,
      });
      reduxWebSocket.connect(store, action as Action);
      reduxWebSocket.send(
        null as any,
        { type: 'SEND', payload: pld } as Action
      );

      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock).toHaveBeenCalledWith(customSerializer(pld));
    });

    it('should throw an error if no connection exists', () => {
      expect(() => reduxWebSocket.send(middlewareApi, sendAction)).toThrow(
        'Socket connection not initialized. Dispatch WEBSOCKET_CONNECT first'
      );
    });

    it('should throw an error if no serializer exists', () => {
      const optionsClone = { ...options };
      const action = { type: 'SEND', payload: { url } };

      delete optionsClone.serializer;
      reduxWebSocket = new ReduxWebSocket(optionsClone);
      reduxWebSocket.connect(store, action as Action);

      expect(() =>
        reduxWebSocket.send(null as any, { payload: null } as any)
      ).toThrow('Serializer not provided');
    });
  });

  describe('handleBrokenConnection', () => {
    jest.useFakeTimers();

    it('should reconnect on an interval', () => {
      const dispatch = jest.fn();

      /* eslint-disable dot-notation */
      reduxWebSocket['handleBrokenConnection'](dispatch);

      jest.advanceTimersByTime(5000);

      // Make sure we actually check all of the calls to `dispatch`.
      expect.assertions(7);

      expect(dispatch).toHaveBeenCalledTimes(5);
      expect(reduxWebSocket['reconnectCount']).toEqual(3);
      expect(dispatch).toHaveBeenNthCalledWith(1, {
        type: 'REDUX_WEBSOCKET::BROKEN',
        meta: {
          timestamp: expect.any(Date),
        },
      });
      expect(dispatch).toHaveBeenNthCalledWith(2, {
        type: 'REDUX_WEBSOCKET::BEGIN_RECONNECT',
        meta: {
          timestamp: expect.any(Date),
        },
      });
      expect(dispatch).toHaveBeenNthCalledWith(3, {
        type: 'REDUX_WEBSOCKET::RECONNECT_ATTEMPT',
        meta: {
          timestamp: expect.any(Date),
        },
        payload: {
          count: 1,
        },
      });
      expect(dispatch).toHaveBeenNthCalledWith(4, {
        type: 'REDUX_WEBSOCKET::RECONNECT_ATTEMPT',
        meta: {
          timestamp: expect.any(Date),
        },
        payload: {
          count: 2,
        },
      });
      expect(dispatch).toHaveBeenNthCalledWith(5, {
        type: 'REDUX_WEBSOCKET::RECONNECT_ATTEMPT',
        meta: {
          timestamp: expect.any(Date),
        },
        payload: {
          count: 3,
        },
      });
      /* eslint-enable dot-notation */
    });
  });
});

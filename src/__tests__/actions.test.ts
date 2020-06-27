import { isFSA, isError } from 'flux-standard-action';

import * as actions from '../actions';
import * as actionTypes from '../actionTypes';

const STRING_TIMESTAMP = false;
const PREFIX = 'ACTION_PREFIX';

describe('actions', () => {
  describe('user dispatched', () => {
    describe('connect', () => {
      it('should return the correct action with a default prefix', () => {
        const act = actions.connect('fake url', STRING_TIMESTAMP);

        expect(isFSA(act)).toBe(true);
        expect(act).toEqual({
          type: `${actionTypes.DEFAULT_PREFIX}::${actionTypes.WEBSOCKET_CONNECT}`,
          meta: { timestamp: expect.any(Date) },
          payload: {
            url: 'fake url',
          },
        });
      });

      it('should return the correct action with user prefix', () => {
        const act = actions.connect('fake url', STRING_TIMESTAMP, PREFIX);

        expect(isFSA(act)).toBe(true);
        expect(act).toEqual({
          type: `${PREFIX}::${actionTypes.WEBSOCKET_CONNECT}`,
          meta: { timestamp: expect.any(Date) },
          payload: {
            url: 'fake url',
          },
        });
      });

      it('should return the correct action with protocols', () => {
        const act = actions.connect('fake url', STRING_TIMESTAMP, ['protocol']);

        expect(isFSA(act)).toBe(true);
        expect(act).toEqual({
          type: `${actionTypes.DEFAULT_PREFIX}::${actionTypes.WEBSOCKET_CONNECT}`,
          meta: { timestamp: expect.any(Date) },
          payload: {
            url: 'fake url',
            protocols: ['protocol'],
          },
        });
      });

      it('should return the correct action with protocols and a user prefix', () => {
        const act = actions.connect(
          'fake url',
          STRING_TIMESTAMP,
          ['protocol'],
          PREFIX
        );

        expect(isFSA(act)).toBe(true);
        expect(act).toEqual({
          type: `${PREFIX}::${actionTypes.WEBSOCKET_CONNECT}`,
          meta: { timestamp: expect.any(Date) },
          payload: {
            url: 'fake url',
            protocols: ['protocol'],
          },
        });
      });
    });

    describe('disconnect', () => {
      it('should return the correct action with a default prefix', () => {
        const act = actions.disconnect(STRING_TIMESTAMP);

        expect(isFSA(act)).toBe(true);
        expect(act).toEqual({
          type: `${actionTypes.DEFAULT_PREFIX}::${actionTypes.WEBSOCKET_DISCONNECT}`,
          meta: { timestamp: expect.any(Date) },
        });
      });

      it('should return the correct action with user prefix', () => {
        const act = actions.disconnect(STRING_TIMESTAMP, PREFIX);

        expect(isFSA(act)).toBe(true);
        expect(act).toEqual({
          type: `${PREFIX}::${actionTypes.WEBSOCKET_DISCONNECT}`,
          meta: { timestamp: expect.any(Date) },
        });
      });
    });

    describe('send', () => {
      it('should return the correct action with a default prefix', () => {
        const act = actions.send({ test: 'value' }, STRING_TIMESTAMP);

        expect(isFSA(act)).toBe(true);
        expect(act).toEqual({
          type: `${actionTypes.DEFAULT_PREFIX}::${actionTypes.WEBSOCKET_SEND}`,
          meta: { timestamp: expect.any(Date) },
          payload: {
            test: 'value',
          },
        });
      });

      it('should return the correct action with user prefix', () => {
        const act = actions.send({ test: 'value' }, STRING_TIMESTAMP, PREFIX);

        expect(isFSA(act)).toBe(true);
        expect(act).toEqual({
          type: `${PREFIX}::${actionTypes.WEBSOCKET_SEND}`,
          meta: { timestamp: expect.any(Date) },
          payload: {
            test: 'value',
          },
        });
      });
    });
  });

  describe('library dispatched', () => {
    describe('beginReconnect', () => {
      it('should return the correct action', () => {
        const act = actions.beginReconnect(STRING_TIMESTAMP, PREFIX);

        expect(isFSA(act)).toBe(true);
        expect(act).toEqual({
          type: `${PREFIX}::${actionTypes.WEBSOCKET_BEGIN_RECONNECT}`,
          meta: { timestamp: expect.any(Date) },
        });
      });
    });

    describe('reconnectAttempt', () => {
      it('should return the correct action', () => {
        const act = actions.reconnectAttempt(1, STRING_TIMESTAMP, PREFIX);

        expect(isFSA(act)).toBe(true);
        expect(act).toEqual({
          type: `${PREFIX}::${actionTypes.WEBSOCKET_RECONNECT_ATTEMPT}`,
          meta: { timestamp: expect.any(Date) },
          payload: {
            count: 1,
          },
        });
      });
    });

    describe('reconnected', () => {
      it('should return the correct action', () => {
        const act = actions.reconnected(STRING_TIMESTAMP, PREFIX);

        expect(isFSA(act)).toBe(true);
        expect(act).toEqual({
          type: `${PREFIX}::${actionTypes.WEBSOCKET_RECONNECTED}`,
          meta: { timestamp: expect.any(Date) },
        });
      });
    });

    describe('closed', () => {
      it('should return the correct action', () => {
        const event = new Event('');
        const act = actions.closed(event, STRING_TIMESTAMP, PREFIX);

        expect(isFSA(act)).toBe(true);
        expect(act).toEqual({
          type: `${PREFIX}::${actionTypes.WEBSOCKET_CLOSED}`,
          meta: { timestamp: expect.any(Date) },
          payload: event,
        });
      });
    });

    describe('message', () => {
      it('should return the correct action', () => {
        const event = new MessageEvent('');
        const act = actions.message(event, STRING_TIMESTAMP, PREFIX);

        expect(isFSA(act)).toBe(true);
        expect(act).toEqual({
          type: `${PREFIX}::${actionTypes.WEBSOCKET_MESSAGE}`,
          meta: { timestamp: expect.any(Date) },
          payload: {
            event,
            message: null,
            origin: event.origin,
          },
        });
      });
    });

    describe('open', () => {
      it('should return the correct action', () => {
        const event = new Event('');
        const act = actions.open(event, STRING_TIMESTAMP, PREFIX);

        expect(isFSA(act)).toBe(true);
        expect(act).toEqual({
          type: `${PREFIX}::${actionTypes.WEBSOCKET_OPEN}`,
          meta: { timestamp: expect.any(Date) },
          payload: event,
        });
      });
    });

    describe('broken', () => {
      it('should return the correct action', () => {
        const act = actions.broken(STRING_TIMESTAMP, PREFIX);

        expect(isFSA(act)).toBe(true);
        expect(act).toEqual({
          type: `${PREFIX}::${actionTypes.WEBSOCKET_BROKEN}`,
          meta: { timestamp: expect.any(Date) },
        });
      });
    });

    describe('error', () => {
      it('should return the correct action with a test action', () => {
        const err = new Error('test');
        const originalAction = { type: 'SEND' as 'SEND', payload: null };
        const act = actions.error(
          originalAction,
          err,
          STRING_TIMESTAMP,
          PREFIX
        );

        expect(isFSA(act)).toBe(true);
        expect(isError(act)).toBe(true);
        expect(act).toEqual({
          type: `${PREFIX}::${actionTypes.WEBSOCKET_ERROR}`,
          error: true,
          meta: {
            timestamp: expect.any(Date),
            message: 'test',
            name: 'Error',
            originalAction,
          },
          payload: err,
        });
      });

      it('should return the correct action with a null action', () => {
        const err = new Error('test');
        const act = actions.error(null, err, STRING_TIMESTAMP, PREFIX);

        expect(isFSA(act)).toBe(true);
        expect(isError(act)).toBe(true);
        expect(act).toEqual({
          type: `${PREFIX}::${actionTypes.WEBSOCKET_ERROR}`,
          error: true,
          meta: {
            timestamp: expect.any(Date),
            message: 'test',
            name: 'Error',
            originalAction: null,
          },
          payload: err,
        });
      });
    });
  });
});

# redux-websocket [![codecov](https://codecov.io/gh/giantmachines/redux-websocket/branch/master/graph/badge.svg)](https://codecov.io/gh/giantmachines/redux-websocket) [![npm version](https://badge.fury.io/js/%40giantmachines%2Fredux-websocket.svg)](https://badge.fury.io/js/%40giantmachines%2Fredux-websocket) ![npm](https://img.shields.io/npm/dm/@giantmachines/redux-websocket)

`redux-websocket` is a Redux middleware for managing data over a WebSocket connection.

This middleware uses actions to interact with a WebSocket connection including connecting, disconnecting, sending messages, and receiving messages. All actions follow the [Flux Standard Action](https://github.com/acdlite/flux-standard-action) model.

### Features

- Written in TypeScript.
- Interact with a WebSocket connection by dispatching actions.
- Connect to multiple WebSocket streams by creating multiple middleware instances.
- Handle WebSocket events with Redux middleware, integrate with Saga, and use reducers to persist state.
- Automatically handle reconnection.

## Installation

```sh
$ npm i @giantmachines/redux-websocket
```

## Configuration

Configure your Redux store to use the middleware with `applyMiddleware`. This package exports a function to create an instance of a middleware, which allows for configuration options, detailed below. Furthermore, you can create multiple instances of this middleware in order to connect to multiple WebSocket streams.

```js
import { applyMiddleware, compose, createStore } from 'redux';
import reduxWebsocket from '@giantmachines/redux-websocket';

import reducer from './store/reducer';

// Create the middleware instance.
const reduxWebsocketMiddleware = reduxWebsocket();

// Create the Redux store.
const store = createStore(
  reducer,
  applyMiddleware(reduxWebsocketMiddleware)
);
```

You may also pass options to the `reduxWebsocket` function.

#### Available options

```js
interface Options {
  // Defaults to false. If false, meta.timestamp will be a Date. If true, the timestamp won't be a
  // Date but instead a JSON serialized date represented as a string.
  stringTimestamp?: boolean,
  // Defaults to 'REDUX_WEBSOCKET'. Use this option to set a custom action type
  // prefix. This is useful when you're creating multiple instances of the
  // middleware, and need to handle actions dispatched by each middleware instance separately.
  prefix?: string,
  // Defaults to 2000. Amount of time to wait between reconnection attempts.
  reconnectInterval?: number,
  // Defaults to false. If set to true, will attempt to reconnect when conn is closed without error event
  // e.g. when server closes connection
  reconnectOnClose?: boolean,
  // Callback when the WebSocket connection is open. Useful for when you
  // need a reference to the WebSocket instance.
  onOpen?: (socket: WebSocket) => void,
  // Custom function to serialize your payload before sending. Defaults to JSON.stringify
  // but you could use this function to send any format you like, including binary
  serializer?: (payload: any) => string | ArrayBuffer | ArrayBufferView | Blob
}
```

## Usage

`redux-websocket` will dispatch some actions automatically, based on what the internal WebSocket connection. Some actions will need to be dispatched by you.

### User dispatched actions

These actions must be dispatched by you, however we do export action creator functions that can be used.

> ⚠️ If you have created your middleware with a `prefix` option, make sure you pass that prefix as the second argument to all of these action creators.

---

##### ➡️ `REDUX_WEBSOCKET::WEBSOCKET_CONNECT`

###### Example:

```js
import { connect } from '@giantmachines/redux-websocket';

store.dispatch(connect('wss://my-server.com'));

// You can also provide protocols if needed.
// See: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket
//
// Note that this function only allows passing an array of protocols, even though
// the spec allows passing a string or an array of strings. This is to support
// the prefix argument, in the case that you've prefixed your action names.
store.dispatch(connect('wss://my-server.com', ['v1.stream.example.com']));

// ...other ways to call this function:
store.dispatch(connect('wss://my-server.com', ['v1.stream.example.com'], 'MY_PREFIX'));
store.dispatch(connect('wss://my-server.com', 'MY_PREFIX'));
```

###### Arguments:

1. `url` *(`string`)*: WebSocket URL to connect to.
2. \[`protocols`\] *(`string[]`)*: Optional sub-protocols.
2. \[`prefix`\] *(`string`)*: Optional action type prefix.

---

##### ➡️ `REDUX_WEBSOCKET::WEBSOCKET_DISCONNECT`

###### Example:

```js
import { disconnect } from '@giantmachines/redux-websocket';

store.dispatch(disconnect());
```

###### Arguments:

1. \[`prefix`\] *(`string`)*: Optional action type prefix.

---

##### ➡️ `REDUX_WEBSOCKET::WEBSOCKET_SEND`

###### Example:

```js
import { send } from '@giantmachines/redux-websocket';

store.dispatch(send({ my: 'message' }));
```

###### Arguments:

1. `message` *(`any`)*: Any JSON serializable value. This will be stringified and sent over the connection. If the value passed is not serializable, `JSON.stringify` will throw an error.
2. \[`prefix`\] *(`string`)*: Optional action type prefix.

---

### Library dispatched actions

These actions are dispatched automatically by the middlware.

##### ⬅️ `REDUX_WEBSOCKET::OPEN`

Dispatched when the WebSocket connection successfully opens, including after automatic reconnect.

###### Structure

```js
{
    type: 'REDUX_WEBSOCKET::OPEN',
    meta: {
        timestamp: Date,
    },
}
```

---

##### ⬅️ `REDUX_WEBSOCKET::CLOSED`

Dispatched when the WebSocket connection successfully closes, both when you ask the middleware to close the connection, and when the connection drops.

###### Structure

```js
{
    type: 'REDUX_WEBSOCKET::CLOSED',
    meta: {
        timestamp: Date,
    },
}
```

---

##### ⬅️ `REDUX_WEBSOCKET::MESSAGE`

Dispatched when the WebSocket connection receives a message. The payload includes a `message` key, which is JSON, and an `origin` key, which is the address of the connection from which the message was recieved.

###### Structure

```js
{
    type: 'REDUX_WEBSOCKET::MESSAGE',
    meta: {
        timestamp: Date,
    },
    payload: {
        message: string,
        origin: string,
    },
}
```

---

##### ⬅️ `REDUX_WEBSOCKET::BROKEN`

Dispatched when the WebSocket connection is dropped. This action will always be dispatched _after_ the `CLOSED` action.

###### Structure

```js
{
    type: 'REDUX_WEBSOCKET::BROKEN',
    meta: {
        timestamp: Date,
    },
}
```

---

##### ⬅️ `REDUX_WEBSOCKET::BEGIN_RECONNECT`

Dispatched when the middleware is starting the reconnection process.

###### Structure

```js
{
    type: 'REDUX_WEBSOCKET::BEGIN_RECONNECT',
    meta: {
        timestamp: Date,
    },
}
```

---

##### ⬅️ `REDUX_WEBSOCKET::RECONNECT_ATTEMPT`

Dispatched every time the middleware attempts a reconnection. Includes a `count` as part of the payload.

###### Structure

```js
{
    type: 'REDUX_WEBSOCKET::RECONNECT_ATTEMPT',
    meta: {
        timestamp: Date,
    },
    payload: {
        count: number,
    },
}
```

---

##### ⬅️ `REDUX_WEBSOCKET::RECONNECTED`

Dispatched when the middleware reconnects. This action is dispached right before an `OPEN` action.

###### Structure

```js
{
    type: 'REDUX_WEBSOCKET::RECONNECTED',
    meta: {
        timestamp: Date,
    },
}
```

---

##### ⬅️ `REDUX_WEBSOCKET::ERROR`

General purpose error action.

###### Structure

```js
{
    type: 'REDUX_WEBSOCKET::ERROR',
    error: true,
    meta: {
        timestamp: Date,
        message: string,
        name: string,
        originalAction: Action | null,
    },
    payload: Error,
}
```

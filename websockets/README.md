# README

This directory contains a minimal example [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) client and server.

When the page is loaded, it creates a WebSocket connection to the server, then sends a ping every second. The server listens for the ping and sends a response. The client listens for the responses and logs them.

The client starts the connection on the [`pageshow`](https://developer.mozilla.org/en-US/docs/Web/API/Window/pageshow_event) event and closes it on [`pagehide`](https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event): this allows browser to keep the page in the [bfcache](https://developer.mozilla.org/en-US/docs/Glossary/bfcache), which improves page load if the user navigates back to it.

## Running the example

The server-side is written in [Deno](https://deno.com/) so Deno needs to be installed first. Then, with Deno in your path, you can start the server with a command like:

```bash
deno run --allow-net=0.0.0.0:8080 --allow-read=./index.html,./client.js,./client.css main.js
```

You can then navigate to http://localhost:8080/ and you should see the application running.

## Executable walkthrough regression check

The page entry point is `websockets/index.html`. With the documented Deno
server running, load `http://localhost:8080/`, wait for `CONNECTED`, and expect
the log to show a `SENT: ping: 0` line followed by `RECEIVED: pong: 0`.

From the repository root, run the Playwright check with Chromium available:

```bash
node tests/course/r55-t037.mjs
```

The check uses the same page entry point and a deterministic local WebSocket
fixture so the walkthrough remains executable when Deno is not installed in the
test environment. It asserts the selectors, messages, and layout described
above.

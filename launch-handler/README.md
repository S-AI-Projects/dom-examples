# Launch Handler API example

This example demonstrates how the Launch Handler API can open the Musicr 2.0 app with a link to an audio track.

The audio player displays an accessible error message if the requested audio file cannot be loaded. Loading a valid audio file clears the message.

## Running the example

Serve the repository using a local HTTP server and open the `launch-handler/` directory in a browser. The Launch Handler API requires browser support and an installed web app to demonstrate its full launch behavior.

## Running the regression check

From the repository root, run:

```bash
npm run test:r55-t013
```

The Playwright check verifies that the bundled audio loads, a missing audio file displays the fallback message, restoring valid audio clears the message, and no uncaught page errors occur.

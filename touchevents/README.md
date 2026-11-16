Examples:
* [Multi-touch interaction](http://mdn.github.io/dom-examples/touchevents/Multi-touch_interaction.html). This example demonstrates basic multi-touch using touch events, thus it requires the browser to  support the [Touch Events standard](https://w3c.github.io/touch-events/). This example is used in [MDN's Multi-touch interaction Guide](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events/Multi-touch_interaction).


## Running Locally

To run the Touch Events examples locally:

```bash
# Using Python
python3 -m http.server 8000

# Using Node / npx
npx serve .
```

Open `http://localhost:8000/touchevents/Multi-touch_interaction.html`.

## Running Regression Tests

Automated regression tests verify UI state transitions under touch gestures and confirm that deliberate fixture mutations (broken event bindings or style updates) are reliably detected:

```bash
node tests/course/r55-t010.mjs
```

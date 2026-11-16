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

Open `http://localhost:8000/touchevents/Multi-touch_interaction.html` in a touch-enabled browser or mobile device emulation.

## Running Tests

Automated deterministic regression tests verify that multiple independent browser contexts produce identical DOM state across touch interactions:

```bash
node tests/course/r55-t005.mjs
```

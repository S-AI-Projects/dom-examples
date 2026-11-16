# WebGPU Compute Demo

This example demonstrates how to use the WebGPU API to execute a compute shader that processes a buffer of 1000 float values and reads the calculations back into JavaScript.

## Features
- WebGPU compute pipeline initialization (`GPUDevice`, `GPUComputePipeline`, `GPUBuffer`).
- Storage buffer dispatch with 64 workgroup size.
- Staging buffer asynchronous mapping (`mapAsync`) to read back data.
- Responsive, accessible output presentation at both mobile (360×800) and desktop (1280×800) viewports without unwanted horizontal viewport overflow.
- Accessible, intentionally scrollable and labelled preformatted container (`aria-label="WebGPU computed buffer data"`).

## Running Locally

To run this demo locally, serve this directory using any static web server:

```bash
# Using Python
python3 -m http.server 8000

# Using Node / npx
npx serve .
```

Open `http://localhost:8000/webgpu-compute-demo/index.html` in a WebGPU-compatible browser.

## Running Tests

Automated regression tests verify layout preservation, absence of horizontal viewport overflow at 360×800 and 1280×800, and proper fallback behavior:

```bash
node tests/course/r55-t002.mjs
```

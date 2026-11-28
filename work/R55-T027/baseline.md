# R55-T027 Baseline

Target: web-workers/fibonacci-worker/index.html

## Existing behavior
- The page accepts a zero-based Fibonacci index in input #number.
- On form submission, the page sends the input value to fibonacci.js using a Web Worker.
- The worker returns the calculated value.
- The result is displayed in #result.
- The input is cleared after submission.

## Baseline browser checks

| Input | Expected | Actual | Status |
|---|---:|---:|---|
| 0 | 0 | 0 | PASS |
| 1 | 1 | 1 | PASS |
| 6 | 8 | 8 | PASS |

## Observation
The existing demo works for the tested inputs. No existing defect was assumed or manufactured.

# Langfuse Activity Breakdown — last 24.0h

- Generated: 2026-06-01 06:09:52Z
- Window start: 2026-05-31 06:09:15Z
- Total traces in window: **140**
- Traces with totalCost > 0: **0** (0%)
- Traces with any usage tokens populated: **0** (0%)
- Sum totalCost across all traces: **$0.0000**
- Sum input/output/total tokens: **0 / 0 / 0**
- Latency p50 / p95: 75.80s / 372.78s

## ⚠ Token instrumentation gap

Every trace in this window has `totalCost=0` and empty `usage` fields. The OTel attributes
your traces carry (`llm.request.model`, `http.duration_ms`, `http.status_code`) describe the
model and HTTP timing but NOT input/output token counts, so a token-attribution report cannot
be built from current data. Fix this at the producer side:

- **claude-code traces**: emit `gen_ai.usage.input_tokens` / `gen_ai.usage.output_tokens`
  attributes per OpenInference / OTel GenAI semantic conventions on each GENERATION span,
  or call Langfuse's `update_current_generation(usage_details={...})` from a wrapper around
  the Anthropic SDK call.
- **Hermes / OpenClaw traces**: ensure the Anthropic SDK response `usage` block is captured
  on the SPAN/GENERATION observation before the trace closes. The `hermes_conversation:main`
  span currently has zero GENERATION children with usage.
- **Cost auto-derivation**: once usageDetails carry token counts, set the model name on the
  GENERATION observation; Langfuse Cloud derives cost from the catalog pricing for known
  models (claude-opus-4-7, claude-haiku-4-5, gpt-5.5).

Everything below is still useful — it shows where your *trace volume* and *latency* are
going, just not where the *tokens* are.

## By agent

| Value | Traces | Cost ($) | Lat p50 (s) | Lat p95 (s) | In tok | Out tok |
|---|--:|--:|--:|--:|--:|--:|
| `hermes` | 119 | 0.0000 | 81.22 | 372.78 | 0 | 0 |
| `linear-cron` | 14 | 0.0000 | 1.57 | 3.48 | 0 | 0 |
| `<none>` | 7 | 0.0000 | 52.43 | 58.77 | 0 | 0 |

## By model

| Value | Traces | Cost ($) | Lat p50 (s) | Lat p95 (s) | In tok | Out tok |
|---|--:|--:|--:|--:|--:|--:|
| `<none>` | 140 | 0.0000 | 75.80 | 372.78 | 0 | 0 |

## By runtime / hostname

| Value | Traces | Cost ($) | Lat p50 (s) | Lat p95 (s) | In tok | Out tok |
|---|--:|--:|--:|--:|--:|--:|
| `mac-mini` | 119 | 0.0000 | 81.22 | 372.78 | 0 | 0 |
| `github-actions` | 14 | 0.0000 | 1.57 | 3.48 | 0 | 0 |
| `<none>` | 7 | 0.0000 | 52.43 | 58.77 | 0 | 0 |

## By platform

| Value | Traces | Cost ($) | Lat p50 (s) | Lat p95 (s) | In tok | Out tok |
|---|--:|--:|--:|--:|--:|--:|
| `<none>` | 140 | 0.0000 | 75.80 | 372.78 | 0 | 0 |

## By repo

| Value | Traces | Cost ($) | Lat p50 (s) | Lat p95 (s) | In tok | Out tok |
|---|--:|--:|--:|--:|--:|--:|
| `<none>` | 140 | 0.0000 | 75.80 | 372.78 | 0 | 0 |

## By branch

| Value | Traces | Cost ($) | Lat p50 (s) | Lat p95 (s) | In tok | Out tok |
|---|--:|--:|--:|--:|--:|--:|
| `<none>` | 140 | 0.0000 | 75.80 | 372.78 | 0 | 0 |

## By cwd file extension (proxy for "file type")

| Value | Traces | Cost ($) | Lat p50 (s) | Lat p95 (s) | In tok | Out tok |
|---|--:|--:|--:|--:|--:|--:|
| `<none>` | 140 | 0.0000 | 75.80 | 372.78 | 0 | 0 |

## By HTTP status code

| Value | Traces | Cost ($) | Lat p50 (s) | Lat p95 (s) | In tok | Out tok |
|---|--:|--:|--:|--:|--:|--:|
| `<none>` | 140 | 0.0000 | 75.80 | 372.78 | 0 | 0 |

## By HTTP route

| Value | Traces | Cost ($) | Lat p50 (s) | Lat p95 (s) | In tok | Out tok |
|---|--:|--:|--:|--:|--:|--:|
| `<none>` | 140 | 0.0000 | 75.80 | 372.78 | 0 | 0 |

## By trace name (top 15)

| Value | Traces | Cost ($) | Lat p50 (s) | Lat p95 (s) | In tok | Out tok |
|---|--:|--:|--:|--:|--:|--:|
| `hermes_conversation:main` | 119 | 0.0000 | 81.22 | 372.78 | 0 | 0 |
| `linear-cron:github-actions` | 14 | 0.0000 | 1.57 | 3.48 | 0 | 0 |
| `Hermes turn` | 5 | 0.0000 | 56.61 | 58.77 | 0 | 0 |
| `<none>` | 1 | 0.0000 | 52.43 | 52.43 | 0 | 0 |
| `openclaw_daily-client-logs` | 1 | 0.0000 | 5.50 | 5.50 | 0 | 0 |

## By session id (top 10)

| Value | Traces | Cost ($) | Lat p50 (s) | Lat p95 (s) | In tok | Out tok |
|---|--:|--:|--:|--:|--:|--:|
| `<none>` | 135 | 0.0000 | 76.04 | 345.06 | 0 | 0 |
| `20260531_070618_e0dc7677` | 5 | 0.0000 | 56.61 | 58.77 | 0 | 0 |

## By UTC hour

| Hour | Traces |
|---|--:|
| `2026-05-31 06:00Z` | 5 |
| `2026-05-31 07:00Z` | 4 |
| `2026-05-31 08:00Z` | 6 |
| `2026-05-31 09:00Z` | 4 |
| `2026-05-31 10:00Z` | 6 |
| `2026-05-31 11:00Z` | 5 |
| `2026-05-31 12:00Z` | 5 |
| `2026-05-31 13:00Z` | 7 |
| `2026-05-31 14:00Z` | 8 |
| `2026-05-31 15:00Z` | 6 |
| `2026-05-31 16:00Z` | 7 |
| `2026-05-31 17:00Z` | 4 |
| `2026-05-31 18:00Z` | 7 |
| `2026-05-31 19:00Z` | 5 |
| `2026-05-31 20:00Z` | 8 |
| `2026-05-31 21:00Z` | 5 |
| `2026-05-31 22:00Z` | 4 |
| `2026-05-31 23:00Z` | 8 |
| `2026-06-01 00:00Z` | 4 |
| `2026-06-01 01:00Z` | 8 |
| `2026-06-01 02:00Z` | 7 |
| `2026-06-01 03:00Z` | 6 |
| `2026-06-01 04:00Z` | 6 |
| `2026-06-01 05:00Z` | 4 |
| `2026-06-01 06:00Z` | 1 |

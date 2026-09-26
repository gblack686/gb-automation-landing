"""Versioned API-equivalent estimates, separate from observed provider charges."""
from __future__ import annotations

from decimal import Decimal
import math

SOURCE = 'https://developers.openai.com/api/docs/pricing'
VERSION = 'openai-2026-09-14-standard'
# USD per million tokens: uncached input, cached input, output.
RATES = {
    'gpt-6-astra': ((10, 1, 50), (20, 2, 75)),
    'gpt-5.6-sol': ((4, .4, 20), (8, .8, 30)),
    'gpt-5.6-terra': ((2, .2, 12), (4, .4, 18)),
    'gpt-5.6-luna': ((.2, .02, 1.2), (.4, .04, 1.8)),
}


def token(value):
    return type(value) in (int, float) and math.isfinite(value) and value >= 0 and int(value) == value


def estimate(model, usage):
    """Explicit standard-processing scenario; never assert a subscription charge.

    With no verified context threshold, bound the estimate by both published
    context bands. This avoids silently pricing long-context calls as short.
    Input includes cached_input; reasoning_output is already inside output.
    """
    if model not in RATES or not isinstance(usage, dict):
        return None
    if not all(token(usage.get(k)) for k in ('input', 'cached_input', 'output')):
        return None
    inp, cached, output = (usage[k] for k in ('input', 'cached_input', 'output'))
    if cached > inp or (usage.get('total') is not None and usage['total'] != inp + output):
        return None
    buckets = (inp - cached, cached, output)
    costs = [float(sum(Decimal(str(n)) * Decimal(str(rate)) for n, rate in zip(buckets, rates)) / Decimal(1_000_000)) for rates in RATES[model]]
    return {'basis': 'estimated', 'currency': 'USD', 'minimum': costs[0], 'maximum': costs[1],
            'rate_version': VERSION, 'source': SOURCE,
            'assumption': 'API equivalent, standard processing, no regional uplift; range covers both context bands. Actual billing and service tier unknown.'}


def aggregate(estimates, eligible):
    values = [e for e in estimates if e is not None]
    return {'basis': 'estimated', 'currency': 'USD',
            'minimum': sum(e['minimum'] for e in values) if values else None,
            'maximum': sum(e['maximum'] for e in values) if values else None,
            'measured': len(values), 'eligible': eligible, 'rate_version': VERSION, 'source': SOURCE,
            'assumption': 'API equivalent, standard processing, no regional uplift; range covers both context bands. Actual billing and service tier unknown.'}

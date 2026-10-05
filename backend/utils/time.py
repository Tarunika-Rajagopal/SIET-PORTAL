# utils/timing.py
import time
from contextlib import contextmanager

@contextmanager
def timed(label: str):
    start = time.perf_counter()
    try:
        yield
    finally:
        print(f"[TIMING] {label}: {(time.perf_counter() - start) * 1000:.0f} ms", flush=True)
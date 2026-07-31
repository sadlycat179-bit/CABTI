"""Generate the short soundtrack used by the fate-dice transition."""

from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path


SAMPLE_RATE = 44_100
DURATION = 6.0
OUTPUT = Path(__file__).resolve().parents[1] / "audio" / "fate-dice-transition.wav"


def smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def add_drone(samples: list[float]) -> None:
    frequencies = (55.0, 65.406, 82.407)
    gains = (0.105, 0.054, 0.043)
    for index in range(len(samples)):
        time = index / SAMPLE_RATE
        fade_in = smoothstep(time / 0.42)
        fade_out = 1.0 - smoothstep((time - 3.72) / 0.88)
        envelope = fade_in * fade_out
        tremolo = 0.88 + 0.12 * math.sin(2.0 * math.pi * 0.58 * time)
        tone = sum(
            gain * math.sin(2.0 * math.pi * frequency * time + voice * 0.72)
            for voice, (frequency, gain) in enumerate(zip(frequencies, gains))
        )
        samples[index] += tone * envelope * tremolo


def add_roll_texture(samples: list[float], rng: random.Random) -> None:
    start = int(1.28 * SAMPLE_RATE)
    end = int(4.18 * SAMPLE_RATE)
    previous = 0.0
    for index in range(start, end):
        time = index / SAMPLE_RATE
        progress = (time - 1.28) / 2.90
        envelope = math.sin(math.pi * progress) ** 0.75
        noise = rng.uniform(-1.0, 1.0)
        high_pass = noise - previous * 0.74
        previous = noise
        rattle = 0.5 + 0.5 * math.sin(2.0 * math.pi * (15.0 + 7.0 * progress) * time)
        samples[index] += high_pass * envelope * (0.014 + 0.024 * rattle)


def add_dice_clacks(samples: list[float], rng: random.Random) -> None:
    clack_times = (1.34, 1.58, 1.84, 2.12, 2.39, 2.66, 2.92, 3.18, 3.43, 3.66, 3.86, 4.04)
    for event_index, event_time in enumerate(clack_times):
        start = int(event_time * SAMPLE_RATE)
        length = int((0.075 + (event_index % 3) * 0.012) * SAMPLE_RATE)
        previous = 0.0
        base_frequency = 150.0 + (event_index % 4) * 37.0
        strength = 0.32 - event_index * 0.012
        for offset in range(length):
            local_time = offset / SAMPLE_RATE
            fade = math.exp(-local_time * 42.0)
            noise = rng.uniform(-1.0, 1.0)
            edge = noise - previous
            previous = noise
            knock = math.sin(2.0 * math.pi * base_frequency * local_time)
            sample_index = start + offset
            if sample_index < len(samples):
                samples[sample_index] += (edge * 0.23 + knock * 0.14) * fade * strength


def add_chime(samples: list[float]) -> None:
    start = int(4.22 * SAMPLE_RATE)
    frequencies = (1046.50, 1567.98, 2093.00)
    gains = (0.19, 0.11, 0.065)
    length = int(0.82 * SAMPLE_RATE)
    for offset in range(length):
        time = offset / SAMPLE_RATE
        attack = smoothstep(time / 0.018)
        decay = math.exp(-time * 5.2)
        shimmer = 0.92 + 0.08 * math.sin(2.0 * math.pi * 5.5 * time)
        tone = sum(
            gain * math.sin(2.0 * math.pi * frequency * time)
            for frequency, gain in zip(frequencies, gains)
        )
        sample_index = start + offset
        if sample_index < len(samples):
            samples[sample_index] += tone * attack * decay * shimmer


def write_wave(samples: list[float]) -> None:
    peak = max(abs(sample) for sample in samples) or 1.0
    scale = 0.91 / peak
    pcm = bytearray()
    for sample in samples:
        value = int(max(-1.0, min(1.0, sample * scale)) * 32_767)
        pcm.extend(struct.pack("<h", value))

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUTPUT), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(pcm)


def main() -> None:
    samples = [0.0] * int(SAMPLE_RATE * DURATION)
    rng = random.Random(20260731)
    add_drone(samples)
    add_roll_texture(samples, rng)
    add_dice_clacks(samples, rng)
    add_chime(samples)
    write_wave(samples)
    print(f"Generated {OUTPUT} ({OUTPUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()

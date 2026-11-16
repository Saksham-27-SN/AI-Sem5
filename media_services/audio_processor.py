"""
InterviewGenie AI - Audio Processing & Echo Cancellation Utilities
Analyzes speech pacing (WPM), pause frequencies, and filler words.
Provides acoustic echo cancellation (AEC) parameter configuration.
"""

import re
from typing import Dict, Any, List

FILLER_WORDS = [
    "um", "uh", "er", "ah", "like", "actually", "basically",
    "literally", "honestly", "you know", "sort of", "kind of",
    "i mean", "right"
]

class AudioProcessor:
    @staticmethod
    def analyze_transcript_metrics(transcript: str, duration_seconds: float) -> Dict[str, Any]:
        """
        Analyzes speech transcript text to derive words-per-minute (WPM),
        filler word frequency, and estimated pause counts.
        """
        words = [w for w in re.split(r"\s+", transcript.strip()) if w]
        word_count = len(words)
        
        lower_text = transcript.lower()
        filler_count = 0
        filler_breakdown: Dict[str, int] = {}
        for filler in FILLER_WORDS:
            matches = len(re.findall(r"\b" + re.escape(filler) + r"\b", lower_text))
            if matches > 0:
                filler_count += matches
                filler_breakdown[filler] = matches

        duration_min = max(0.01, duration_seconds / 60.0)
        wpm = round(word_count / duration_min, 1)

        # Estimate pause count from sentence breaks and commas
        pause_matches = re.findall(r"[,;:\.\?!]+", transcript)
        pause_count = len(pause_matches)

        return {
            "word_count": word_count,
            "duration_seconds": round(duration_seconds, 2),
            "words_per_minute": wpm,
            "filler_words_count": filler_count,
            "filler_words_breakdown": filler_breakdown,
            "pause_count": pause_count
        }

    @staticmethod
    def get_echo_cancellation_constraints() -> Dict[str, Any]:
        """
        Returns recommended WebRTC / MediaStream audio constraints
        for acoustic echo prevention, noise suppression, and auto gain control.
        """
        return {
            "echoCancellation": True,
            "noiseSuppression": True,
            "autoGainControl": True,
            "sampleRate": 48000,
            "channelCount": 1
        }

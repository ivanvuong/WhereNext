from __future__ import annotations

PREFERENCE_TAGS = [
    "schools",
    "university",
    "nightlife",
    "parks",
    "transit",
    "grocery",
    "coffee",
    "fitness",
    "healthcare",
]

TAG_TO_CATEGORIES = {
    "schools": ["12006", "12007", "12008"],
    "university": ["12010"],
    "nightlife": ["13003", "13004", "13005"],
    "parks": ["16032", "16033", "16034"],
    "transit": ["19040", "19041", "19042"],
    "grocery": ["17069"],
    "coffee": ["13032"],
    "fitness": ["18021", "18022"],
    "healthcare": ["15014", "15015"],
}

TAG_DISTANCE_MILES = {
    "schools": 2.0,
    "university": 2.5,
    "nightlife": 1.5,
    "parks": 2.5,
    "transit": 1.2,
    "grocery": 1.0,
    "coffee": 0.8,
    "fitness": 1.2,
    "healthcare": 2.0,
}

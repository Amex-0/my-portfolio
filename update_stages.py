import re

with open("src/hooks/useFluidSimulation.ts", "r") as f:
    content = f.read()

# Replace combinations:
replacements = {
    "660, -540": "2200, -1800",
    "-660, 540": "-2200, 1800",
    "-660, -540": "-2200, -1800",
    "0, 780": "0, 2600",
    "660, 540": "2200, 1800",
    "840, 180": "2800, 600",
    "-840, 180": "-2800, 600"
}

stages_start = content.find("const STAGES:")
stages_end = content.find("];", stages_start) + 2

before = content[:stages_start]
stages_chunk = content[stages_start:stages_end]
after = content[stages_end:]

for old_val, new_val in replacements.items():
    stages_chunk = stages_chunk.replace(old_val, new_val)

with open("src/hooks/useFluidSimulation.ts", "w") as f:
    f.write(before + stages_chunk + after)

print("Modified STAGES.")

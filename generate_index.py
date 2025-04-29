import os
import json

# Path to your metadata directory
metadata_dir = "./metadata"

# List all .xml files (skip non-XML files)
xml_files = [f for f in os.listdir(metadata_dir) if f.endswith(".xml")]

# Write to index.json
with open(os.path.join(metadata_dir, "index.json"), "w") as f:
    json.dump(xml_files, f, indent=2)

print(f"✅ index.json generated with {len(xml_files)} file(s).")

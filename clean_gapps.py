import json

# Load the JSON file
with open('frontend/browser/assets/gapps.json', 'r') as f:
    apps = json.load(f)

# Filter out apps with URLs starting with '/'
filtered_apps = [app for app in apps if not app.get('app_url', '').startswith('/')]

# Write the filtered list back to the file
with open('frontend/browser/assets/gapps.json', 'w') as f:
    json.dump(filtered_apps, f, indent=2)

print(f"Removed {len(apps) - len(filtered_apps)} invalid entries. Total remaining: {len(filtered_apps)}")
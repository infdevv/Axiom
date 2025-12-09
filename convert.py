import json
import random

with open("may.json") as f:
    content = json.load(f)

new_games = []

for game in content:
    print("Processing " + game["name"])
    if game["link"] is not None and game["image"] is not None:
        new_games.append(
            {
                "app_name": game["name"],
                "app_url": game["link"],
                "app_img": game["image"].replace("/assets/media/icons/", "./assets/gapp-images/"),
                "type": "game",
            }
        )
    
new_games = random.sample(new_games, len(new_games))
    
with open("fixed.json", "w", encoding="utf-8") as f:
    json.dump(new_games, f, indent=4, ensure_ascii=False)


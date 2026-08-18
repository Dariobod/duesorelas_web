import json
from pathlib import Path


items = json.loads(Path("data/cloudinary-image-map.json").read_text(encoding="utf-8"))
values = ",\n  ".join(
    "(" + ",".join("'" + value.replace("'", "''") + "'" for value in (item["file"], item["secureUrl"])) + ")"
    for item in items
)
sql = (
    "-- Replace local image filenames with Cloudinary URLs\n"
    "WITH image_map(file, secure_url) AS (\n  VALUES\n  " + values +
    "\n)\nUPDATE product_images\nSET object_key = (SELECT secure_url FROM image_map WHERE image_map.file = product_images.object_key)\nWHERE object_key IN (SELECT file FROM image_map);\n"
)
Path("migrations/0005_cloudinary_urls.sql").write_text(sql, encoding="utf-8")
print(f"urls={len(items)}")

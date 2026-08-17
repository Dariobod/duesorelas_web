import csv
import re
from pathlib import Path


def sql(value: str) -> str:
    return "'" + (value or "").replace("'", "''") + "'"


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


rows = list(csv.DictReader(Path("data/Productos.csv").open(encoding="utf-8"), delimiter=";"))
categories = []
seen = set()
for row in rows:
    name = (row.get("Categoria") or "Accesorio").strip()
    key = slug(name)
    if key not in seen:
        seen.add(key)
        categories.append((key, name))

out = ["-- Seed catalog generated from data/Productos.csv", "BEGIN TRANSACTION;", ""]
for key, name in categories:
    out.append(f"INSERT OR IGNORE INTO categories (slug,name) VALUES ({sql(key)},{sql(name)});")

for row in rows:
    title = (row.get("Titulo") or "").strip()
    product_slug = slug(title)
    category_slug = slug((row.get("Categoria") or "Accesorio").strip())
    price = int(float((row.get("precio") or "0").replace(",", ".")))
    out.append(
        "INSERT OR IGNORE INTO products "
        "(slug,title,description,category_id,selection,materials,measurements,price_ars,price_note) "
        f"SELECT {sql(product_slug)},{sql(title)},{sql(row.get('Descripcion'))},id,"
        f"{sql(row.get('Seleccion') or 'n')},{sql(row.get('Materiales'))},"
        f"{sql(row.get('Medidas'))},{price},{sql(row.get('Comentario_precio'))} "
        f"FROM categories WHERE slug={sql(category_slug)};"
    )
    for order, column in enumerate(("Imagen_1", "Imagen_2")):
        image = (row.get(column) or "").strip()
        if image:
            out.append(
                "INSERT INTO product_images "
                "(product_id,object_key,alt_text,sort_order,is_primary) "
                f"SELECT id,{sql(image)},{sql(title)},{order},{1 if order == 0 else 0} "
                f"FROM products WHERE slug={sql(product_slug)};"
            )

out.extend(["", "COMMIT;", ""])
Path("migrations/0002_seed_catalog.sql").write_text("\n".join(out), encoding="utf-8")
print(f"categories={len(categories)} products={len(rows)}")

import csv
import re
from pathlib import Path


def sql(value):
    return "'" + (value or "").replace("'", "''") + "'"


def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


rows = list(csv.DictReader(Path("data/Productos.csv").open(encoding="utf-8"), delimiter=";"))
used = {}
products = []
images = []
for row in rows:
    title = (row.get("Titulo") or "").strip()
    base = slug(title)
    used[base] = used.get(base, 0) + 1
    product_slug = base if used[base] == 1 else f"{base}-{used[base]}"
    category_slug = slug((row.get("Categoria") or "Accesorio").strip())
    price = int(float((row.get("precio") or "0").replace(",", ".")))
    products.append("(" + ",".join([
        sql(product_slug), sql(title), sql(row.get("Descripcion")), sql(category_slug),
        sql(row.get("Seleccion") or "n"), sql(row.get("Materiales")), sql(row.get("Medidas")),
        str(price), sql(row.get("Comentario_precio"))
    ]) + ")")
    for order, column in enumerate(("Imagen_1", "Imagen_2")):
        image = (row.get(column) or "").strip()
        if image:
            images.append(f"({sql(product_slug)},{sql(image)},{sql(title)},{order},{1 if order == 0 else 0})")

product_sql = "WITH seed(slug,title,description,category_slug,selection,materials,measurements,price_ars,price_note) AS (\n  VALUES\n  " + ",\n  ".join(products) + "\n)\nINSERT INTO products (slug,title,description,category_id,selection,materials,measurements,price_ars,price_note)\nSELECT seed.slug,seed.title,seed.description,categories.id,seed.selection,seed.materials,seed.measurements,seed.price_ars,seed.price_note\nFROM seed JOIN categories ON categories.slug=seed.category_slug;"
image_sql = "WITH seed(product_slug,object_key,alt_text,sort_order,is_primary) AS (\n  VALUES\n  " + ",\n  ".join(images) + "\n)\nINSERT INTO product_images (product_id,object_key,alt_text,sort_order,is_primary)\nSELECT products.id,seed.object_key,seed.alt_text,seed.sort_order,seed.is_primary\nFROM seed JOIN products ON products.slug=seed.product_slug;"
Path("migrations/0004_rebuild_catalog.sql").write_text("DELETE FROM product_images;\nDELETE FROM products;\n\n" + product_sql + "\n\n" + image_sql + "\n", encoding="utf-8")
print(f"products={len(products)} images={len(images)}")

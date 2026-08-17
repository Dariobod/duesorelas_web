import csv
import re
from pathlib import Path


def sql(value):
    return "'" + (value or "").replace("'", "''") + "'"


def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


rows = list(csv.DictReader(Path("data/Productos.csv").open(encoding="utf-8"), delimiter=";"))
products = []
images = []
for row in rows:
    title = (row.get("Titulo") or "").strip()
    product_slug = slug(title)
    category_slug = slug((row.get("Categoria") or "Accesorio").strip())
    price = int(float((row.get("precio") or "0").replace(",", ".")))
    products.append(
        "(" + ",".join([
            sql(product_slug), sql(title), sql(row.get("Descripcion")), sql(category_slug),
            sql(row.get("Seleccion") or "n"), sql(row.get("Materiales")), sql(row.get("Medidas")),
            str(price), sql(row.get("Comentario_precio"))
        ]) + ")"
    )
    for order, column in enumerate(("Imagen_1", "Imagen_2")):
        image = (row.get(column) or "").strip()
        if image:
            images.append(f"({sql(product_slug)},{sql(image)},{sql(title)},{order},{1 if order == 0 else 0})")

product_sql = """-- Execute as one statement\nWITH seed(slug,title,description,category_slug,selection,materials,measurements,price_ars,price_note) AS (\n  VALUES\n  """ + ",\n  ".join(products) + "\n)\nINSERT OR IGNORE INTO products (slug,title,description,category_id,selection,materials,measurements,price_ars,price_note)\nSELECT seed.slug,seed.title,seed.description,categories.id,seed.selection,seed.materials,seed.measurements,seed.price_ars,seed.price_note\nFROM seed JOIN categories ON categories.slug=seed.category_slug;\n"
image_sql = """-- Execute as one statement\nWITH seed(product_slug,object_key,alt_text,sort_order,is_primary) AS (\n  VALUES\n  """ + ",\n  ".join(images) + "\n)\nINSERT OR IGNORE INTO product_images (product_id,object_key,alt_text,sort_order,is_primary)\nSELECT products.id,seed.object_key,seed.alt_text,seed.sort_order,seed.is_primary\nFROM seed JOIN products ON products.slug=seed.product_slug;\n"
Path("migrations/0003_bulk_products.sql").write_text(product_sql + "\n" + image_sql, encoding="utf-8")
print(f"products={len(products)} images={len(images)}")

-- Editable subtitles for category cards and category pages.
ALTER TABLE categories ADD COLUMN intro TEXT NOT NULL DEFAULT '';

UPDATE categories
SET intro = CASE slug
  WHEN 'collar' THEN 'Capas, amuletos y detalles que acompañan todos los días.'
  WHEN 'collares' THEN 'Capas, amuletos y detalles que acompañan todos los días.'
  WHEN 'dije' THEN 'Pequeños símbolos para hacer tuyo cada gesto.'
  WHEN 'dijes' THEN 'Pequeños símbolos para hacer tuyo cada gesto.'
  WHEN 'colgante' THEN 'Piezas livianas para llevar cerca.'
  WHEN 'colgantes' THEN 'Piezas livianas para llevar cerca.'
  WHEN 'pulsera' THEN 'Texturas, perlas y color para sumar movimiento.'
  WHEN 'pulseras' THEN 'Texturas, perlas y color para sumar movimiento.'
  WHEN 'accesorio' THEN 'Objetos pequeños, hechos para regalar o guardar.'
  WHEN 'accesorios' THEN 'Objetos pequeños, hechos para regalar o guardar.'
  ELSE intro
END
WHERE intro = '';

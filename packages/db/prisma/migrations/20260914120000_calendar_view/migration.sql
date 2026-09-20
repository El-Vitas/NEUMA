-- Las mismas filas puestas en los días que dicen.
--
-- Un calendario no guarda nada nuevo: lee la fecha que cada fila ya tiene y la
-- pone donde cae. Por eso basta con que la clase de vista exista.
ALTER TYPE "DatabaseViewType" ADD VALUE IF NOT EXISTS 'CALENDAR';

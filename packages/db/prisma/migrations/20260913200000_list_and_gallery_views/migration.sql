-- Dos maneras más de mirar las mismas filas.
--
-- Una lista las pone una debajo de otra, sin cuadrícula, para cuando cada fila
-- es una página que se lee y no un dato que se compara. Una galería las pone
-- como tarjetas grandes, para cuando lo que distingue a una fila se ve antes de
-- leerla.
--
-- No cambian nada de lo que las filas guardan: son la misma colección leída de
-- otra forma, así que basta con que la clase de vista exista.
ALTER TYPE "DatabaseViewType" ADD VALUE IF NOT EXISTS 'LIST';
ALTER TYPE "DatabaseViewType" ADD VALUE IF NOT EXISTS 'GALLERY';

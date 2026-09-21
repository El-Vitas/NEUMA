-- Las mismas filas contadas, no listadas.
--
-- Un gráfico tampoco guarda nada nuevo: agrupa como agrupa un tablero y dibuja
-- cuántas cayeron en cada grupo. Lo único que hace falta es que la clase de
-- vista exista.
ALTER TYPE "DatabaseViewType" ADD VALUE IF NOT EXISTS 'CHART';

-- La acción de un agente se anota antes de escribir, como pendiente, y se
-- cierra con su resultado. Si no se puede anotar, no se escribe; si no se
-- puede cerrar, queda pendiente a la vista en vez de perderse.
ALTER TYPE "AgentActionOutcome" ADD VALUE 'PENDING' BEFORE 'DONE';

ALTER TABLE "AgentAction" ADD COLUMN "finishedAt" TIMESTAMP(3);

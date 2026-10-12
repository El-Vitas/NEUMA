# Business Rules Registry

Registro versionado de reglas de negocio del proyecto. Cada feature tiene un YAML (`fea-XXX.yaml`) con reglas identificadas (`BR-NNN`), su razón de negocio y escenarios Given/When/Then que sirven como base para tests de aceptación.

## Archivos

- `fea-aut.yaml` - reglas de autenticación y control de acceso (ejemplo real, funcional con Company Brain).
- `fea-usr.yaml` - reglas de gestión de usuarios (ejemplo real, funcional con Company Brain).
- `fea-template.yaml` - plantilla para crear el YAML de un feature nuevo (copiar, renombrar y completar; no se indexa como regla real hasta asignarle ids definitivos).

## Convenciones

- `id` de feature: `FEA-` + 3 letras (`FEA-ORD`, `FEA-PAG`).
- `id` de regla: `BR-NNN`, correlativo global (no por feature).
- `status`: `draft` | `active` | `deprecated`.
- Toda regla nueva nace con `why`; una regla sin razón de negocio no se acepta.
- Las reglas se escriben en el idioma del dominio del proyecto; los ids y estados en inglés.

## CLI

El registro se indexa en SQLite con `packages/rules-cli` (skill asociada en `.agents/skills/business-rules`):

```bash
bun run rules:build          # reconstruye rules.db desde los YAML
bun run rules:query <texto>  # busca reglas
bun run rules:add            # agrega una regla vía CLI
bun run rules:dump           # exporta el registro
bun run rules:delete --id BR-xxx   # borra una regla puesta por error
```

`rules:delete` no es la manera de retirar una regla. Una regla que se pensó mal se
reemplaza con `supersedes`, y la vieja queda marcada y enlazada a la nueva: haberse
equivocado al pensar es parte de la historia del producto y se conserva. `delete`
es para un error material —el feature equivocado, la misma regla enviada dos
veces, un envío a medias—, y se niega a tocar una regla de la que cuelgue el
histórico.

`rules.db` es un artefacto generado: no se versiona, se reconstruye con `rules:build`.

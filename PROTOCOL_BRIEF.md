# Portaldot Atlas — protocolo de contribución verificable

## Decisión de producto

Portaldot Atlas no es un marketplace de misiones empresariales ni un clon de
Nodle. Es una aplicación propia en la que los usuarios operan centinelas de
confiabilidad desde sus conexiones reales. La red obtiene observabilidad
independiente y los usuarios reciben **Atlas Credits** por aportes que añaden
información nueva y verificable.

Solo intervienen el protocolo y sus usuarios. Un servicio de verificación es
parte del protocolo, no un cliente externo que tenga que crear demanda.

## Qué recibe Portaldot

- Mediciones desde redes y ubicaciones de usuarios, no solo desde servidores
  centralizados.
- Alertas sobre indisponibilidad, retraso de bloques, diferencias de
  finalización y degradación de endpoints.
- Un mapa de confiabilidad agregado que una wallet o DApp puede usar para
  elegir un endpoint.
- Actividad on-chain trazable: registro de centinelas, raíces de época,
  emisión de créditos y reclamos.

## Atlas Credits

Durante el MVP son créditos de contribución **no transferibles**:

- no tienen liquidez, precio, conversión ni promesa de valor futuro;
- no se publicitan como inversión ni como ingreso;
- se emiten únicamente ante una prueba aceptada;
- su utilidad inicial es reputación, historial verificable y prioridad para
  desafíos de mayor calidad dentro de Atlas.

No se obliga al usuario a comprar POT para reclamar. El protocolo subvenciona
la liquidación de las pruebas aceptadas durante la etapa de prueba. Esto evita
que el gas sea una barrera disfrazada de utilidad.

## Flujo de una prueba

1. El cliente Atlas registra una clave pública y pide un desafío efímero.
2. El desafío incluye `challenge_id`, nonce, endpoint, genesis hash esperado,
   vencimiento y clase de medición.
3. El centinela consulta el endpoint real de Portaldot y recoge únicamente:
   salud, cabecera actual, cabecera finalizada, versión de runtime, latencia y
   marca de tiempo local.
4. El cliente firma el resultado con su clave privada local.
5. El verificador rechaza firmas inválidas, nonces vencidos/reutilizados,
   genesis distinto, lecturas imposibles y repeticiones sin novedad.
6. Las pruebas aceptadas se puntúan por frescura, diversidad de red y valor
   diagnóstico. No hay crédito por simplemente mantener la aplicación abierta.
7. Al cierre de una época, el verificador publica una raíz de compromisos;
   cada participante puede reclamar sus Atlas Credits con una prueba Merkle.

La cadena recibe compromisos y estados, no direcciones IP, GPS exacto ni
trazas de navegación.

El monitor público no debe derivarse de ejemplos guardados: Atlas expone
`/v1/network-status`, que genera una observación firmada al pedirla, y
`/v1/evidence/recent`, que devuelve únicamente el diario de observaciones
producidas por esas lecturas vivas y por el agente.

## Anti-farming y Sybil

Un token sin controles sería solo un contador de bots. El MVP debe implementar:

- un desafío de un solo uso y vida corta;
- una firma local por identidad de centinela;
- límite por identidad, endpoint y época;
- puntuación decreciente para resultados redundantes;
- rechazo de resultados cuyo bloque/genesis no coincide con fuentes de
  referencia;
- compromiso de una señal de red agregada, nunca IP pública en cadena;
- preparación para atestación de clave Android Keystore cuando exista app
  móvil. La atestación de hardware aumenta el costo de Sybil, pero no se debe
  afirmar que lo elimina.

## Componente agéntico: Atlas Reliability Agent

El agente no decide gastos con lenguaje natural ni controla una wallet sin
límites. Es una máquina de estados con herramientas y una política explícita.

### Objetivo

Corroborar una posible incidencia con una segunda observación independiente y
producir evidencia, no "hacer trading" ni gastar sin propósito.

### Herramientas

1. `sampleEndpoint`: ejecuta la sonda de solo lectura y devuelve evidencia
   firmada con EIP-191 sobre el contenido exacto.
2. `compareEvidence`: compara genesis, alturas, hashes finalizados y latencia.
3. `requestIndependentProbe`: solicita a otro centinela una prueba puntual.
4. `publishEpochRoot`: prepara una raíz de época; requiere aprobación humana
   antes de cualquier escritura fuera de un entorno de prueba.

### Política de pago

`requestIndependentProbe` usa x402 para comprar una lectura puntual solo si
una regla determinista detecta, por ejemplo, tres fallas consecutivas o una
diferencia de finalización. El presupuesto debe tener:

- límite por solicitud;
- límite por incidente;
- lista de endpoints/sentinelas permitidos;
- expiración corta;
- idempotencia por `incident_id`.

Para el MVP se usa x402 sobre Base Sepolia porque el flujo ya fue liquidado y
verificado en Wayfare. MPP no se incorpora aún: es una alternativa de transporte
de pagos, no un requisito para resolver la corroboración.

## Contratos previstos

1. `SentinelRegistry`: clave de centinela, estado y controles de registro.
2. `EpochCredits`: raíz Merkle de cada época, créditos reclamados y emisión
   no transferible.
3. `EvidencePolicy`: parámetros de época, máximos y versión de reglas.

El primer componente ya existe como `contracts/atlas-epoch-credits`: publica
una raíz inmutable por época y permite un reclamo Merkle una sola vez por
centinela. Sus pruebas ejecutables cubren permisos del verificador, prueba
inválida y doble reclamo. Aún no se declara desplegado hasta realizar una
ejecución real contra infraestructura Portaldot apta para contratos.

No se creará un token fungible o transferible mientras no exista una utilidad
real y una revisión de riesgos separada.

## Evidencia mínima, sin mocks

| Gate | Prueba requerida |
| --- | --- |
| A1 | Dos clientes en conexiones reales producen mediciones firmadas del endpoint oficial de Portaldot. |
| A2 | Un nonce repetido, vencido o firmado por otra clave es rechazado. |
| A3 | El agente detecta una condición reproducible y compra una segunda lectura x402; la respuesta contiene datos reales y evidencia de pago pública. |
| A4 | La raíz de época y el reclamo de Credits se ejecutan en Portaldot local oficial; luego se repiten en V3 cuando haya endpoint, faucet y explorador publicados. |
| A5 | Una vista muestra datos agregados reales, no un mapa precargado. |

La primera parte de A3 ya fue comprobada el 2026-10-10: una solicitud x402 de
Base Sepolia liquidó una lectura real y la respuesta devolvió una atestación
EIP-191 verificable. Aún falta demostrar que el disparador provino de tres
fallas reales en dos conexiones independientes; no se simulará una incidencia
para aparentar haberlo logrado.

## Riesgos y condiciones de pivote

- Si Portaldot no publica una V3 accesible antes del tiempo útil del hackathon,
  no se debe afirmar un despliegue público; se conserva evidencia local real.
- Si no se consigue una segunda conexión física para A1/A3, no se inventa
  diversidad. Se solicita una prueba a un segundo participante.
- Si los datos de un único endpoint no permiten corroborar la red, Atlas se
  limita honestamente a medir disponibilidad de ese endpoint y no afirma
  descentralización de validación.
- Si la señal no ayuda a una wallet/DApp a tomar una decisión concreta, se
  elimina en vez de acumular telemetría por acumularla.

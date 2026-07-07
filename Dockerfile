# Multi-stage build for the Apify Actor deployment.
FROM apify/actor-node:24 AS builder

COPY --chown=myuser:myuser package*.json ./
RUN npm install --include=dev --audit=false

COPY --chown=myuser:myuser . ./
RUN npm run build

FROM apify/actor-node:24

COPY --chown=myuser:myuser package*.json ./
RUN npm --quiet set progress=false \
    && npm install --omit=dev --omit=optional --audit=false \
    && rm -rf ~/.npm

COPY --from=builder --chown=myuser:myuser /usr/src/app/dist ./dist
COPY --chown=myuser:myuser data ./data
COPY --chown=myuser:myuser .actor ./.actor

CMD ["node", "dist/apify-main.js"]

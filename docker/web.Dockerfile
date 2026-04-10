FROM node:20-alpine

RUN corepack enable

WORKDIR /workspace

RUN apk add --no-cache libc6-compat git

CMD ["sh", "-c", "corepack prepare pnpm@latest --activate && exec sh"]

@echo off
deno install
deno --allow-read --allow-write --allow-net src/download-gdrive-folders.ts
deno --allow-read --allow-write src/parse-gdrive-folders.ts
deno --allow-read --allow-write --allow-net src/link-dbs.ts
deno --allow-read --allow-write --allow-net src/insert-community-names.ts
# adx-convert-db
Collection of Node.js/Deno scripts to construct a link between @zetaraku's maimai song database ([website](https://arcade-songs.zetaraku.dev/maimai/), [JSON](https://dp4p6x0xfi5o9.cloudfront.net/maimai/data.json)) and the [AstroDX convert Google Drive](https://drive.google.com/drive/u/0/folders/1NiZ9rL19qKLqt0uNcP5tIqc0fUrksAPs) folders for each song. This is done to let my [adx-convert-browser](/trustytrojan/adx-convert-browser) app simply download and use the resulting JSON file created from the steps below.

To run the workflow, simply run `run-all.sh` on POSIX or `run-all.cmd` on Windows. You're expected to have Deno installed, but you can replace its usage with Node.js if you want (this involves `npm install`'ing the dependencies since there is no `package.json` currently).

The latest "build" of the database is committed to this repository: [songs.json](./songs.json).

# Decisions

Choices the brief left open, and why.

## Project

- Copyright holder in `LICENSE` is the git author of this repo (Michele Dussin). Change it if the repo moves.
- `pnpm build` on this machine prints a Turbopack warning about a `pnpm-lock.yaml` in the home directory. It comes from outside the repo and is ignored.
- Scripts load `.env.local` through Node's `--env-file-if-exists` flag instead of adding a dotenv dependency. Node 22.9 or newer is required.
- Commits are one line with no trailers, as the brief asks.

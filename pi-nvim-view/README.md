# pi-nvim-view

A Pi extension that adds `/nvim`, a slash command for opening the latest completed assistant response in Neovim as disposable markdown.

## Install

Install this extension with:

```bash
pi install /absolute/path/to/pi-nvim-view
```

For local development or one-off testing:

```bash
pi -e ./src/index.ts
```

## Usage

Inside Pi, run:

```text
/nvim
/nvim pick
```

Behavior:

- `/nvim` waits for the current assistant response to finish and opens the latest completed assistant response
- `/nvim pick` shows a picker of completed assistant responses on the current branch, newest first
- both paths keep only text blocks, preserving stored markdown exactly
- the selected response is written to a temporary `.md` file and opened in `nvim`
- the temporary file is deleted after `nvim` exits

If you want to keep the response, save it somewhere else from inside Neovim:

```vim
:w notes/response.md
```

## Requirements

- `nvim` must be available on `PATH`
- interactive Pi UI is required for `/nvim`

## Development

```bash
npm install
npm run check
npm test
```

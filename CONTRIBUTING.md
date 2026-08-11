# Contributing to Fabric

Thanks for wanting to improve Fabric.

Fabric is source-available. Contributions are welcome, but the project is not
licensed as open source.

## Before Contributing

- Open an issue or discussion for large changes.
- Keep pull requests focused and small.
- Do not include secrets, tokens, private URLs, or credentials.
- Follow the existing architecture and project style.
- Keep plugins isolated from core internals.

## Contribution License

By submitting a pull request, issue comment, patch, or other contribution, you
grant Auvexis the right to use, modify, distribute, sublicense, and include your
contribution in Fabric under Fabric's current or future license terms.

You confirm that you have the right to submit the contribution.

## Development

Install dependencies:

```sh
npm install
```

Run Fabric locally:

```sh
npm run dev
```

Run the desktop development build:

```sh
npm run dev:desktop
```

Run checks:

```sh
npm run type-check
npm run test
```

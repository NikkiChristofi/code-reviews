# code-reviews

A small full-stack TypeScript application used for the **Application Support Engineer** technical test.

## 1. Fork the app

Go to https://github.com/NikkiChristofi/code-reviews/fork and create a fork of the app

## 2. Clone the forked app

Go to your fork and click on the Code button. Clone the app one of three ways:

if you have an SSH key set up:
Copy the SSH url after pressing Code and then type into your terminal `git clone [copied url]`

if not:
Copy the HTTPS url after pressing Code and then type into your terminal `git clone [copied url]`

## 3. Run the app

You can run the app one of two ways. Only pick one way, you do not need to do both.

via Docker (recommended):

```bash
docker compose up --build
```

This builds and runs everything for you - all you need is to have docker installed

via NPM (only if you have not got Docker installed):

```bash
npm install                      # installs both workspaces
npm run setup                    # copies env files, migrates, seeds, ingests World Bank data
npm run dev                      # starts API (:4000) and web (:3000) with hot reload
```

## 3. Read the brief

Read [BRIEF.md](./BRIEF.md) for the task and go from there.

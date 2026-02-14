# Docs + README Current-State Refresh Plan

## Objective
Refresh repository and in-app documentation so it matches current shipped behavior.

## Scope
- Root `README.md`
- User-facing docs text in `src/routes/docs.tsx`
- LLM docs files in `public/llms.txt` and `public/llms-full.txt`
- Native READMEs (`native/apple/README.md`, `native/android/README.md`) for current branding/transport

## Current Drift To Fix
- Root README is still the initial TanStack template.
- Some docs still mention 24-hour default retention, while runtime default is 30 days unless configured.
- Native READMEs and copy still use older branding text.
- Docs should reflect native multipart upload adoption.

## Steps
1. Replace root README with project-accurate documentation.
2. Update docs page and LLM docs for retention defaults and current wording.
3. Update native README branding and upload transport notes.
4. Run lint/typecheck/build + native validation commands.
5. Commit and push as documentation refresh.

---
name: kb-update
description: Update the chatbot's knowledge base (backend/data/: CVs and diego_profile.md) and confirm the bot actually learned it. Use when Diego's CV, experience, projects or profile text change.
---

# kb-update

The backend reads every `.pdf`, `.md` and `.txt` in `backend/data/` at startup into one in-memory mega-prompt (no vector search), so changes only apply after a restart. `*.pdf` is gitignored, so CVs are not versioned.

1. Edit or add the files in `backend/data/` (keep both language CVs consistent with `diego_profile.md`). If `S3_BUCKET` is set in the target environment, the files are read from S3 instead — upload there too.
2. Ask the user to restart the backend (do not start or stop their servers yourself).
3. Verify with the running API at `http://localhost:8000`:
   - `POST /conversations` to create a conversation and note its `id`.
   - `POST /conversations/{id}/chat` with `{"prompt": "<question only the new content answers>", "use_local_model": false}` using `curl -N` (SSE stream). Ask 3 control questions: one about the new fact, one about an old fact that must still hold, one the documents do not cover (the bot should not invent an answer).
   - `DELETE /conversations/{id}` afterwards to leave no test data.
4. Report each question, the answer, and whether it matches the source document. Mention that `/chat` is limited to 10 requests per minute per IP.

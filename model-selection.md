# Model Selection & Routing

> Model selection is choosing which model handles a request, and routing is sending different requests to different models.

Picking a model, and sometimes a route between models, for the job in front of you.

Track: Foundations
Access: free
Card: https://bf-lab.netlify.app/model-selection
Plain text: https://bf-lab.netlify.app/model-selection.md
Last checked: 2026-10-17

## What it is

The API call names a model. Selection is that choice for one job. Routing is doing it on purpose across jobs: a short labeling task can go one way, and a long draft another.

## Why it matters

**Cost.** Models are priced differently. Sending every request to the most capable model spends that rate on tasks a smaller model may already handle.

**Quality.** A faster model can be enough for a narrow task and not enough for a hard one. The way to tell is to run the same examples on each.

**Risk.** A different model can change the reply, which tools the request can use, and which settings the API accepts.

## Try today

Pick one real task. Run it on two models you can already call, with the same prompt, and keep the reply that does the job.

## Common mistake

Routing every request to the most capable model, including the ones a smaller model already handles.

## Self-check

You have a short labeling task and a long drafting task. What is routing?

Sending each task to a model you have checked for that task

## Practice and deep

Coming soon. One task you already run, compared on two models you can call.

Coming soon. What changes besides the reply when the model name changes, including tools and settings.

## Sources

- [OpenAI, Model selection](https://developers.openai.com/api/docs/guides/model-selection)
- [OpenAI, API deployment checklist](https://developers.openai.com/api/docs/guides/deployment-checklist)
- [Anthropic, Choosing a model](https://platform.claude.com/docs/en/about-claude/models/choosing-a-model)

Vendor API documentation.

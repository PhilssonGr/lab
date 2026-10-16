# Hallucination

> A hallucination is a reply that states something the prompt and the sources do not support.

A reply that states something the prompt and the sources do not support.

Track: Foundations
Access: free
Card: https://bf-lab.netlify.app/hallucination
Plain text: https://bf-lab.netlify.app/hallucination.md
Last checked: 2026-10-17

## What it is

The model can write a fluent sentence that was not in the prompt and not in the source you attached. That unsupported claim is a hallucination. A claim that contradicts the source is one too.

## Why it matters

**Cost.** An unsupported claim often needs another turn, or a person, to check it before you can use the reply.

**Quality.** A fluent sentence is not a source. The claim is only as good as the text that supports it.

**Risk.** If the product acts on the reply, an unsupported claim can become a wrong decision. Checks reduce that chance. They do not remove it.

## Try today

Take one reply and list each factual claim. For each claim, point to a sentence in the prompt or the source. If you cannot, mark the claim unsupported.

## Common mistake

Treating a confident or specific sentence as proof that the claim was in the source.

## Self-check

The source says the warehouse closes at 18:00 and does not mention Sunday. The reply says it is open on Sunday. What is the Sunday claim?

A hallucination

## Practice and deep

Coming soon. One reply you already use, with each claim marked supported or not.

Coming soon. How a provider's grounding or citation tool relates to checking a claim yourself.

## Sources

- [Anthropic, Reduce hallucinations](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)
- [Gemini API, Safety and factuality](https://ai.google.dev/gemini-api/docs/safety-guidance)
- [OpenAI, Optimizing LLM accuracy](https://developers.openai.com/api/docs/guides/optimizing-llm-accuracy)

Vendor API documentation.

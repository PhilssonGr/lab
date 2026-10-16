# Context Window

> The context window is the fixed text one request can hold: instructions, history, documents, and the answer.

The fixed text one request can hold: instructions, history, documents, and the answer.

Track: Foundations
Access: free
Card: https://bf-lab.netlify.app/context-window
Plain text: https://bf-lab.netlify.app/context-window.md
Last checked: 2026-10-16

## What it is

The context window is how much text one request can hold. That includes the system prompt, the conversation so far, documents you attach, and the answer the model is still writing. Text that does not fit is not visible to the model for that request.

## Why it matters

**Cost.** You pay for the tokens that sit in the window, including history and documents the question may not need. Re-sending the same history or documents every turn adds up. Prompt caching can make the repeated part much cheaper.

**Quality.** When the window is full of old turns or long documents, less room is left for the question and the answer.

**Risk.** Text that does not fit is outside that request. An instruction or a fact can be among what the model does not see.

## Try today

On a long chat, start a fresh thread and paste only the brief and the source you still need.

## Common mistake

Assuming the model still sees the first messages after the thread has grown past the window.

## Self-check

You send the same long document on every turn. What can change the cost of that repeated part?

Prompt caching can make the repeated part much cheaper.

## Practice and deep

Coming soon. Lay out one real request and mark what you would drop first.

Coming soon. How products differ when the window is full: some refuse, some trim, some cut.

## Sources

Sources pending. No provider doc is cited on this card yet.

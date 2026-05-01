import type { EventContent } from "../../lib/eventContent.ts";

/**
 * FAQ section. Each entry is a native `<details>` / `<summary>`
 * pair so expand/collapse works without JavaScript and meets
 * keyboard accessibility expectations out of the box. Default
 * marker, focus ring, and content layout are normalized in
 * `globals.css` so browser defaults don't surprise the reader.
 */
export function EventFAQ({ faq }: { faq: EventContent["faq"] }) {
  return (
    <section className="event-faq" aria-labelledby="event-faq-heading">
      <h2 id="event-faq-heading" className="event-section-heading">
        Frequently asked questions
      </h2>
      <ul className="event-faq-list">
        {faq.map((entry, entryIndex) => (
          <li key={entryIndex} className="event-faq-item">
            <details className="event-faq-details">
              <summary className="event-faq-summary">{entry.question}</summary>
              <p className="event-faq-answer">{entry.answer}</p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The copy and sources shown together wherever an answer is settled. */
import { useId, type ReactNode } from "react";
import {
  parseSourceLine,
  splitExplanationParagraphs,
  type SourceSegment,
  type SourceTextSegment,
} from "../../../../../shared/game-config";
import type { Question } from "../../data/games";

/**
 * Props for the settled-answer narrative.
 *
 * `copy` and `question` are separate on purpose. The reveal panels do not
 * render `question.explanation` — they render a message the reducer resolved
 * through `gameUtils`, which may be a sponsor fact or a bare "Correct."
 * fallback, and the results review resolves its own note again from the raw
 * fields. So the copy to show is an input, not something this component can
 * derive; `question` is here only to say which question's sources belong
 * under it.
 */
type QuestionNarrativeProps = {
  copy: string | null;
  question: Question;
};

/** Renders one inline run of a source line or a link label. */
function renderTextSegments(segments: SourceTextSegment[]): ReactNode[] {
  return segments.map((segment, index) =>
    segment.kind === "emphasis" ? (
      <em key={index}>{segment.text}</em>
    ) : (
      segment.text
    ));
}

/** Renders one parsed source line, anchors included. */
function renderSourceSegments(segments: SourceSegment[]): ReactNode[] {
  return segments.map((segment, index) => {
    if (segment.kind !== "link") {
      return segment.kind === "emphasis" ? (
        <em key={index}>{segment.text}</em>
      ) : (
        segment.text
      );
    }

    return (
      // A source is a third-party citation, so it always leaves the app in a
      // new context, and `noopener` keeps the opened document from reaching
      // back through `window.opener`. `noreferrer` rides along because a
      // citation has no reason to announce which quiz question sent the
      // reader.
      <a
        className="question-source-link"
        href={segment.href}
        key={index}
        rel="noopener noreferrer"
        target="_blank"
      >
        {renderTextSegments(segment.label)}
        {segment.isPdf ? (
          // Inside the anchor, so it is part of the link's accessible name
          // rather than a visual cue sitting next to it — the point is that a
          // reader knows it is a PDF *before* deciding to open it, and a
          // screen-reader user learns that from the link name. Parenthesized
          // as literal text so the marker reads the same way to everyone
          // rather than depending on a badge shape to carry the meaning.
          <span className="question-source-pdf">(PDF)</span>
        ) : null}
      </a>
    );
  });
}

/**
 * Renders the settled-answer copy followed by that question's sources.
 *
 * This is the only module that renders `question.sources`. Sources belong to
 * an answer the quiz has stopped asking about; the retry banner on an open
 * question in must-get-it-right mode shows the same explanation text but is a
 * hint, not a citation surface, and deliberately does not use this component.
 */
export function QuestionNarrative({ copy, question }: QuestionNarrativeProps) {
  const labelId = useId();
  const paragraphs = copy ? splitExplanationParagraphs(copy) : [];
  const sources = question.sources ?? [];

  if (paragraphs.length === 0 && sources.length === 0) {
    return null;
  }

  return (
    <div className="question-narrative">
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
      {sources.length > 0 ? (
        <div className="question-sources">
          {/* A visible label rather than a heading. The component renders
              inside three different heading contexts — under a reveal panel's
              optional sponsor `h2`, under the same panel with no `h2` at all,
              and under a review card's `h3` — so no single level is correct
              everywhere, and a level that adapts would still put one "Sources"
              entry per question into the heading outline of the results
              screen. `aria-labelledby` names the list without claiming to be a
              section of the document. */}
          <p className="question-sources-label" id={labelId}>
            Sources
          </p>
          <ul aria-labelledby={labelId} className="question-sources-list">
            {sources.map((line, index) => (
              <li key={index}>{renderSourceSegments(parseSourceLine(line).segments)}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

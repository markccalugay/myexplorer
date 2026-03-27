import React from 'react';
import type { LegalPageContent } from '../content/legalContent';
import './LegalPage.css';

interface LegalPageProps {
    content: LegalPageContent;
}

export const LegalPage: React.FC<LegalPageProps> = ({ content }) => (
    <main className="main-content main-content--legal">
        <div className="legal-shell">
            <section className="legal-hero">
                <p className="legal-eyebrow">{content.eyebrow}</p>
                <h1>{content.title}</h1>
                <p className="legal-summary">{content.summary}</p>
                <p className="legal-effective">Effective {content.effectiveDate}</p>
            </section>

            {content.callouts?.length ? (
                <section className="legal-callouts" aria-label={`${content.eyebrow} highlights`}>
                    {content.callouts.map((callout) => (
                        <article key={callout} className="legal-callout">
                            <p>{callout}</p>
                        </article>
                    ))}
                </section>
            ) : null}

            <section className="legal-sections">
                {content.sections.map((section) => (
                    <article key={section.title} className="legal-section">
                        <h2>{section.title}</h2>
                        {section.paragraphs?.map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                        ))}
                        {section.bullets?.length ? (
                            <ul>
                                {section.bullets.map((bullet) => (
                                    <li key={bullet}>{bullet}</li>
                                ))}
                            </ul>
                        ) : null}
                    </article>
                ))}
            </section>
        </div>
    </main>
);

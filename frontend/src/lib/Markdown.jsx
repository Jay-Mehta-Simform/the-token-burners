// Markdown renderer used for AI-generated free-form text.
//
// SPEC NOTE: the AI pipeline's reverse-spec step (and any free-form AI output)
// is produced as Markdown rather than strict JSON. The frontend renders that
// Markdown here instead of treating it as a plain string. Gaps & questions
// remain STRUCTURED (they drive severity chips, type marks and inline answering),
// but their description / question text is also rendered through Markdown so any
// inline formatting from the model displays correctly. See specs/SPEC.md.
import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function Markdown({ children, className }) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children || ''}</ReactMarkdown>
    </div>
  )
}

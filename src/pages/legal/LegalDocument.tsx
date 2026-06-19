import { ReactNode } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LEGAL_DOCUMENTS, type LegalSlug } from "@/content/legal";

interface LegalDocumentProps {
  slug?: LegalSlug;
}

export default function LegalDocument({ slug: slugProp }: LegalDocumentProps) {
  const params = useParams<{ slug: string }>();
  const slug = (slugProp ?? params.slug) as LegalSlug | undefined;
  const doc = slug ? LEGAL_DOCUMENTS[slug] : undefined;

  if (!doc) {
    return <Navigate to="/definicoes/legal" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border-subtle bg-surface-elevated/60 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/definicoes/legal" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-strong">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <span className="inline-flex items-center gap-2 text-xs text-text-muted">
            <FileText className="h-3.5 w-3.5" />
            Documento legal
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-text-strong sm:text-4xl">
            {doc.title}
          </h1>
          <p className="mt-2 text-sm text-text-muted">Última atualização: {doc.updatedAt}</p>
        </header>

        <article className="space-y-5 text-[15px] leading-relaxed text-text-default">
          {doc.body}
        </article>

        <footer className="mt-12 flex flex-wrap items-center gap-3 border-t border-border-subtle pt-6 text-sm text-text-muted">
          <span>Outros documentos:</span>
          {(Object.entries(LEGAL_DOCUMENTS) as [LegalSlug, { title: string }][])
            .filter(([s]) => s !== slug)
            .map(([s, d]) => (
              <Button key={s} asChild variant="outline" size="sm">
                <Link to={`/legal/${s}`}>{d.title}</Link>
              </Button>
            ))}
        </footer>
      </main>
    </div>
  );
}

export function LegalParagraph({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

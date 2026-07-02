import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/ui/common';
import { Photo } from '@/components/ui/Photo';
import { ObjectIcon } from '@/components/ui/ObjectIcon';
import { Book, BookOpen, Pencil, Plus } from '@/components/ui/icons';
import { useGuideSections } from '@/hooks/useData';
import { useEditLocked } from '@/hooks/useEditLocked';
import { useLocationPhoto } from '@/hooks/useLocationPhoto';
import type { GuideBlock } from '@/types/entities';
import { t } from '@/text';

/**
 * Guia del vaixell: manual de consulta ràpida per a la tripulació. Pàgina contínua amb un
 * índex a dalt; tocar un tema fa scroll fins a la seva secció (àncora per `id`). El
 * contingut viu a la base de dades (event sourcing) i és editable des de l'app quan el
 * mode edició està desbloquejat: llavors surt un botó per afegir secció i un llapis a cada
 * secció. Veure src/routes/GuideEditor.tsx.
 */
export function Guide() {
  const navigate = useNavigate();
  const sections = useGuideSections() ?? [];
  const editLocked = useEditLocked();

  if (sections.length === 0) {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <h1 className="text-xl font-bold">{t.guide.title}</h1>
        <EmptyState icon={Book} text={t.guide.empty} />
        {!editLocked && (
          <button
            onClick={() => navigate('/guide/new')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-boat-300 p-4 text-sm font-semibold text-boat-600 active:scale-[0.99]"
          >
            <Plus size={18} />
            {t.guide.addSection}
          </button>
        )}
      </div>
    );
  }

  function goTo(id: string) {
    document.getElementById(`guide-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="flex flex-col gap-5 pt-2">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">{t.guide.title}</h1>
        <p className="text-sm text-boat-500">{t.guide.intro}</p>
      </header>

      {/* Índex: salta a la secció */}
      <nav className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-boat-700">{t.guide.indexTitle}</h2>
        <ul className="grid grid-cols-2 gap-2">
          {sections.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => goTo(s.id)}
                className="flex w-full items-center gap-2 rounded-2xl bg-white p-3 text-left shadow-sm active:scale-[0.98]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-boat-100 text-boat-700">
                  <ObjectIcon icon={s.icon} size={20} className="text-boat-700" fallback={BookOpen} />
                </span>
                <span className="text-sm font-semibold leading-tight">{s.title}</span>
              </button>
            </li>
          ))}
          {!editLocked && (
            <li>
              <button
                onClick={() => navigate('/guide/new')}
                className="flex h-full w-full items-center gap-2 rounded-2xl border border-dashed border-boat-300 p-3 text-left text-boat-600 active:scale-[0.98]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-boat-100 text-boat-600">
                  <Plus size={20} />
                </span>
                <span className="text-sm font-semibold leading-tight">{t.guide.addSection}</span>
              </button>
            </li>
          )}
        </ul>
      </nav>

      {/* Seccions contínues */}
      <div className="flex flex-col gap-4">
        {sections.map((s) => (
          <section
            key={s.id}
            id={`guide-${s.id}`}
            // scroll-mt: deixa marge sota la capçalera fixa en saltar-hi.
            className="relative scroll-mt-20 rounded-2xl bg-white p-4 shadow-sm"
          >
            {!editLocked && (
              <button
                onClick={() => navigate(`/guide/edit/${s.id}`)}
                aria-label={t.guide.editSection}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-boat-100 text-boat-600 active:scale-95"
              >
                <Pencil size={18} />
              </button>
            )}
            <h2 className="mb-3 flex items-center gap-2 pr-10 text-lg font-bold text-boat-900">
              <span className="flex h-8 w-8 items-center justify-center text-boat-700">
                <ObjectIcon icon={s.icon} size={24} className="text-boat-700" fallback={BookOpen} />
              </span>
              {s.title}
            </h2>
            <div className="flex flex-col gap-3">
              {s.blocks.map((block, i) => (
                <GuideBlockView key={i} block={block} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/** Renderitza un bloc de contingut segons el seu `kind`. */
function GuideBlockView({ block }: { block: GuideBlock }) {
  switch (block.kind) {
    case 'heading':
      return <h3 className="text-base font-bold text-boat-900">{block.text}</h3>;

    case 'paragraph':
      return <p className="text-[15px] leading-relaxed text-boat-900">{block.text}</p>;

    case 'steps':
      return (
        <ol className="flex flex-col gap-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-boat-700 text-sm font-bold text-white">
                {i + 1}
              </span>
              <span className="pt-0.5 text-[15px] leading-relaxed text-boat-900">{item}</span>
            </li>
          ))}
        </ol>
      );

    case 'list':
      return (
        <ul className="flex flex-col gap-1.5">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-boat-900">
              <span className="select-none text-boat-400">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );

    case 'image':
      return <GuideBlockImage src={block.src} caption={block.caption} />;

    case 'note':
      return (
        <p className="rounded-xl border-l-4 border-amber-400 bg-amber-50 p-3 text-[15px] leading-relaxed text-amber-900">
          {block.text}
        </p>
      );
  }
}

/**
 * Imatge d'un bloc. `src` pot ser una ruta de photoQueue ('guides/…', pujada des de
 * l'app, resolta amb el mateix mecanisme que els llocs) o una ruta estàtica llegada de
 * public/guide/ ('guide/…', resolta amb el prefix de desplegament).
 */
function GuideBlockImage({ src, caption }: { src: string; caption?: string }) {
  const isUploaded = src.startsWith('guides/');
  const uploadedUrl = useLocationPhoto(isUploaded ? src : undefined);
  const url = isUploaded ? uploadedUrl : import.meta.env.BASE_URL + src;
  if (!url) return null;
  return (
    <figure className="flex flex-col gap-1">
      <Photo src={url} alt={caption ?? ''} className="w-full rounded-2xl object-cover" />
      {caption && <figcaption className="px-1 text-xs text-boat-500">{caption}</figcaption>}
    </figure>
  );
}

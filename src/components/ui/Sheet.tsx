import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { useIsLargeScreen } from '@/hooks/useMediaQuery';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

// Durada de l'animació de sortida (slide-down). Ha de coincidir amb la transició CSS.
const CLOSE_MS = 260;
// Distància (px) que cal arrossegar el handle avall per tancar.
const CLOSE_THRESHOLD = 120;
// Corba amb una mica de "bounce" per al retorn a la posició de repòs.
const BOUNCE = 'transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1)';
// Transició suau per a la sortida (slide-down).
const SLIDE_OUT = 'transform 260ms ease-in';

/**
 * Fases d'animació del panell:
 *  - 'enter'   : acaba d'aparèixer → slide-up des de baix (animació CSS).
 *  - 'settled' : en repòs, sense cap transició (evita re-disparar slide-up).
 *  - 'drag'    : el dit l'està arrossegant; segueix translateY = dragY (sense transició).
 *  - 'return'      : s'ha deixat anar sense tancar → torna a 0 amb bounce.
 *  - 'closing'     : tancament extern (clic fora) → animació CSS slide-down des de 0.
 *  - 'closing-drag': tancament per drag → transició des de la posició arrossegada.
 */
type Phase = 'enter' | 'settled' | 'drag' | 'return' | 'closing' | 'closing-drag';

/**
 * Full lliscant inferior (bottom sheet) per a formularis i seleccions.
 *
 * El handle de dalt és arrossegable:
 *  - avall: el panell segueix el dit; si se supera el llindar, es tanca amb slide-down;
 *    si no, torna a la posició original amb un bounce.
 *  - amunt: es permet amb resistència (efecte elàstic) i torna amb bounce en deixar anar.
 * Clicar fora també tanca amb slide-down. L'API es manté igual.
 */
export function Sheet(props: SheetProps) {
  const isLarge = useIsLargeScreen();
  return isLarge ? <CenteredModal {...props} /> : <BottomSheet {...props} />;
}

/** Bottom sheet arrossegable (mòbil). Comportament original sense canvis. */
function BottomSheet({ open, onClose, title, children }: SheetProps) {
  // Mantenim el Sheet muntat durant l'animació de sortida.
  const [rendered, setRendered] = useState(open);
  const [phase, setPhase] = useState<Phase>('enter');
  const [dragY, setDragY] = useState(0);
  const startY = useRef(0);
  const dragYRef = useRef(0);
  // Congelem l'últim contingut/títol no buit. Molts pares fan servir el patró
  // `<Sheet open={!!x}>{x && <Detall .../>}</Sheet>`: en tancar, `x` passa a null
  // i els children es buiden a l'instant, fent col·lapsar l'alçada del panell i
  // arruïnant l'animació de sortida (semblava un "teletransport" cap a baix).
  // Mantenint l'últim contingut durant el tancament, el panell anima amb l'alçada
  // real fins al final.
  const frozen = useRef<{ children: ReactNode; title?: string }>({ children, title });
  if (open) frozen.current = { children, title };

  useEffect(() => {
    if (open) {
      setRendered(true);
      setPhase('enter');
      setDragY(0);
      dragYRef.current = 0;
    } else if (rendered) {
      // Tancament extern (clic fora o canvi de prop): animació CSS slide-down.
      // Una animació de keyframes sempre parteix del seu 'from' (translateY 0),
      // així que no hi ha cap "salt": el panell llisca avall des d'on és, sigui
      // quin sigui l'estat previ. Quan acaba, es desmunta.
      setPhase('closing');
      const t = setTimeout(() => setRendered(false), CLOSE_MS + 40);
      return () => clearTimeout(t);
    }
  }, [open, rendered]);

  if (!rendered) return null;

  function onPointerDown(e: PointerEvent) {
    startY.current = e.clientY;
    setPhase('drag');
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (phase !== 'drag') return;
    const raw = e.clientY - startY.current;
    // Cap amunt (negatiu): resistència elàstica perquè es noti el límit.
    const next = raw >= 0 ? raw : raw / 3;
    dragYRef.current = next;
    setDragY(next);
  }

  function onPointerUp() {
    if (phase !== 'drag') return;
    if (dragYRef.current > CLOSE_THRESHOLD) {
      // Tanca: transició suau des de la posició arrossegada fins a 100%.
      setPhase('closing-drag');
      setTimeout(() => {
        setRendered(false);
        onClose();
      }, CLOSE_MS);
    } else {
      // Torna a la posició de repòs amb bounce.
      setPhase('return');
      setDragY(0);
      dragYRef.current = 0;
    }
  }

  // Estil del panell segons la fase.
  let panelStyle: React.CSSProperties | undefined;
  let panelAnim = '';
  switch (phase) {
    case 'enter':
      panelAnim = 'animate-slide-up';
      break;
    case 'drag':
      panelStyle = { transform: `translateY(${dragY}px)` };
      break;
    case 'return':
      panelStyle = { transform: 'translateY(0)', transition: BOUNCE };
      break;
    case 'closing':
      // Tancament extern: animació CSS keyframe (sempre parteix de translateY 0,
      // sense salts ni dependència de reflow).
      panelAnim = 'animate-slide-down';
      break;
    case 'closing-drag':
      // Tancament per drag: continua des de la posició arrossegada fins a 100%.
      panelStyle = { transform: 'translateY(100%)', transition: SLIDE_OUT };
      break;
    case 'settled':
    default:
      break; // repòs: sense transició ni animació
  }

  function onPanelTransitionEnd() {
    // En acabar l'animació d'entrada o de retorn, passa a repòs.
    if (phase === 'return') setPhase('settled');
  }

  function onPanelAnimationEnd() {
    if (phase === 'enter') setPhase('settled');
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className={`absolute inset-0 bg-black/40 ${
          phase === 'closing' || phase === 'closing-drag'
            ? 'opacity-0 transition-opacity duration-200'
            : 'animate-fade-in'
        }`}
        onClick={onClose}
      />
      {/* Wrapper que es transforma (drag/animacions). L'extensió de fons blanc i el
          panell scrollable hi viuen dins; així el transform els mou junts. */}
      <div
        style={panelStyle}
        onTransitionEnd={onPanelTransitionEnd}
        onAnimationEnd={onPanelAnimationEnd}
        className={`relative ${panelAnim}`}
      >
        {/* Extensió de fons blanc cap avall: en estirar el panell amunt (translateY
            negatiu) evita que es vegi la barra de navegació pel forat de sota. */}
        <div className="pointer-events-none absolute inset-x-0 top-full h-[50vh] bg-white" />
        <div className="max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-8 shadow-xl">
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="-mt-1 mb-2 cursor-grab touch-none py-2 active:cursor-grabbing"
          >
            <div className="mx-auto h-1.5 w-12 rounded-full bg-gray-300" />
          </div>
          {frozen.current.title && (
            <h2 className="mb-3 text-xl font-bold text-boat-900">{frozen.current.title}</h2>
          )}
          {frozen.current.children}
        </div>
      </div>
    </div>
  );
}

/**
 * Modal centrat (pantalla gran). Mateixa API que el bottom sheet però ancorat al centre,
 * sense gest de drag i tancable amb clic al fons o amb la tecla Escape. Hi arriben tots els
 * usos de `Sheet` sense canviar res al consumidor.
 */
function CenteredModal({ open, onClose, title, children }: SheetProps) {
  // Es manté muntat durant l'animació de sortida (fade-out).
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  // Mateix patró que el bottom sheet: congelem l'últim contingut no buit perquè la sortida
  // no "parpellegi" quan el pare buida els children en tancar.
  const frozen = useRef<{ children: ReactNode; title?: string }>({ children, title });
  if (open) frozen.current = { children, title };

  useEffect(() => {
    if (open) {
      setRendered(true);
      setClosing(false);
    } else if (rendered) {
      setClosing(true);
      const t = setTimeout(() => setRendered(false), 200);
      return () => clearTimeout(t);
    }
  }, [open, rendered]);

  // Tancar amb Escape mentre és obert.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!rendered) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 bg-black/40 ${
          closing ? 'opacity-0 transition-opacity duration-200' : 'animate-fade-in'
        }`}
        onClick={onClose}
      />
      <div
        className={`relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-4 pb-6 shadow-xl ${
          closing ? 'opacity-0 transition-opacity duration-200' : 'animate-scale-in'
        }`}
      >
        {frozen.current.title && (
          <h2 className="mb-3 text-xl font-bold text-boat-900">{frozen.current.title}</h2>
        )}
        {frozen.current.children}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';

/**
 * Zone de signature tactile/souris — équivalent web de
 * `mobile/lib/features/dynamic_form/widgets/signature_pad_field.dart`.
 * Capture le trait sur un `<canvas>`, puis encode en base64 SANS le préfixe
 * `data:image/png;base64,` (même convention que le mobile, attendue par le
 * générateur de PDF backend — voir `PdfTemplateService`).
 */
export function SignaturePad({
  label,
  existingSignatureBase64,
  onSigned,
  onCleared,
  place,
  onPlaceChanged,
  signedByName,
  onSignedByNameChanged,
}: {
  label: string;
  existingSignatureBase64: string | null;
  onSigned: (base64Png: string) => void;
  onCleared: () => void;
  place: string;
  onPlaceChanged: (value: string) => void;
  signedByName: string;
  onSignedByNameChanged: (value: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const hasStrokeRef = useRef(false);
  const [hasStroke, setHasStroke] = useState(false);

  const isSigned = Boolean(existingSignatureBase64) && !hasStroke;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.lineWidth = 2.5;
    context.lineCap = 'round';
    context.strokeStyle = '#1e3a5f';
  }, []);

  function getPoint(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    const context = canvas.getContext('2d');
    if (!context) return;
    const { x, y } = getPoint(event);
    context.beginPath();
    context.moveTo(x, y);
    isDrawingRef.current = true;
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const { x, y } = getPoint(event);
    context.lineTo(x, y);
    context.stroke();
    if (!hasStrokeRef.current) {
      hasStrokeRef.current = true;
      setHasStroke(true);
    }
  }

  function handlePointerUp() {
    isDrawingRef.current = false;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    hasStrokeRef.current = false;
    setHasStroke(false);
  }

  function handleClear() {
    clearCanvas();
    onCleared();
  }

  function handleValidate() {
    const canvas = canvasRef.current;
    if (!canvas || !hasStroke) return;
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    onSigned(base64);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {isSigned && (
          <span className="text-xs font-medium text-brand-positive">✓ Signé</span>
        )}
      </div>

      <input
        value={place}
        onChange={(event) => onPlaceChanged(event.target.value)}
        placeholder="Fait à (lieu)"
        className="mb-2 w-full rounded-lg border border-brand-outline px-3 py-1.5 text-sm focus:border-brand-accent focus:outline-none"
      />
      <input
        value={signedByName}
        onChange={(event) => onSignedByNameChanged(event.target.value)}
        placeholder="Nom du signataire"
        className="mb-2 w-full rounded-lg border border-brand-outline px-3 py-1.5 text-sm focus:border-brand-accent focus:outline-none"
      />

      <div className="relative h-40 overflow-hidden rounded-xl border border-brand-outline bg-white">
        {isSigned && existingSignatureBase64 ? (
          <img
            src={`data:image/png;base64,${existingSignatureBase64}`}
            alt={`Signature — ${label}`}
            className="h-full w-full object-contain"
          />
        ) : (
          <canvas
            ref={canvasRef}
            width={420}
            height={160}
            className="h-full w-full touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        )}
      </div>

      <div className="mt-1.5 flex justify-end gap-3 text-xs font-semibold">
        <button type="button" onClick={handleClear} className="text-brand-muted hover:underline">
          Effacer
        </button>
        {!isSigned && (
          <button
            type="button"
            onClick={handleValidate}
            disabled={!hasStroke}
            className="text-brand-primary hover:underline disabled:opacity-40"
          >
            Valider la signature
          </button>
        )}
      </div>
    </div>
  );
}

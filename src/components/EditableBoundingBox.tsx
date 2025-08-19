import { useRef, useEffect } from 'react';

interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

interface EditableBoundingBoxProps {
  imageUrl: string;
  boundingBoxes: BoundingBox[];
  onBoundingBoxChange?: (boxes: BoundingBox[]) => void;
  showDirectly?: boolean;
}

export function EditableBoundingBox({ 
  imageUrl, 
  boundingBoxes,
  showDirectly = false 
}: EditableBoundingBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (showDirectly) {
    return (
      <div className="relative border-2 border-border rounded-lg overflow-hidden bg-background">
        <img 
          src={imageUrl}
          alt="Detection"
          className="w-full h-auto"
        />
        {/* Simple bounding boxes overlay */}
        {boundingBoxes.map((box) => (
          <div key={box.id}>
            <div
              className="absolute border-2 border-blue-500 bg-blue-500/10"
              style={{
                left: `${box.x}px`,
                top: `${box.y}px`,
                width: `${box.width}px`,
                height: `${box.height}px`,
              }}
            />
            <div
              className="absolute bg-blue-500 text-white px-2 py-1 text-xs font-medium rounded"
              style={{
                left: `${box.x}px`,
                top: `${box.y - 28}px`,
              }}
            >
              Plástico {Math.round(box.confidence * 100)}%
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative border-2 border-border rounded-lg overflow-hidden bg-background" style={{ height: '400px' }}>
      <img 
        src={imageUrl}
        alt="Detection"
        className="w-full h-full object-contain"
      />
      {/* Simple bounding boxes overlay */}
      {boundingBoxes.map((box) => (
        <div key={box.id}>
          <div
            className="absolute border-2 border-blue-500 bg-blue-500/10"
            style={{
              left: `${box.x}px`,
              top: `${box.y}px`,
              width: `${box.width}px`,
              height: `${box.height}px`,
            }}
          />
          <div
            className="absolute bg-blue-500 text-white px-2 py-1 text-xs font-medium rounded"
            style={{
              left: `${box.x}px`,
              top: `${box.y - 28}px`,
            }}
          >
            Plástico {Math.round(box.confidence * 100)}%
          </div>
        </div>
      ))}
    </div>
  );
}
import { useRef, useEffect, useState, useCallback } from 'react';

interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  label?: string;
}

interface EditableBoundingBoxProps {
  imageUrl: string;
  boundingBoxes: BoundingBox[];
  onBoundingBoxChange?: (boxes: BoundingBox[]) => void;
  showDirectly?: boolean;
  editable?: boolean;
}

export function EditableBoundingBox({ 
  imageUrl, 
  boundingBoxes,
  showDirectly = false,
  editable = false,
  onBoundingBoxChange
}: EditableBoundingBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [boxes, setBoxes] = useState<BoundingBox[]>(boundingBoxes);
  const [dragState, setDragState] = useState<{
    boxId: string;
    isDragging: boolean;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);
  const [resizeState, setResizeState] = useState<{
    boxId: string;
    isResizing: boolean;
    startX: number;
    startY: number;
    initialWidth: number;
    initialHeight: number;
    handle: string;
  } | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  
  useEffect(() => {
    setBoxes(boundingBoxes);
  }, [boundingBoxes]);
  
  const updateBox = useCallback((boxId: string, updates: Partial<BoundingBox>) => {
    setBoxes(prev => {
      const newBoxes = prev.map(box => 
        box.id === boxId ? { ...box, ...updates } : box
      );
      onBoundingBoxChange?.(newBoxes);
      return newBoxes;
    });
  }, [onBoundingBoxChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent, boxId: string, action: 'drag' | 'resize', handle?: string) => {
    if (!editable) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const box = boxes.find(b => b.id === boxId);
    if (!box) return;
    
    if (action === 'drag') {
      setDragState({
        boxId,
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        initialX: box.x,
        initialY: box.y
      });
    } else if (action === 'resize' && handle) {
      setResizeState({
        boxId,
        isResizing: true,
        startX: e.clientX,
        startY: e.clientY,
        initialWidth: box.width,
        initialHeight: box.height,
        handle
      });
    }
  }, [editable, boxes]);

  useEffect(() => {
    if (!editable) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      
      if (dragState?.isDragging) {
        const deltaX = e.clientX - dragState.startX;
        const deltaY = e.clientY - dragState.startY;
        
        // Convert pixel deltas to percentage
        const deltaXPercent = (deltaX / containerRect.width) * 100;
        const deltaYPercent = (deltaY / containerRect.height) * 100;
        
        updateBox(dragState.boxId, {
          x: Math.max(0, Math.min(100, dragState.initialX + deltaXPercent)),
          y: Math.max(0, Math.min(100, dragState.initialY + deltaYPercent))
        });
      } else if (resizeState?.isResizing) {
        const deltaX = e.clientX - resizeState.startX;
        const deltaY = e.clientY - resizeState.startY;
        
        // Convert pixel deltas to percentage
        const deltaXPercent = (deltaX / containerRect.width) * 100;
        const deltaYPercent = (deltaY / containerRect.height) * 100;
        
        let newWidth = resizeState.initialWidth;
        let newHeight = resizeState.initialHeight;
        
        if (resizeState.handle.includes('right')) {
          newWidth = Math.max(5, resizeState.initialWidth + deltaXPercent);
        }
        if (resizeState.handle.includes('bottom')) {
          newHeight = Math.max(5, resizeState.initialHeight + deltaYPercent);
        }
        if (resizeState.handle.includes('left')) {
          newWidth = Math.max(5, resizeState.initialWidth - deltaXPercent);
        }
        if (resizeState.handle.includes('top')) {
          newHeight = Math.max(5, resizeState.initialHeight - deltaYPercent);
        }
        
        updateBox(resizeState.boxId, {
          width: newWidth,
          height: newHeight
        });
      }
    };
    
    const handleMouseUp = () => {
      setDragState(null);
      setResizeState(null);
    };
    
    if (dragState || resizeState) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, resizeState, updateBox, editable]);

  const handleLabelEdit = (boxId: string, newLabel: string) => {
    updateBox(boxId, { label: newLabel });
    setEditingLabel(null);
  };

  if (showDirectly) {
    return (
      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
        <img 
          src={imageUrl}
          alt="Detection"
          className="w-full h-full object-cover"
        />
        
        {/* Bounding Boxes Overlay - Using same approach as InferenceResults */}
        {boxes.length > 0 && (
          <div className="absolute inset-0">
            {boxes.map((box) => {
              const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
              const color = colors[0]; // Use first color for consistency
              
              return (
                <div
                  key={box.id}
                  className="absolute border-2 rounded"
                  style={{
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`,
                    borderColor: color,
                  }}
                >
                  <div 
                    className="absolute -top-6 left-0 px-2 py-1 text-xs font-medium text-white rounded text-nowrap"
                    style={{ backgroundColor: color }}
                  >
                    {box.label || `Plástico ${Math.round(box.confidence * 100)}%`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
      {/* Editable bounding boxes overlay */}
      {boxes.map((box) => (
        <div key={box.id} className="absolute inset-0">
          {/* Main bounding box */}
          <div
            className={`absolute border-2 transition-colors ${
              editable 
                ? 'border-primary hover:border-primary/80 cursor-move' 
                : 'border-blue-500'
            } ${editable ? 'bg-primary/10 hover:bg-primary/15' : 'bg-blue-500/10'}`}
            style={{
              left: `${box.x}%`,
              top: `${box.y}%`,
              width: `${box.width}%`,
              height: `${box.height}%`,
            }}
            onMouseDown={(e) => handleMouseDown(e, box.id, 'drag')}
          >
            {/* Resize handles - only show when editable */}
            {editable && (
              <>
                {/* Corner handles */}
                <div
                  className="absolute w-3 h-3 bg-primary border border-primary-foreground cursor-nw-resize -top-1 -left-1"
                  onMouseDown={(e) => handleMouseDown(e, box.id, 'resize', 'top-left')}
                />
                <div
                  className="absolute w-3 h-3 bg-primary border border-primary-foreground cursor-ne-resize -top-1 -right-1"
                  onMouseDown={(e) => handleMouseDown(e, box.id, 'resize', 'top-right')}
                />
                <div
                  className="absolute w-3 h-3 bg-primary border border-primary-foreground cursor-sw-resize -bottom-1 -left-1"
                  onMouseDown={(e) => handleMouseDown(e, box.id, 'resize', 'bottom-left')}
                />
                <div
                  className="absolute w-3 h-3 bg-primary border border-primary-foreground cursor-se-resize -bottom-1 -right-1"
                  onMouseDown={(e) => handleMouseDown(e, box.id, 'resize', 'bottom-right')}
                />
                
                {/* Edge handles */}
                <div
                  className="absolute w-full h-2 cursor-n-resize -top-1 left-0"
                  onMouseDown={(e) => handleMouseDown(e, box.id, 'resize', 'top')}
                />
                <div
                  className="absolute w-full h-2 cursor-s-resize -bottom-1 left-0"
                  onMouseDown={(e) => handleMouseDown(e, box.id, 'resize', 'bottom')}
                />
                <div
                  className="absolute w-2 h-full cursor-w-resize -left-1 top-0"
                  onMouseDown={(e) => handleMouseDown(e, box.id, 'resize', 'left')}
                />
                <div
                  className="absolute w-2 h-full cursor-e-resize -right-1 top-0"
                  onMouseDown={(e) => handleMouseDown(e, box.id, 'resize', 'right')}
                />
              </>
            )}
          </div>
          
          {/* Label */}
          <div
            className={`absolute px-2 py-1 text-xs font-medium rounded shadow-sm -translate-y-7 ${
              editable 
                ? 'bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90' 
                : 'bg-blue-500 text-white'
            }`}
            style={{
              left: `${box.x}%`,
              top: `${box.y}%`,
              minWidth: '60px',
            }}
            onClick={() => editable && setEditingLabel(box.id)}
          >
            {editingLabel === box.id ? (
              <input
                type="text"
                className="bg-transparent border-none outline-none text-xs w-full"
                defaultValue={box.label || `Plástico ${Math.round(box.confidence * 100)}%`}
                autoFocus
                onBlur={(e) => handleLabelEdit(box.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleLabelEdit(box.id, e.currentTarget.value);
                  } else if (e.key === 'Escape') {
                    setEditingLabel(null);
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              box.label || `Plástico ${Math.round(box.confidence * 100)}%`
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
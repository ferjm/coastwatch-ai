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
  console.log('EditableBoundingBox - Props received:', { imageUrl, boundingBoxes, showDirectly, editable });
  
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
    console.log('EditableBoundingBox - Updating boxes with:', boundingBoxes);
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
      if (dragState?.isDragging) {
        const deltaX = e.clientX - dragState.startX;
        const deltaY = e.clientY - dragState.startY;
        
        updateBox(dragState.boxId, {
          x: Math.max(0, dragState.initialX + deltaX),
          y: Math.max(0, dragState.initialY + deltaY)
        });
      } else if (resizeState?.isResizing) {
        const deltaX = e.clientX - resizeState.startX;
        const deltaY = e.clientY - resizeState.startY;
        
        let newWidth = resizeState.initialWidth;
        let newHeight = resizeState.initialHeight;
        
        if (resizeState.handle.includes('right')) {
          newWidth = Math.max(20, resizeState.initialWidth + deltaX);
        }
        if (resizeState.handle.includes('bottom')) {
          newHeight = Math.max(20, resizeState.initialHeight + deltaY);
        }
        if (resizeState.handle.includes('left')) {
          newWidth = Math.max(20, resizeState.initialWidth - deltaX);
        }
        if (resizeState.handle.includes('top')) {
          newHeight = Math.max(20, resizeState.initialHeight - deltaY);
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
    console.log('EditableBoundingBox - Rendering directly with boxes:', boxes);
    
    return (
      <div className="relative w-full bg-gray-100 border-4 border-green-500 rounded-lg overflow-visible">
        <img 
          src={imageUrl}
          alt="Detection"
          className="w-full h-auto block"
          onLoad={() => console.log('EditableBoundingBox - Image loaded:', imageUrl)}
        />
        
        {/* SUPER VISIBLE DEBUG INFO */}
        <div className="absolute top-4 left-4 bg-yellow-400 text-black p-3 text-lg font-bold rounded z-50 border-2 border-black">
          📦 BOXES: {boxes.length} | EDITABLE: {editable ? '✅' : '❌'}
        </div>
        
        {/* GUARANTEED VISIBLE TEST BOX */}
        <div 
          className="absolute top-20 left-20 w-32 h-24 bg-red-500 border-4 border-yellow-400 z-40 flex items-center justify-center text-white font-bold"
        >
          TEST BOX
        </div>
        
        {/* ACTUAL BOUNDING BOXES */}
        {boxes.map((box, index) => {
          console.log(`EditableBoundingBox - Rendering box ${index + 1}:`, box);
          return (
            <div key={box.id} className="absolute">
              {/* Main bounding box with MAXIMUM visibility */}
              <div
                className="absolute border-8 border-red-500 bg-red-500/50 z-30"
                style={{
                  left: `${box.x}px`,
                  top: `${box.y}px`,
                  width: `${box.width}px`,
                  height: `${box.height}px`,
                  boxShadow: '0 0 20px red',
                }}
                onMouseDown={editable ? (e) => {
                  console.log('Box mousedown:', box.id);
                  handleMouseDown(e, box.id, 'drag');
                } : undefined}
              >
                {/* Box number in center */}
                <div className="absolute inset-0 flex items-center justify-center text-white text-2xl font-bold bg-black/50">
                  {index + 1}
                </div>
                
                {/* Resize handles - HUGE and visible */}
                {editable && (
                  <>
                    <div
                      className="absolute w-6 h-6 bg-yellow-400 border-4 border-red-600 cursor-nw-resize -top-3 -left-3 z-50"
                      onMouseDown={(e) => {
                        console.log('Resize handle mousedown:', box.id, 'top-left');
                        handleMouseDown(e, box.id, 'resize', 'top-left');
                      }}
                    />
                    <div
                      className="absolute w-6 h-6 bg-yellow-400 border-4 border-red-600 cursor-ne-resize -top-3 -right-3 z-50"
                      onMouseDown={(e) => handleMouseDown(e, box.id, 'resize', 'top-right')}
                    />
                    <div
                      className="absolute w-6 h-6 bg-yellow-400 border-4 border-red-600 cursor-sw-resize -bottom-3 -left-3 z-50"
                      onMouseDown={(e) => handleMouseDown(e, box.id, 'resize', 'bottom-left')}
                    />
                    <div
                      className="absolute w-6 h-6 bg-yellow-400 border-4 border-red-600 cursor-se-resize -bottom-3 -right-3 z-50"
                      onMouseDown={(e) => handleMouseDown(e, box.id, 'resize', 'bottom-right')}
                    />
                  </>
                )}
              </div>
              
              {/* Label - SUPER visible */}
              <div
                className="absolute px-3 py-2 text-sm font-bold rounded-lg shadow-2xl bg-blue-600 text-white border-4 border-white z-40"
                style={{
                  left: `${box.x}px`,
                  top: `${box.y - 40}px`,
                  minWidth: '120px',
                }}
                onClick={() => {
                  console.log('Label clicked:', box.id);
                  editable && setEditingLabel(box.id);
                }}
              >
                {editingLabel === box.id ? (
                  <input
                    type="text"
                    className="bg-blue-700 border-2 border-white outline-none text-sm w-full text-white"
                    defaultValue={box.label || `Plástico ${Math.round(box.confidence * 100)}%`}
                    autoFocus
                    onBlur={(e) => {
                      console.log('Label edit blur:', e.target.value);
                      handleLabelEdit(box.id, e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        console.log('Label edit enter:', e.currentTarget.value);
                        handleLabelEdit(box.id, e.currentTarget.value);
                      } else if (e.key === 'Escape') {
                        console.log('Label edit escape');
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
          );
        })}
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
        <div key={box.id} className="absolute">
          {/* Main bounding box */}
          <div
            className={`absolute border-2 transition-colors ${
              editable 
                ? 'border-primary hover:border-primary/80 cursor-move' 
                : 'border-blue-500'
            } ${editable ? 'bg-primary/10 hover:bg-primary/15' : 'bg-blue-500/10'}`}
            style={{
              left: `${box.x}px`,
              top: `${box.y}px`,
              width: `${box.width}px`,
              height: `${box.height}px`,
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
            className={`absolute px-2 py-1 text-xs font-medium rounded shadow-sm ${
              editable 
                ? 'bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90' 
                : 'bg-blue-500 text-white'
            }`}
            style={{
              left: `${box.x}px`,
              top: `${box.y - 28}px`,
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
import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DraggableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

const DraggableItem: React.FC<DraggableItemProps> = ({ id, children, className = '' }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${className} ${isDragging ? 'z-50' : ''}`}
      {...attributes}
    >
      <div {...listeners} className="w-full">
        {children}
      </div>
    </div>
  );
};

interface DraggableListProps<T> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  getItemId: (item: T) => string;
  className?: string;
}

const DraggableList = <T,>({
  items,
  onReorder,
  renderItem,
  getItemId,
  className = '',
}: DraggableListProps<T>) => {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(item => getItemId(item) === active.id);
      const newIndex = items.findIndex(item => getItemId(item) === over.id);
      
      const newItems = arrayMove(items, oldIndex, newIndex);
      onReorder(newItems);
    }
  };

  const activeItem = activeId ? items.find(item => getItemId(item) === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map(getItemId)} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map((item, index) => (
            <DraggableItem
              key={getItemId(item)}
              id={getItemId(item)}
              className="mb-3"
            >
              {renderItem(item, index)}
            </DraggableItem>
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeItem ? (
          <div className="opacity-90 rotate-2 scale-105">
            {renderItem(activeItem, items.findIndex(item => getItemId(item) === activeId!))}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default DraggableList;
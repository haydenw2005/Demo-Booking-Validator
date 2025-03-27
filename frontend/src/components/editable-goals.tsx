"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

// Sortable goal item component
const SortableGoalItem = ({
  id,
  goal,
  onChange,
  onRemove,
}: {
  id: string;
  goal: string;
  onChange: (value: string) => void;
  onRemove: () => void;
}) => {
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
      className={cn(
        "flex items-start gap-2 p-3 rounded-md border border-border bg-card transition-all",
        isDragging ? "z-10 shadow-lg" : ""
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab mt-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <GripVertical size={18} />
      </div>

      <Textarea
        value={goal}
        onChange={(e) => onChange(e.target.value)}
        className="flex-grow min-h-[80px] resize-y"
        placeholder="Enter your test goal here..."
      />

      <Button
        type="button"
        onClick={onRemove}
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
      >
        <Trash2 size={16} />
        <span className="sr-only">Remove goal</span>
      </Button>
    </div>
  );
};

interface EditableGoalsProps {
  initialGoals: string[];
  onGoalsChange: (goals: string[]) => void;
}

export default function EditableGoals({
  initialGoals,
  onGoalsChange,
}: EditableGoalsProps) {
  // Use the passed-in goals as state
  const [goals, setGoals] = useState(initialGoals);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setGoals((items) => {
        const oldIndex = items.findIndex((_, i) => `goal-${i}` === active.id);
        const newIndex = items.findIndex((_, i) => `goal-${i}` === over.id);

        const newGoals = arrayMove(items, oldIndex, newIndex);
        onGoalsChange(newGoals);
        return newGoals;
      });
    }
  };

  const handleGoalChange = (index: number, value: string) => {
    const newGoals = [...goals];
    newGoals[index] = value;
    setGoals(newGoals);
    onGoalsChange(newGoals);
  };

  const addGoal = () => {
    const newGoals = [...goals, ""];
    setGoals(newGoals);
    onGoalsChange(newGoals);
  };

  const removeGoal = (index: number) => {
    const newGoals = [...goals];
    newGoals.splice(index, 1);
    setGoals(newGoals);
    onGoalsChange(newGoals);
  };

  return (
    <Accordion type="single" collapsible className="w-full  mx-auto">
      <AccordionItem value="goals" className="border rounded-lg shadow-sm">
        <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:bg-muted/50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Pencil size={16} />
            <span>Edit Test Goals</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-3 mt-2">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={goals.map((_, i) => `goal-${i}`)}
                strategy={verticalListSortingStrategy}
              >
                {goals.map((goal, index) => (
                  <SortableGoalItem
                    key={`goal-${index}`}
                    id={`goal-${index}`}
                    goal={goal}
                    onChange={(value) => handleGoalChange(index, value)}
                    onRemove={() => removeGoal(index)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <div className="flex justify-center mt-4">
              <Button
                type="button"
                onClick={addGoal}
                variant="outline"
                className="group w-full bg-gray-100 transition-all duration-300 hover:bg-primary hover:text-primary-foreground"
              >
                <Plus
                  size={16}
                  className="mr-2 transition-transform group-hover:rotate-90"
                />
                Add Goal
              </Button>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

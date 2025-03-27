"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface TestProfile {
  [key: string]: string;
}

interface EditableProfileProps {
  initialProfile: TestProfile;
  onProfileChange: (profile: TestProfile) => void;
}

export default function EditableProfile({
  initialProfile,
  onProfileChange,
}: EditableProfileProps) {
  // Use the passed-in profile as state
  const [testProfile, setTestProfile] = useState<TestProfile>(initialProfile);

  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");

  const handleProfileChange = (field: string, value: string) => {
    const updatedProfile = {
      ...testProfile,
      [field]: value,
    };
    setTestProfile(updatedProfile);
    onProfileChange(updatedProfile);
  };

  const handleDeleteField = (fieldToDelete: string) => {
    const updatedProfile = { ...testProfile };
    delete updatedProfile[fieldToDelete];
    setTestProfile(updatedProfile);
    onProfileChange(updatedProfile);
  };

  const handleAddField = () => {
    if (newFieldName.trim() === "") return;

    // Convert to camelCase for consistency
    const camelCaseField = newFieldName
      .trim()
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
        index === 0 ? word.toLowerCase() : word.toUpperCase()
      )
      .replace(/\s+/g, "");

    const updatedProfile = {
      ...testProfile,
      [camelCaseField]: newFieldValue,
    };
    setTestProfile(updatedProfile);
    onProfileChange(updatedProfile);

    // Reset form
    setNewFieldName("");
    setNewFieldValue("");
  };

  // Helper function to format field names
  const formatFieldName = (field: string) => {
    return field
      .replace(/([A-Z])/g, " $1") // Insert space before capital letters
      .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
      .trim();
  };

  return (
    <Accordion type="single" collapsible className="w-full mx-auto">
      <AccordionItem value="profile" className="border rounded-lg shadow-sm">
        <AccordionTrigger className="px-4 py-3 text-sm font-medium hover:bg-muted/50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Pencil size={16} />
            <span>Edit Test Profile</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-4 mt-3">
            {Object.entries(testProfile).map(([field, value]) => (
              <div
                key={field}
                className="grid grid-cols-[1fr_2fr_auto] gap-4 items-center group"
              >
                <Label
                  htmlFor={`profile-${field}`}
                  className="text-sm font-medium capitalize"
                >
                  {formatFieldName(field)}:
                </Label>
                <Input
                  id={`profile-${field}`}
                  type="text"
                  value={value}
                  onChange={(e) => handleProfileChange(field, e.target.value)}
                  className="w-full transition-all focus:ring-2 focus:ring-offset-1 focus:ring-primary/50"
                  placeholder={`Enter ${formatFieldName(field).toLowerCase()}`}
                />
                <Button
                  type="button"
                  onClick={() => handleDeleteField(field)}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full opacity-70 hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <Trash2 size={16} />
                  <span className="sr-only">
                    Delete {formatFieldName(field)}
                  </span>
                </Button>
              </div>
            ))}

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="mt-4 w-full bg-gray-100 group transition-all duration-300 hover:bg-primary hover:text-primary-foreground"
                >
                  <Plus
                    size={16}
                    className="mr-2 transition-transform group-hover:rotate-90"
                  />
                  Add Field
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Profile Field</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="fieldName" className="text-right">
                      Field Name
                    </Label>
                    <Input
                      id="fieldName"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      className="col-span-3"
                      placeholder="e.g. Phone Number"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="fieldValue" className="text-right">
                      Value
                    </Label>
                    <Input
                      id="fieldValue"
                      value={newFieldValue}
                      onChange={(e) => setNewFieldValue(e.target.value)}
                      className="col-span-3"
                      placeholder="e.g. (555) 123-4567"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      Cancel
                    </Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button
                      type="button"
                      onClick={handleAddField}
                      disabled={!newFieldName.trim()}
                    >
                      Add Field
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

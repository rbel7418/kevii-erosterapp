
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { colorForCode } from "@/components/utils/colors";

export default function ShiftCodeDialog({ open, onClose, onSave, shiftCode }) {
  const [formData, setFormData] = useState({
    code: "",
    descriptor: "",
    finance_tag: "Billable",
    weighted_hours: 0,
    color: "#0d9488",
    is_active: true
  });

  useEffect(() => {
    if (shiftCode) {
      setFormData(shiftCode);
    } else {
      // Reset form when creating a new shift code
      setFormData({
        code: "",
        descriptor: "",
        finance_tag: "Billable",
        weighted_hours: 0,
        color: "#0d9488", // Default color
        is_active: true
      });
    }
  }, [shiftCode, open]); // Added 'open' to dependency array to reset when dialog opens for new creation

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      code: (formData.code || "").toUpperCase(),
      // If color is not explicitly set by the user, generate one
      color: formData.color && formData.color !== "#0d9488" // Check if it's the default color or if user picked one
               ? formData.color
               : colorForCode(formData.code)
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {shiftCode ? 'Edit Shift Code' : 'Add Shift Code'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Shift Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                placeholder="LD"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weighted_hours">Weighted Hours *</Label>
              <Input
                id="weighted_hours"
                type="number"
                step="0.5"
                min="0"
                value={formData.weighted_hours}
                onChange={(e) => setFormData({...formData, weighted_hours: parseFloat(e.target.value)})}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descriptor">Descriptor *</Label>
            <Textarea
              id="descriptor"
              value={formData.descriptor}
              onChange={(e) => setFormData({...formData, descriptor: e.target.value})}
              placeholder="LONG DAY"
              rows={2}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="finance_tag">Finance Tag *</Label>
              <Select
                value={formData.finance_tag}
                onValueChange={(value) => setFormData({...formData, finance_tag: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Billable">Billable</SelectItem>
                  <SelectItem value="Unbillable">Unbillable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Display Color</Label>
              <Input
                id="color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({...formData, color: e.target.value})}
                className="h-10"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit"
              className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
            >
              {shiftCode ? 'Update' : 'Create'} Shift Code
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

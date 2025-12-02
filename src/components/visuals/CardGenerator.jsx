import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VisualLibrary } from "@/entities/VisualLibrary";
import { User } from "@/entities/User";
import { Save, Trash2 } from "lucide-react";

export default function CardGenerator() {
  const [title, setTitle] = useState("Card Title");
  const [subtitle, setSubtitle] = useState("Subtitle text");
  const [value, setValue] = useState("100");
  const [titleSize, setTitleSize] = useState(24);
  const [titleColor, setTitleColor] = useState("#0f172a");
  const [valueSize, setValueSize] = useState(48);
  const [valueColor, setValueColor] = useState("#0b5ed7");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [borderColor, setBorderColor] = useState("#e2e8f0");

  const saveToLibrary = async () => {
    const visualName = prompt("Enter a name for this visual:");
    if (!visualName) return;

    const config = {
      title,
      subtitle,
      value,
      titleSize,
      titleColor,
      valueSize,
      valueColor,
      bgColor,
      borderColor
    };

    try {
      const user = await User.me();
      await VisualLibrary.create({
        user_email: user.email,
        visual_name: visualName,
        visual_type: "card",
        config_json: JSON.stringify(config),
        tags: ["card"]
      });
      alert("Saved to Visuals Library!");
    } catch (error) {
      alert("Error saving: " + error.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Controls */}
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label>Card Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div>
              <Label>Subtitle</Label>
              <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
            </div>

            <div>
              <Label>Value</Label>
              <Input value={value} onChange={(e) => setValue(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Title Size (px)</Label>
                <Input type="number" value={titleSize} onChange={(e) => setTitleSize(Number(e.target.value))} />
              </div>
              <div>
                <Label>Title Color</Label>
                <Input type="color" value={titleColor} onChange={(e) => setTitleColor(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Value Size (px)</Label>
                <Input type="number" value={valueSize} onChange={(e) => setValueSize(Number(e.target.value))} />
              </div>
              <div>
                <Label>Value Color</Label>
                <Input type="color" value={valueColor} onChange={(e) => setValueColor(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Background</Label>
                <Input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
              </div>
              <div>
                <Label>Border</Label>
                <Input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={saveToLibrary} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
            <Save className="w-4 h-4 mr-2" />
            Save to Library
          </Button>
          <Button variant="outline" className="flex-1">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Right: Preview */}
      <div>
        <div className="text-sm font-semibold text-slate-700 mb-3">Preview</div>
        <Card
          style={{
            backgroundColor: bgColor,
            borderColor: borderColor
          }}
          className="shadow-lg"
        >
          <CardContent className="p-6">
            <div style={{ color: titleColor, fontSize: `${titleSize}px` }} className="font-bold mb-1">
              {title}
            </div>
            <div className="text-slate-600 text-sm mb-4">{subtitle}</div>
            <div style={{ color: valueColor, fontSize: `${valueSize}px` }} className="font-bold">
              {value}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
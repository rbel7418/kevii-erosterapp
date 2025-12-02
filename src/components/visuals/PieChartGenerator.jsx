import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VisualLibrary } from "@/entities/VisualLibrary";
import { User } from "@/entities/User";
import { Save, Trash2 } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

export default function PieChartGenerator() {
  const [manualData, setManualData] = useState("Category,Value\nCategory A,30\nCategory B,45\nCategory C,25");
  const [chartType, setChartType] = useState("pie"); // "pie" or "donut"
  const [title, setTitle] = useState("Pie Chart Title");
  const [colors, setColors] = useState(["#0b5ed7", "#0ea5e9", "#8b5cf6", "#f59e0b", "#22c55e"]);

  const parseData = () => {
    const lines = manualData.trim().split("\n");
    if (lines.length < 2) return [];
    return lines.slice(1).map(line => {
      const [name, value] = line.split(",");
      return { name: name?.trim() || "", value: Number(value) || 0 };
    });
  };

  const data = parseData();

  const saveToLibrary = async () => {
    const visualName = prompt("Enter a name for this visual:");
    if (!visualName) return;

    const config = {
      chartType,
      title,
      colors,
      manualData
    };

    try {
      const user = await User.me();
      await VisualLibrary.create({
        user_email: user.email,
        visual_name: visualName,
        visual_type: chartType,
        config_json: JSON.stringify(config),
        tags: [chartType]
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
              <Label>Chart Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div>
              <Label>Chart Type</Label>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                  <SelectItem value="donut">Donut Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data (CSV format)</Label>
              <Textarea
                value={manualData}
                onChange={(e) => setManualData(e.target.value)}
                rows={8}
                className="font-mono text-xs"
                placeholder="Category,Value&#10;Category A,30&#10;Category B,45"
              />
              <div className="text-xs text-slate-500 mt-1">
                Format: Category,Value (one per line)
              </div>
            </div>

            <div>
              <Label>Colors</Label>
              <div className="flex gap-2 flex-wrap">
                {colors.map((color, idx) => (
                  <Input
                    key={idx}
                    type="color"
                    value={color}
                    onChange={(e) => {
                      const newColors = [...colors];
                      newColors[idx] = e.target.value;
                      setColors(newColors);
                    }}
                    className="w-16"
                  />
                ))}
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
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <div className="text-lg font-bold text-slate-900 mb-4">{title}</div>
            {data.length === 0 ? (
              <div className="text-slate-500 text-center py-8">No data to display</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={chartType === "donut" ? 60 : 0}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
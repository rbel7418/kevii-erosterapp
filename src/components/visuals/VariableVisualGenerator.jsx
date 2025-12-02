import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VisualLibrary } from "@/entities/VisualLibrary";
import { User, Employee, Shift, Department, Role, Leave } from "@/entities/all";
import { Save, Trash2, Database, RefreshCw } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

// Available entities for visualization
const AVAILABLE_ENTITIES = [
  { name: "Employee", label: "Employees", entity: Employee },
  { name: "Shift", label: "Shifts", entity: Shift },
  { name: "Department", label: "Departments", entity: Department },
  { name: "Role", label: "Roles", entity: Role },
  { name: "Leave", label: "Leave Requests", entity: Leave }
];

export default function VariableVisualGenerator({ variableCount }) {
  const [dataSource, setDataSource] = useState("manual");
  const [manualData, setManualData] = useState("Month,Value1,Value2,Value3\nJanuary,5,2,8\nFebruary,7,4,6\nMarch,6,3,9");
  const [chartType, setChartType] = useState("column");
  const [title, setTitle] = useState("Chart Title");
  const [colors, setColors] = useState(["#0b5ed7", "#0ea5e9", "#8b5cf6"]);

  // Database connection states
  const [selectedEntity, setSelectedEntity] = useState("");
  const [entityFields, setEntityFields] = useState([]);
  const [groupByField, setGroupByField] = useState("");
  const [aggregationType, setAggregationType] = useState("count"); // "count" | "sum" | "avg"
  const [valueFields, setValueFields] = useState([]);
  const [dbData, setDbData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load entity schema when selected
  useEffect(() => {
    if (!selectedEntity || dataSource !== "database") return;
    
    const entityObj = AVAILABLE_ENTITIES.find(e => e.name === selectedEntity);
    if (!entityObj) return;

    // Get schema
    const schema = entityObj.entity.schema();
    const fields = Object.keys(schema.properties || {});
    setEntityFields(fields);
    
    // Auto-select first field as group by
    if (fields.length > 0 && !groupByField) {
      setGroupByField(fields[0]);
    }
  }, [selectedEntity, dataSource, groupByField]);

  // Fetch and aggregate data from database
  const fetchDatabaseData = async () => {
    if (!selectedEntity || !groupByField) return;

    setLoading(true);
    try {
      const entityObj = AVAILABLE_ENTITIES.find(e => e.name === selectedEntity);
      if (!entityObj) return;

      // Fetch all records
      const records = await entityObj.entity.list();
      
      // Group by selected field
      const grouped = {};
      
      records.forEach(record => {
        const groupValue = record[groupByField] || "Undefined";
        
        if (!grouped[groupValue]) {
          grouped[groupValue] = {
            name: groupValue,
            count: 0,
            records: []
          };
        }
        
        grouped[groupValue].count += 1;
        grouped[groupValue].records.push(record);
      });

      // Convert to array format for charts
      const chartData = Object.values(grouped).map(group => {
        const item = { name: String(group.name) };
        
        if (aggregationType === "count") {
          item.Value1 = group.count;
        }
        
        // Add more value fields if needed
        if (valueFields.length > 0 && aggregationType !== "count") {
          valueFields.forEach((field, idx) => {
            const values = group.records.map(r => Number(r[field]) || 0).filter(v => !isNaN(v));
            
            if (aggregationType === "sum") {
              item[`Value${idx + 1}`] = values.reduce((a, b) => a + b, 0);
            } else if (aggregationType === "avg") {
              item[`Value${idx + 1}`] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
            }
          });
        }
        
        return item;
      });

      setDbData(chartData);
      
      // Auto-update title
      if (aggregationType === "count") {
        setTitle(`${selectedEntity} Count by ${groupByField}`);
      } else {
        setTitle(`${selectedEntity} ${aggregationType.toUpperCase()} by ${groupByField}`);
      }
      
    } catch (error) {
      console.error("Error fetching database data:", error);
      alert("Error fetching data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const parseManualData = () => {
    const lines = manualData.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].split(",");
    return lines.slice(1).map(line => {
      const values = line.split(",");
      const obj = {};
      headers.forEach((h, i) => {
        obj[h.trim()] = isNaN(values[i]) ? values[i] : Number(values[i]);
      });
      return obj;
    });
  };

  const data = dataSource === "database" ? dbData : parseManualData();
  const headers = data.length > 0 ? Object.keys(data[0]) : [];
  const xField = headers[0] || "";
  const yFields = headers.slice(1, variableCount + 1);

  const saveToLibrary = async () => {
    const visualName = prompt("Enter a name for this visual:");
    if (!visualName) return;

    const config = {
      chartType,
      title,
      colors,
      dataSource,
      manualData: dataSource === "manual" ? manualData : "",
      dbConfig: dataSource === "database" ? {
        entity: selectedEntity,
        groupByField,
        aggregationType,
        valueFields
      } : null,
      variableCount
    };

    try {
      const user = await User.me();
      await VisualLibrary.create({
        user_email: user.email,
        visual_name: visualName,
        visual_type: `${variableCount}variable`,
        config_json: JSON.stringify(config),
        tags: [`${variableCount}var`, chartType, dataSource]
      });
      alert("Saved to Visuals Library!");
    } catch (error) {
      alert("Error saving: " + error.message);
    }
  };

  const renderChart = () => {
    if (data.length === 0) return <div className="text-slate-500 text-center py-8">No data to display</div>;

    const commonProps = {
      data,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    if (chartType === "column") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xField} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yFields.map((field, idx) => (
              <Bar key={field} dataKey={field} fill={colors[idx % colors.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "line") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xField} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yFields.map((field, idx) => (
              <Line key={field} type="monotone" dataKey={field} stroke={colors[idx % colors.length]} strokeWidth={2} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "area") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xField} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yFields.map((field, idx) => (
              <Area key={field} type="monotone" dataKey={field} stroke={colors[idx % colors.length]} fill={colors[idx % colors.length]} fillOpacity={0.3} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === "bar") {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart {...commonProps} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey={xField} />
            <Tooltip />
            <Legend />
            {yFields.map((field, idx) => (
              <Bar key={field} dataKey={field} fill={colors[idx % colors.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return null;
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
              <Label>Data Source</Label>
              <Select value={dataSource} onValueChange={(val) => {
                setDataSource(val);
                if (val === "database") {
                  setDbData([]);
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Input</SelectItem>
                  <SelectItem value="database">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      App Database
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dataSource === "manual" && (
              <div>
                <Label>Data (CSV format)</Label>
                <Textarea
                  value={manualData}
                  onChange={(e) => setManualData(e.target.value)}
                  rows={8}
                  className="font-mono text-xs"
                  placeholder="Month,Value1,Value2,Value3&#10;January,5,2,8&#10;February,7,4,6"
                />
                <div className="text-xs text-slate-500 mt-1">
                  Format: First row = headers, following rows = data. Comma-separated.
                </div>
              </div>
            )}

            {dataSource === "database" && (
              <>
                <div>
                  <Label>Select Entity</Label>
                  <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose entity..." />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_ENTITIES.map(e => (
                        <SelectItem key={e.name} value={e.name}>{e.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedEntity && (
                  <>
                    <div>
                      <Label>Group By Field (X-Axis)</Label>
                      <Select value={groupByField} onValueChange={setGroupByField}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose field..." />
                        </SelectTrigger>
                        <SelectContent>
                          {entityFields.map(f => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-slate-500 mt-1">
                        Example: "department_id" will group by department
                      </div>
                    </div>

                    <div>
                      <Label>Aggregation Type</Label>
                      <Select value={aggregationType} onValueChange={setAggregationType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="count">COUNT (number of records)</SelectItem>
                          <SelectItem value="sum">SUM (total of field)</SelectItem>
                          <SelectItem value="avg">AVERAGE (mean of field)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      onClick={fetchDatabaseData} 
                      disabled={!groupByField || loading}
                      className="w-full bg-sky-600 hover:bg-sky-700"
                    >
                      {loading ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Loading...</>
                      ) : (
                        <><Database className="w-4 h-4 mr-2" /> Fetch Data</>
                      )}
                    </Button>

                    {dbData.length > 0 && (
                      <div className="text-xs text-emerald-600 bg-emerald-50 p-2 rounded">
                        ✓ Loaded {dbData.length} data points
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            <div>
              <Label>Chart Type</Label>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="column">Column Chart</SelectItem>
                  <SelectItem value="bar">Bar Chart (Horizontal)</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="area">Area Chart</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Colors</Label>
              <div className="flex gap-2">
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
          <Button onClick={saveToLibrary} className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={data.length === 0}>
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
            {renderChart()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
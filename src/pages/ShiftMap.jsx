
import React, { useState, useEffect, useCallback, useRef } from "react";
import { ShiftCode } from "@/entities/ShiftCode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Upload, Download, Pencil, Trash2, FileSpreadsheet, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { withRetry } from "@/components/utils/withRetry";
import { colorForCode } from "@/components/utils/colors";
import { downloadCsvTemplate } from "@/components/utils/csv"; // NEW: import the CSV template utility

import ShiftCodeDialog from "../components/shiftmap/ShiftCodeDialog";
import ShiftMapUploadDialog from "../components/shiftmap/ShiftMapUploadDialog";

export default function ShiftMap() {
  const [shiftCodes, setShiftCodes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false); // NEW: track first successful load

  // NEW: use a ref to guard overlapping fetches without causing useEffect loops
  const fetchingRef = useRef(false);

  const loadShiftCodes = useCallback(async (opts = {}) => {
    if (fetchingRef.current) return; // Prevent overlapping fetches
    fetchingRef.current = true;
    setIsFetching(true);

    const background = !!opts.background;
    // Only show the big loader before the first successful load
    if (!background && !hasLoaded) setIsLoading(true);

    try {
      const data = await withRetry(() => ShiftCode.list());
      const validCodes = data
        .filter(c => c && c.code)
        .sort((a, b) => {
          const codeA = String(a.code || "").toLowerCase();
          const codeB = String(b.code || "").toLowerCase();
          return codeA.localeCompare(codeB);
        });

      // Immediately render with local computed colors (no blocking)
      setShiftCodes(validCodes.map(sc => ({ ...sc, color: sc.color || colorForCode(sc.code) })));

      // Mark first load as completed
      if (!hasLoaded) {
        setHasLoaded(true);
        setIsLoading(false);
      }

      // BACKGROUND: backfill missing colors without toggling loading UI
      const toUpdate = validCodes.filter(c => !c.color).slice(0, 25);
      if (toUpdate.length) {
        Promise.allSettled(
          toUpdate.map(sc =>
            withRetry(() => ShiftCode.update(sc.id, { color: colorForCode(sc.code) }), { retries: 2, baseDelay: 500 })
          )
        ).then(() => {
          // Soft refresh after backfill; do not show spinner
          loadShiftCodes({ background: true });
        }).catch(() => {
          // ignore
        });
      }
    } catch (error) {
      console.error("Error loading shift codes:", error);
      // Keep existing content on error to avoid flicker
    } finally {
      if (!hasLoaded) setIsLoading(false); // Only set isLoading false if it was the initial load
      setIsFetching(false);
      fetchingRef.current = false;
    }
  }, [hasLoaded, setIsLoading, setShiftCodes, setIsFetching, setHasLoaded]); // include dependencies as they are stable or managed

  // UPDATED: include dependency to satisfy exhaustive-deps without refetch loops
  useEffect(() => {
    loadShiftCodes();
  }, [loadShiftCodes]); // include dependency as it's stable

  const handleSaveShift = async (shiftData) => {
    try {
      if (selectedShift) {
        await ShiftCode.update(selectedShift.id, shiftData);
      } else {
        await ShiftCode.create(shiftData);
      }
      setShowDialog(false);
      // Quiet refresh to avoid table flashing
      await loadShiftCodes({ background: true });
    } catch (error) {
      console.error("Error saving shift code:", error);
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (confirm("Are you sure you want to delete this shift code?")) {
      try {
        await ShiftCode.delete(shiftId);
        // Quiet refresh to avoid table flashing
        await loadShiftCodes({ background: true });
      } catch (error) {
        console.error("Error deleting shift code:", error);
      }
    }
  };

  const handleExport = () => {
    // NEW: export with requested headers and order
    const headers = ["code", "descriptor", "starttime", "endtime", "duration", "financeTag", "break_mins", "paidhours"];

    // helper to compute gross duration (in hours) from default start/end and break
    const grossDuration = (shift) => {
      const st = String(shift.default_start_time || "").trim();
      const et = String(shift.default_end_time || "").trim();
      if (!st || !et) return "";
      try {
        const [sh, sm] = st.split(":").map(Number);
        const [eh, em] = et.split(":").map(Number);
        let mins = (eh * 60 + em) - (sh * 60 + sm);
        if (mins <= 0) mins += 24 * 60; // overnight support
        // Return hours to 1 decimal
        return (Math.round((mins / 60) * 10) / 10).toString();
      } catch {
        return "";
      }
    };

    const rows = shiftCodes.map((shift) => {
      const duration = grossDuration(shift); // hours as string or ""
      return [
        `"${String(shift.code || "").replace(/"/g, '""')}"`, // Wrap in quotes and escape
        `"${String(shift.descriptor || "").replace(/"/g, '""')}"`, // Wrap in quotes and escape
        `"${String(shift.default_start_time || "").replace(/"/g, '""')}"`,
        `"${String(shift.default_end_time || "").replace(/"/g, '""')}"`,
        `"${String(duration).replace(/"/g, '""')}"`,
        `"${String(shift.finance_tag || "").replace(/"/g, '""')}"`,
        typeof shift.default_break_minutes === "number" ? shift.default_break_minutes : "",
        typeof shift.weighted_hours === "number" ? shift.weighted_hours : ""
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `shift_codes_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // NEW: download a blank CSV template with the exact headers (and only the header row)
  const handleDownloadTemplate = () => {
    downloadCsvTemplate("shift_code_template.csv", [
      "code",
      "descriptor",
      "starttime",
      "endtime",
      "duration",
      "financeTag",
      "break_mins",
      "paidhours"
    ]);
  };

  const filteredShifts = shiftCodes.filter(shift =>
    String(shift.code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(shift.descriptor || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const billableShifts = filteredShifts.filter(s => s.finance_tag === "Billable");
  const unbillableShifts = filteredShifts.filter(s => s.finance_tag === "Unbillable");
  const totalBillableHours = billableShifts.reduce((sum, s) => sum + (s.weighted_hours || 0), 0);
  const totalUnbillableHours = unbillableShifts.reduce((sum, s) => sum + (s.weighted_hours || 0), 0);

  return (
    <div className="p-6 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Shift Code Library</h1>
            <p className="text-slate-500 mt-2">Manage shift codes, finance tags, and weighted hours</p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {isFetching && hasLoaded && (
              <div className="flex items-center text-slate-500 text-sm mr-2">
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Refreshing…
              </div>
            )}
            <Button
              onClick={handleDownloadTemplate}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Template
            </Button>
            <Button
              onClick={() => setShowUploadDialog(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload
            </Button>
            <Button
              onClick={handleExport}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Button
              onClick={() => {
                setSelectedShift(null);
                setShowDialog(true);
              }}
              className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Shift Code
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Shift Codes</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{shiftCodes.length}</p>
                </div>
                <FileSpreadsheet className="w-10 h-10 text-teal-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Billable Shifts</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{billableShifts.length}</p>
                </div>
                <Badge className="bg-green-100 text-green-700 text-lg px-3 py-1">
                  {totalBillableHours}h
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Unbillable Shifts</p>
                  <p className="text-3xl font-bold text-orange-600 mt-1">{unbillableShifts.length}</p>
                </div>
                <Badge className="bg-orange-100 text-orange-700 text-lg px-3 py-1">
                  {totalUnbillableHours}h
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Avg Hours/Shift</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">
                    {shiftCodes.length > 0
                      ? ((totalBillableHours + totalUnbillableHours) / shiftCodes.length).toFixed(1)
                      : 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Search by shift code or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="border-b bg-slate-50">
            <CardTitle>Shift Codes ({filteredShifts.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-semibold">Shift Code</TableHead>
                    <TableHead className="font-semibold">Descriptor</TableHead>
                    <TableHead className="font-semibold">Finance Tag</TableHead>
                    <TableHead className="font-semibold text-right">Weighted Hours</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                        Loading shift codes...
                      </TableCell>
                    </TableRow>
                  ) : filteredShifts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                        No shift codes found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredShifts.map((shift) => (
                      <TableRow
                        key={shift.id}
                        className="hover:bg-slate-50 transition-colors"
                        style={{
                          backgroundColor: shift.finance_tag === "Unbillable" ? "#FFF7ED" : "white"
                        }}
                      >
                        <TableCell className="font-bold text-slate-900 flex items-center gap-2">
                          <span style={{ backgroundColor: shift.color }} className="w-3 h-3 rounded-full inline-block"></span>
                          {shift.code}
                        </TableCell>
                        <TableCell className="font-medium text-slate-700">
                          {shift.descriptor}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            shift.finance_tag === "Billable"
                              ? "bg-green-100 text-green-700 border-green-200"
                              : "bg-orange-100 text-orange-700 border-orange-200"
                          }>
                            {shift.finance_tag}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-900">
                          {shift.weighted_hours}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedShift(shift);
                                setShowDialog(true);
                              }}
                            >
                              <Pencil className="w-4 h-4 text-slate-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteShift(shift.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {showDialog && (
          <ShiftCodeDialog
            open={showDialog}
            onClose={() => setShowDialog(false)}
            onSave={handleSaveShift}
            shiftCode={selectedShift}
          />
        )}

        {showUploadDialog && (
          <ShiftMapUploadDialog
            open={showUploadDialog}
            onClose={() => setShowUploadDialog(false)}
            onUpload={loadShiftCodes}
          />
        )}
      </div>
    </div>
  );
}

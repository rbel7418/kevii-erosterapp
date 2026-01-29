import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { 
  extractSpreadsheetId, 
  fetchSpreadsheetInfo,
  importShiftCodes,
  importStaffMaster,
  importMonthlyRoster 
} from '@/api/googleSheets';

export default function GoogleSheetsImportDialog({ open, onOpenChange, onImportComplete }) {
  const [step, setStep] = useState(1);
  const [docId, setDocId] = useState('');
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [importType, setImportType] = useState('roster');
  const [rosterYear, setRosterYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [fetchingSheets, setFetchingSheets] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setResult(null);
      setError(null);
    }
  }, [open]);

  const handleFetchSheets = async () => {
    if (!docId.trim()) {
      setError('Please enter a Google Sheet Document ID');
      return;
    }
    
    const spreadsheetId = docId.includes('/') ? extractSpreadsheetId(docId) : docId.trim();
    if (!spreadsheetId) {
      setError('Invalid Document ID. Copy the ID from your Google Sheets URL.');
      return;
    }

    setFetchingSheets(true);
    setError(null);
    
    try {
      const sheets = await fetchSpreadsheetInfo(spreadsheetId);
      setAvailableSheets(sheets);
      if (sheets.length === 1) {
        setSelectedSheet(sheets[0].title);
      } else if (sheets.length > 1) {
        setSelectedSheet('');
      }
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to fetch sheets. Check the document ID and try again.');
    } finally {
      setFetchingSheets(false);
    }
  };

  const handleImport = async () => {
    if (!selectedSheet) {
      setError('Please select a sheet');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const spreadsheetId = docId.includes('/') ? extractSpreadsheetId(docId) : docId.trim();

    try {
      let importResult;
      
      switch (importType) {
        case 'shift-codes':
          importResult = await importShiftCodes(spreadsheetId, selectedSheet);
          setResult({
            type: 'shift-codes',
            message: `Imported ${importResult.total} shift codes (${importResult.created} new, ${importResult.updated} updated)`
          });
          break;
          
        case 'staff':
          importResult = await importStaffMaster(spreadsheetId, selectedSheet);
          setResult({
            type: 'staff',
            message: `Imported ${importResult.total} staff (${importResult.created} new, ${importResult.updated} updated)`
          });
          break;
          
        case 'roster':
        default:
          importResult = await importMonthlyRoster(spreadsheetId, selectedSheet, rosterYear);
          setResult({
            type: 'roster',
            message: `Imported ${importResult.totalShifts} shifts for ${importResult.totalEmployees} employees`
          });
          break;
      }
      
      setStep(3);
      
      if (onImportComplete) {
        onImportComplete(importType, importResult);
      }
    } catch (err) {
      setError(err.message || 'Import failed. Please check your data format.');
    } finally {
      setLoading(false);
    }
  };

  const resetDialog = () => {
    setStep(1);
    setDocId('');
    setAvailableSheets([]);
    setSelectedSheet('');
    setResult(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) resetDialog();
      onOpenChange(v);
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Import from Google Sheets
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Enter your Google Sheet document ID to get started."}
            {step === 2 && "Select the sheet and import type."}
            {step === 3 && "Import completed successfully!"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Google Sheet Document ID</Label>
                <Input
                  placeholder="e.g., 1PHguOkySVqAyks7p5Uzq4KBidwNhCKuVb1J4gdAKhNQ"
                  value={docId}
                  onChange={(e) => setDocId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchSheets()}
                />
                <p className="text-xs text-slate-500">
                  Find this in your Google Sheets URL after /d/ and before /edit
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Select Sheet</Label>
                <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a sheet..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSheets.map(sheet => (
                      <SelectItem key={sheet.sheetId} value={sheet.title}>
                        {sheet.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Import Type</Label>
                <Select value={importType} onValueChange={setImportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="roster">Monthly Roster (shifts grid)</SelectItem>
                    <SelectItem value="shift-codes">Shift Codes (hours table)</SelectItem>
                    <SelectItem value="staff">Staff Master List</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {importType === 'roster' && (
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select value={rosterYear.toString()} onValueChange={(v) => setRosterYear(parseInt(v))}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027].map(y => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </>
          )}

          {step === 3 && result && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">{result.message}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step === 1 && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleFetchSheets} 
                disabled={fetchingSheets || !docId.trim()}
              >
                {fetchingSheets ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-2" />
                )}
                Next
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={loading || !selectedSheet}
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Import Shifts
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                Import Another
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

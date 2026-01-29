import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileSpreadsheet, Users, Calendar, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { 
  extractSpreadsheetId, 
  fetchSpreadsheetInfo,
  importShiftCodes,
  importStaffMaster,
  importMonthlyRoster 
} from '@/api/googleSheets';

export default function GoogleSheetsImportDialog({ open, onOpenChange, onImportComplete }) {
  const [activeTab, setActiveTab] = useState('shift-codes');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [rosterYear, setRosterYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [fetchingSheets, setFetchingSheets] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFetchSheets = async () => {
    if (!spreadsheetUrl) return;
    
    const spreadsheetId = extractSpreadsheetId(spreadsheetUrl);
    if (!spreadsheetId) {
      setError('Invalid Google Sheets URL. Please paste the full URL from your browser.');
      return;
    }

    setFetchingSheets(true);
    setError(null);
    
    try {
      const sheets = await fetchSpreadsheetInfo(spreadsheetId);
      setAvailableSheets(sheets);
      if (sheets.length > 0) {
        setSelectedSheet(sheets[0].title);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setFetchingSheets(false);
    }
  };

  const handleImport = async () => {
    if (!spreadsheetUrl || !selectedSheet) {
      setError('Please provide a spreadsheet URL and select a sheet.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let importResult;
      
      switch (activeTab) {
        case 'shift-codes':
          importResult = await importShiftCodes(spreadsheetUrl, selectedSheet);
          setResult({
            type: 'shift-codes',
            message: `Imported ${importResult.total} shift codes (${importResult.created} new, ${importResult.updated} updated)`
          });
          break;
          
        case 'staff':
          importResult = await importStaffMaster(spreadsheetUrl, selectedSheet);
          setResult({
            type: 'staff',
            message: `Imported ${importResult.total} staff members (${importResult.created} new, ${importResult.updated} updated, ${importResult.deptsCreated} departments created)`
          });
          break;
          
        case 'roster':
          importResult = await importMonthlyRoster(spreadsheetUrl, selectedSheet, parseInt(rosterYear));
          setResult({
            type: 'roster',
            message: `Imported ${importResult.totalShifts} shifts for ${importResult.totalEmployees} employees (${importResult.shiftsCreated} new shifts, ${importResult.shiftsUpdated} updated, ${importResult.empsCreated} new employees)`
          });
          break;
      }
      
      if (onImportComplete) {
        onImportComplete(activeTab, importResult);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setResult(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) resetState();
      onOpenChange(v);
    }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Import from Google Sheets
          </DialogTitle>
          <DialogDescription>
            Import shift codes, staff data, or monthly rosters directly from your Google Sheets.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); resetState(); }}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="shift-codes" className="gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Shift Codes
            </TabsTrigger>
            <TabsTrigger value="staff" className="gap-2">
              <Users className="w-4 h-4" />
              Staff List
            </TabsTrigger>
            <TabsTrigger value="roster" className="gap-2">
              <Calendar className="w-4 h-4" />
              Monthly Roster
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Google Sheets URL</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={spreadsheetUrl}
                  onChange={(e) => setSpreadsheetUrl(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  onClick={handleFetchSheets}
                  disabled={fetchingSheets || !spreadsheetUrl}
                >
                  {fetchingSheets ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {availableSheets.length > 0 && (
              <div className="space-y-2">
                <Label>Select Sheet</Label>
                <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sheet" />
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
            )}

            <TabsContent value="shift-codes" className="mt-0">
              <Alert>
                <AlertDescription>
                  <strong>Expected columns:</strong> shift_code, descriptor, time_from, time_to, hours, category, finance_tag, is_worked, day_night
                  <br />
                  <span className="text-muted-foreground text-sm">Only "shift_code" is required. Other columns are optional.</span>
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="staff" className="mt-0">
              <Alert>
                <AlertDescription>
                  <strong>Expected columns:</strong> employee_id, name, job_title, department, reports_to, contract_type, contracted_hours
                  <br />
                  <span className="text-muted-foreground text-sm">"employee_id" and "name" are required. New departments will be created automatically.</span>
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="roster" className="mt-0 space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>Expected format:</strong> Grid with EMP_ID, DEPT, NAME columns followed by date columns (e.g., 6-Oct, 7-Oct)
                  <br />
                  <span className="text-muted-foreground text-sm">Each cell contains a shift code. Empty cells or placeholders will be skipped.</span>
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label>Year for date columns</Label>
                <Select value={rosterYear} onValueChange={setRosterYear}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Alert className="mt-4 border-green-200 bg-green-50">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">{result.message}</AlertDescription>
            </Alert>
          )}
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={loading || !spreadsheetUrl || !selectedSheet}
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Import {activeTab === 'shift-codes' ? 'Shift Codes' : activeTab === 'staff' ? 'Staff' : 'Roster'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

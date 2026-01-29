import { useState, useEffect } from 'react';
import { X, Save, Trash2, Plus, Search } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ShiftCodeRecord {
  shiftCode: string;
  descriptor: string;
  financeTag: string;
  from: string;
  to: string;
  hours: string;
  category: string;
  isWorked: string;
  dayNight: string;
}

interface ShiftCodesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShiftCodesDialog({ isOpen, onClose }: ShiftCodesDialogProps) {
  const [shiftRecords, setShiftRecords] = useState<ShiftCodeRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ShiftCodeRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedRecord, setEditedRecord] = useState<ShiftCodeRecord | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchShiftRecords();
    }
  }, [isOpen]);

  useEffect(() => {
    // Filter records based on search query
    if (searchQuery.trim() === '') {
      setFilteredRecords(shiftRecords);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = shiftRecords.filter(record => 
        record.shiftCode.toLowerCase().includes(query) ||
        record.descriptor.toLowerCase().includes(query) ||
        record.category.toLowerCase().includes(query) ||
        record.financeTag.toLowerCase().includes(query)
      );
      setFilteredRecords(filtered);
    }
  }, [searchQuery, shiftRecords]);

  const fetchShiftRecords = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b07c7a84/get-hours`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const result = await response.json();
      console.log('📡 Fetched shift code records:', result);

      if (response.ok && result.success) {
        setShiftRecords(result.data || []);
      } else {
        console.error('Failed to fetch shift code records:', result.error);
      }
    } catch (error) {
      console.error('Error fetching shift code records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditedRecord({ ...shiftRecords[index] });
  };

  const handleSave = async () => {
    if (editingIndex === null || !editedRecord) return;

    setIsSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b07c7a84/update-shift`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ 
            shiftCode: editedRecord.shiftCode,
            updates: editedRecord 
          })
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        const updatedRecords = [...shiftRecords];
        updatedRecords[editingIndex] = editedRecord;
        setShiftRecords(updatedRecords);
        setEditingIndex(null);
        setEditedRecord(null);
      } else {
        console.error('Failed to update record:', result.error);
        alert('Failed to save changes: ' + result.error);
      }
    } catch (error: any) {
      console.error('Error saving record:', error);
      alert('Failed to save changes: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setEditedRecord(null);
  };

  const handleDelete = async (shiftCode: string, index: number) => {
    if (!confirm('Are you sure you want to delete this shift code?')) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b07c7a84/delete-shift`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ shiftCode })
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        const updatedRecords = shiftRecords.filter((_, i) => i !== index);
        setShiftRecords(updatedRecords);
      } else {
        console.error('Failed to delete record:', result.error);
        alert('Failed to delete: ' + result.error);
      }
    } catch (error: any) {
      console.error('Error deleting record:', error);
      alert('Failed to delete: ' + error.message);
    }
  };

  const handleAddNew = () => {
    const newRecord: ShiftCodeRecord = {
      shiftCode: '',
      descriptor: '',
      financeTag: '',
      from: '',
      to: '',
      hours: '',
      category: '',
      isWorked: '',
      dayNight: ''
    };
    setShiftRecords([newRecord, ...shiftRecords]);
    setEditingIndex(0);
    setEditedRecord(newRecord);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--color-background)',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--color-border)',
        background: 'linear-gradient(to right, var(--color-card), var(--color-muted))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <h2 style={{
            fontFamily: 'var(--font-heading-3)',
            fontSize: 'var(--text-heading-3)',
            fontWeight: 'var(--text-heading-3--font-weight)',
            color: 'var(--color-card-foreground)',
            margin: 0
          }}>Shift Codes Editor</h2>
          <p className="text-caption" style={{ 
            color: 'var(--color-muted-foreground)',
            marginTop: '4px'
          }}>
            View and edit shift code database records
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-accent-foreground)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600
            }}
            onClick={handleAddNew}
          >
            <Plus style={{ width: '16px', height: '16px' }} />
            Add Shift Code
          </button>
          <button
            style={{
              padding: '8px 12px',
              backgroundColor: 'transparent',
              border: '1px solid var(--color-border)',
              color: 'var(--color-card-foreground)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer'
            }}
            onClick={onClose}
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        padding: '24px'
      }}>
        {isLoading ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '48px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '3px solid var(--color-border)',
              borderTopColor: 'var(--color-accent)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        ) : (
          <div style={{
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden'
          }}>
            <div style={{ 
              padding: '12px 16px', 
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shift codes..."
                style={{
                  padding: '6px 8px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-body)',
                  backgroundColor: 'var(--color-card)',
                  flex: 1,
                  marginRight: '12px'
                }}
              />
              <Search style={{ width: '16px', height: '16px', color: 'var(--color-card-foreground)' }} />
            </div>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontFamily: 'var(--font-body)'
            }}>
              <thead>
                <tr style={{
                  backgroundColor: 'var(--color-muted)',
                  borderBottom: '1px solid var(--color-border)'
                }}>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left',
                    fontFamily: 'var(--font-body-bold)',
                    fontSize: 'var(--text-caption)',
                    fontWeight: 'var(--text-caption--font-weight)',
                    color: 'var(--color-card-foreground)'
                  }}>Shift Code</th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left',
                    fontFamily: 'var(--font-body-bold)',
                    fontSize: 'var(--text-caption)',
                    fontWeight: 'var(--text-caption--font-weight)',
                    color: 'var(--color-card-foreground)'
                  }}>Descriptor</th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left',
                    fontFamily: 'var(--font-body-bold)',
                    fontSize: 'var(--text-caption)',
                    fontWeight: 'var(--text-caption--font-weight)',
                    color: 'var(--color-card-foreground)'
                  }}>Finance Tag</th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left',
                    fontFamily: 'var(--font-body-bold)',
                    fontSize: 'var(--text-caption)',
                    fontWeight: 'var(--text-caption--font-weight)',
                    color: 'var(--color-card-foreground)'
                  }}>From</th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left',
                    fontFamily: 'var(--font-body-bold)',
                    fontSize: 'var(--text-caption)',
                    fontWeight: 'var(--text-caption--font-weight)',
                    color: 'var(--color-card-foreground)'
                  }}>To</th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left',
                    fontFamily: 'var(--font-body-bold)',
                    fontSize: 'var(--text-caption)',
                    fontWeight: 'var(--text-caption--font-weight)',
                    color: 'var(--color-card-foreground)'
                  }}>Hours</th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left',
                    fontFamily: 'var(--font-body-bold)',
                    fontSize: 'var(--text-caption)',
                    fontWeight: 'var(--text-caption--font-weight)',
                    color: 'var(--color-card-foreground)'
                  }}>Category</th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left',
                    fontFamily: 'var(--font-body-bold)',
                    fontSize: 'var(--text-caption)',
                    fontWeight: 'var(--text-caption--font-weight)',
                    color: 'var(--color-card-foreground)'
                  }}>Is Worked</th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'left',
                    fontFamily: 'var(--font-body-bold)',
                    fontSize: 'var(--text-caption)',
                    fontWeight: 'var(--text-caption--font-weight)',
                    color: 'var(--color-card-foreground)'
                  }}>Day/Night</th>
                  <th style={{ 
                    padding: '12px 16px', 
                    textAlign: 'right',
                    fontFamily: 'var(--font-body-bold)',
                    fontSize: 'var(--text-caption)',
                    fontWeight: 'var(--text-caption--font-weight)',
                    color: 'var(--color-card-foreground)'
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record, index) => (
                  <tr key={index} style={{
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor: editingIndex === index ? 'var(--color-muted)' : 'transparent'
                  }}>
                    <td style={{ padding: '12px 16px' }}>
                      {editingIndex === index ? (
                        <input
                          type="text"
                          value={editedRecord?.shiftCode || ''}
                          onChange={(e) => setEditedRecord({ ...editedRecord!, shiftCode: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            fontFamily: 'var(--font-body)',
                            fontSize: 'var(--text-body)',
                            backgroundColor: 'var(--color-card)'
                          }}
                        />
                      ) : (
                        <span className="text-body" style={{ color: 'var(--color-card-foreground)' }}>
                          {record.shiftCode}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {editingIndex === index ? (
                        <input
                          type="text"
                          value={editedRecord?.descriptor || ''}
                          onChange={(e) => setEditedRecord({ ...editedRecord!, descriptor: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            fontFamily: 'var(--font-body)',
                            fontSize: 'var(--text-body)',
                            backgroundColor: 'var(--color-card)'
                          }}
                        />
                      ) : (
                        <span className="text-body" style={{ color: 'var(--color-card-foreground)' }}>
                          {record.descriptor}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {editingIndex === index ? (
                        <input
                          type="text"
                          value={editedRecord?.financeTag || ''}
                          onChange={(e) => setEditedRecord({ ...editedRecord!, financeTag: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            fontFamily: 'var(--font-body)',
                            fontSize: 'var(--text-body)',
                            backgroundColor: 'var(--color-card)'
                          }}
                        />
                      ) : (
                        <span className="text-body" style={{ color: 'var(--color-card-foreground)' }}>
                          {record.financeTag}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {editingIndex === index ? (
                        <input
                          type="text"
                          value={editedRecord?.from || ''}
                          onChange={(e) => setEditedRecord({ ...editedRecord!, from: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            fontFamily: 'var(--font-body)',
                            fontSize: 'var(--text-body)',
                            backgroundColor: 'var(--color-card)'
                          }}
                        />
                      ) : (
                        <span className="text-body" style={{ color: 'var(--color-card-foreground)' }}>
                          {record.from}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {editingIndex === index ? (
                        <input
                          type="text"
                          value={editedRecord?.to || ''}
                          onChange={(e) => setEditedRecord({ ...editedRecord!, to: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            fontFamily: 'var(--font-body)',
                            fontSize: 'var(--text-body)',
                            backgroundColor: 'var(--color-card)'
                          }}
                        />
                      ) : (
                        <span className="text-body" style={{ color: 'var(--color-card-foreground)' }}>
                          {record.to}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {editingIndex === index ? (
                        <input
                          type="text"
                          value={editedRecord?.hours || ''}
                          onChange={(e) => setEditedRecord({ ...editedRecord!, hours: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            fontFamily: 'var(--font-body)',
                            fontSize: 'var(--text-body)',
                            backgroundColor: 'var(--color-card)'
                          }}
                        />
                      ) : (
                        <span className="text-body" style={{ color: 'var(--color-card-foreground)' }}>
                          {record.hours}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {editingIndex === index ? (
                        <input
                          type="text"
                          value={editedRecord?.category || ''}
                          onChange={(e) => setEditedRecord({ ...editedRecord!, category: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            fontFamily: 'var(--font-body)',
                            fontSize: 'var(--text-body)',
                            backgroundColor: 'var(--color-card)'
                          }}
                        />
                      ) : (
                        <span className="text-body" style={{ color: 'var(--color-card-foreground)' }}>
                          {record.category}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {editingIndex === index ? (
                        <input
                          type="text"
                          value={editedRecord?.isWorked || ''}
                          onChange={(e) => setEditedRecord({ ...editedRecord!, isWorked: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            fontFamily: 'var(--font-body)',
                            fontSize: 'var(--text-body)',
                            backgroundColor: 'var(--color-card)'
                          }}
                        />
                      ) : (
                        <span className="text-body" style={{ color: 'var(--color-card-foreground)' }}>
                          {record.isWorked}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {editingIndex === index ? (
                        <input
                          type="text"
                          value={editedRecord?.dayNight || ''}
                          onChange={(e) => setEditedRecord({ ...editedRecord!, dayNight: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            fontFamily: 'var(--font-body)',
                            fontSize: 'var(--text-body)',
                            backgroundColor: 'var(--color-card)'
                          }}
                        />
                      ) : (
                        <span className="text-body" style={{ color: 'var(--color-card-foreground)' }}>
                          {record.dayNight}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {editingIndex === index ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={handleSave}
                            disabled={isSaving}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: 'var(--color-accent)',
                              color: 'var(--color-accent-foreground)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: isSaving ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: 'var(--text-caption)',
                              fontWeight: 600
                            }}
                          >
                            <Save style={{ width: '14px', height: '14px' }} />
                            {isSaving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={handleCancel}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: 'var(--color-muted)',
                              color: 'var(--color-card-foreground)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              fontSize: 'var(--text-caption)'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleEdit(index)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: 'var(--color-muted)',
                              color: 'var(--color-card-foreground)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              fontSize: 'var(--text-caption)'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(record.shiftCode, index)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: 'transparent',
                              color: 'var(--color-destructive)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Trash2 style={{ width: '14px', height: '14px' }} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRecords.length === 0 && !isLoading && (
              <div style={{ 
                padding: '48px', 
                textAlign: 'center',
                color: 'var(--color-muted-foreground)' 
              }}>
                No shift code records found. Upload a CSV file or add a new shift code.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
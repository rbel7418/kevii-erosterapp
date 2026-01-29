import { useState, useEffect } from 'react';
import { MessageSquare, Clock, User, Send } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { BaseDialog, DialogActions, Button } from './ui/BaseDialog';

interface ShiftCommentsDialogProps {
  show: boolean;
  onClose: () => void;
  empId: string;
  date: string;
  shiftCode: string;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  createdBy: string;
}

export function ShiftCommentsDialog({ show, onClose, empId, date, shiftCode, addToast }: ShiftCommentsDialogProps) {
  const [activeTab, setActiveTab] = useState<'comments' | 'revisions'>('comments');
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (show) {
      loadComments();
    }
  }, [show, empId, date]);

  const loadComments = async () => {
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b07c7a84/get-shift-comments?empId=${empId}&date=${date}`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      if (res.ok) {
        const { comments: c } = await res.json();
        setComments(c || []);
      }
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      addToast('❌ Enter a comment', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-b07c7a84/add-shift-comment`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empId,
          date,
          shiftCode,
          comment: newComment.trim()
        })
      });

      if (res.ok) {
        addToast('✅ Comment added', 'success');
        setNewComment('');
        await loadComments();
      } else {
        throw new Error('Failed to add comment');
      }
    } catch (err) {
      addToast('❌ Failed to add comment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <BaseDialog
      show={show}
      onClose={onClose}
      title="Shift Details & Comments"
      maxWidth="max-w-3xl"
    >
      {/* Shift Info Banner */}
      <div className="flex items-center gap-3 px-6 py-4 bg-neutral-50 border-b border-solid border-neutral-border">
        <div className="px-3 py-1 bg-brand-primary text-white rounded text-body-bold font-body-bold">
          {shiftCode}
        </div>
        <div className="flex items-center gap-1.5 text-caption font-caption text-subtext-color">
          <Clock className="w-3.5 h-3.5" />
          {formattedDate}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-solid border-neutral-border">
        <button
          onClick={() => setActiveTab('comments')}
          className={`flex-1 px-6 py-3 text-body-bold font-body-bold border-b-2 transition-all ${
            activeTab === 'comments'
              ? 'border-brand-primary text-brand-primary bg-brand-50'
              : 'border-transparent text-default-font hover:bg-neutral-50'
          }`}
        >
          <MessageSquare className="w-4 h-4 inline mr-1.5" />
          Comments ({comments.length})
        </button>
        <button
          onClick={() => setActiveTab('revisions')}
          className={`flex-1 px-6 py-3 text-body-bold font-body-bold border-b-2 transition-all ${
            activeTab === 'revisions'
              ? 'border-brand-primary text-brand-primary bg-brand-50'
              : 'border-transparent text-default-font hover:bg-neutral-50'
          }`}
        >
          History
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-6 min-h-[300px] max-h-[500px] overflow-y-auto">
        {activeTab === 'comments' && (
          <div className="space-y-6">
            {/* Add Comment Section */}
            <div className="p-4 bg-neutral-50 border border-solid border-neutral-border rounded-md">
              <label className="block mb-2 text-body-bold font-body-bold text-default-font">
                Add a Comment
              </label>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Type your comment here..."
                rows={3}
                className="w-full px-3 py-2 mb-3 bg-white border border-solid border-neutral-border rounded-md text-body font-body text-default-font resize-vertical"
              />
              <Button
                variant="brand-primary"
                onClick={handleAddComment}
                disabled={isSubmitting || !newComment.trim()}
                icon={<Send className="w-4 h-4" />}
              >
                {isSubmitting ? 'Adding...' : 'Add Comment'}
              </Button>
            </div>

            {/* Comments List */}
            {comments.length === 0 ? (
              <div className="text-center py-12 text-caption font-caption text-subtext-color">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
                No comments yet. Be the first to add one!
              </div>
            ) : (
              <div className="space-y-3">
                {comments.map(comment => (
                  <div
                    key={comment.id}
                    className="p-4 bg-white border border-solid border-neutral-border rounded-md shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-brand-50 border border-solid border-brand-200 flex items-center justify-center">
                        <User className="w-4 h-4 text-brand-700" />
                      </div>
                      <div className="flex-1">
                        <div className="text-caption-bold font-caption-bold text-default-font">
                          {comment.createdBy}
                        </div>
                        <div className="text-caption font-caption text-subtext-color">
                          {comment.createdAt}
                        </div>
                      </div>
                    </div>
                    <div className="text-body font-body text-default-font leading-relaxed">
                      {comment.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'revisions' && (
          <div className="text-center py-12 text-caption font-caption text-subtext-color">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
            No revision history available
          </div>
        )}
      </div>

      <DialogActions>
        <Button variant="neutral-secondary" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </BaseDialog>
  );
}

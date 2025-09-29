import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  Plus,
  Send,
  Trash2,
  Users,
  User,
  Calendar,
  Eye
} from 'lucide-react';
import { addNotice, getMembers, getAllNotices } from '@/lib/firestoreServices';
import { Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export const NoticesManagement = () => {
  const [notices, setNotices] = useState<any[]>([]);
  const [approvedMembers, setApprovedMembers] = useState<any[]>([]);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const { toast } = useToast();

  const [noticeForm, setNoticeForm] = useState({
    title: '',
    message: '',
    target: 'all',
    selectedMembers: [] as string[]
  });

  useEffect(() => {
    const unsubscribeMembers = getMembers((users) => {
      setApprovedMembers(users.filter(u => u.approved));
    });

    const unsubscribeNotices = getAllNotices((notices) => {
      setNotices(notices);
    });

    return () => {
      unsubscribeMembers();
      unsubscribeNotices();
    };
  }, []);

  const handleSendNotice = async () => {
    try {
      if (!noticeForm.title || !noticeForm.message) {
        toast({ title: "Error", description: "Please fill all fields.", variant: "destructive" });
        return;
      }
      const target = noticeForm.target === 'all' ? 'all' : noticeForm.selectedMembers;
      await addNotice({
        title: noticeForm.title,
        message: noticeForm.message,
        target,
        sentBy: 'admin',
        sentAt: Timestamp.now()
      });
      setIsSendDialogOpen(false);
      setNoticeForm({ title: '', message: '', target: 'all', selectedMembers: [] });
      toast({ title: "Success", description: `Notice sent to ${noticeForm.target === 'all' ? 'all members' : 'selected members'}.` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to send notice.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notices Management</h1>
          <p className="text-muted-foreground">Send announcements and updates to society members</p>
        </div>
        <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary shadow-primary">
              <Plus className="w-4 h-4 mr-2" />
              Send Notice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Send Notice to Members</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={noticeForm.title}
                  onChange={(e) => setNoticeForm({...noticeForm, title: e.target.value})}
                  placeholder="Notice title"
                />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={noticeForm.message}
                  onChange={(e) => setNoticeForm({...noticeForm, message: e.target.value})}
                  placeholder="Notice content"
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="noticeTarget">Send to</Label>
                <Select value={noticeForm.target} onValueChange={(value) => setNoticeForm({...noticeForm, target: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    <SelectItem value="specific">Specific Members</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {noticeForm.target === 'specific' && (
                <div>
                  <Label>Select Members</Label>
                  <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-2">
                    {approvedMembers.map((member) => (
                      <div key={member.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`notice-member-${member.id}`}
                          checked={noticeForm.selectedMembers.includes(member.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNoticeForm({...noticeForm, selectedMembers: [...noticeForm.selectedMembers, member.id]});
                            } else {
                              setNoticeForm({...noticeForm, selectedMembers: noticeForm.selectedMembers.filter(id => id !== member.id)});
                            }
                          }}
                        />
                        <Label htmlFor={`notice-member-${member.id}`}>{member.fullName} (Flat {member.flatNumber})</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Button onClick={handleSendNotice} className="w-full">Send Notice</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Notices</p>
              <p className="text-2xl font-bold">{notices.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-success rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sent Today</p>
              <p className="text-2xl font-bold">
                {notices.filter(n => {
                  const today = new Date().toDateString();
                  return n.sentAt?.toDate().toDateString() === today;
                }).length}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-warning rounded-xl flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Read Rate</p>
              <p className="text-2xl font-bold">N/A</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Notices */}
      <Card>
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold">Recent Notices ({notices.length})</h2>
        </div>
        <div className="p-6">
          {notices.length > 0 ? (
            <div className="space-y-4">
              {notices.slice(0, 5).map((notice) => (
                <Card key={notice.id} className="p-4 border-l-4 border-l-blue-500">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">{notice.title}</h3>
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{notice.message}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Sent: {notice.sentAt?.toDate().toLocaleDateString()}</span>
                        <span>Target: {notice.target === 'all' ? 'All Members' : `${Array.isArray(notice.target) ? notice.target.length : 1} Member(s)`}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-4">
                      {notice.sentBy}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No notices sent yet</h3>
              <p className="text-muted-foreground">Send your first notice to keep members informed.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
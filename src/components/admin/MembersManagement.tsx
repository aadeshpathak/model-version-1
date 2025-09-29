import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Edit, Trash2, Plus, Users, UserCheck, UserX, Clock, Check, X, CheckCircle } from 'lucide-react';
import { getMembers, addMember, updateMember, deleteMember, approveMember, dismissMember, banMember } from '@/lib/firestoreServices';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/firestoreServices';

export const MembersManagement = () => {
  const [members, setMembers] = useState<User[]>([]);
  const [pendingMembers, setPendingMembers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [pendingEditingMember, setPendingEditingMember] = useState<User | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    flatNumber: '',
    role: 'member' as 'member' | 'admin',
  });

  useEffect(() => {
    const unsubscribe = getMembers((users) => {
      setMembers(users.filter(u => u.approved && !u.dismissed));
      setPendingMembers(users.filter(u => !u.approved && !u.dismissed));
    });
    return unsubscribe;
  }, []);

  const filteredMembers = members.filter(member => {
    const matchesSearch = (member.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (member.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (member.flatNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || member.role === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const resetForm = () => {
    setFormData({
      email: '',
      fullName: '',
      phone: '',
      flatNumber: '',
      role: 'member',
    });
    setEditingMember(null);
    setPendingEditingMember(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToAdd = {
        email: formData.email,
        fullName: formData.fullName,
        phone: formData.phone,
        flatNumber: formData.flatNumber,
        role: formData.role,
        approved: false,
        dismissed: false,
        bannedUntil: null,
        lastLogin: null,
      };
      if (editingMember) {
        await updateMember(editingMember.id, dataToAdd);
        toast({
          title: "Member Updated",
          description: "Member information has been updated successfully.",
        });
      } else {
        await addMember(dataToAdd);
        toast({
          title: "Member Added",
          description: "New member has been added successfully.",
        });
      }
      resetForm();
      setIsAddDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while saving member information.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (member: User) => {
    setFormData({
      email: member.email,
      fullName: member.fullName,
      phone: member.phone,
      flatNumber: member.flatNumber,
      role: member.role,
    });
    setEditingMember(member);
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this member?')) {
      await deleteMember(id);
      toast({
        title: "Member Deleted",
        description: "Member has been removed successfully.",
      });
    }
  };

  const handleApprove = async (id: string) => {
    await approveMember(id);
    toast({
      title: "Member Approved",
      description: "Member has been approved.",
    });
  };

  const handleDismiss = async (id: string) => {
    if (window.confirm('Are you sure you want to dismiss this member?')) {
      await dismissMember(id);
      toast({
        title: "Member Dismissed",
        description: "Member request has been dismissed.",
      });
    }
  };

  const handleBan = async (id: string, days: number = 7) => {
    if (window.confirm(`Ban this member for ${days} days?`)) {
      await banMember(id, days);
      toast({
        title: "Member Banned",
        description: "Member has been banned.",
      });
    }
  };

  const handlePendingEdit = (member: User) => {
    setFormData({
      email: member.email,
      fullName: member.fullName,
      phone: member.phone,
      flatNumber: member.flatNumber,
      role: member.role,
    });
    setPendingEditingMember(member);
    setIsAddDialogOpen(true);
  };

  const getStatusIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Users className="w-4 h-4 text-blue-600" />;
      case 'member': return <CheckCircle className="w-4 h-4 text-green-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Members Management</h1>
          <p className="text-muted-foreground">Manage society members and their details</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingMember ? 'Edit Member' : 'Add New Member'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="flatNumber">Flat Number</Label>
                <Input
                  id="flatNumber"
                  value={formData.flatNumber}
                  onChange={(e) => setFormData({...formData, flatNumber: e.target.value})}
                  placeholder="e.g., A-201"
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value: any) => setFormData({...formData, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  {editingMember ? 'Update' : 'Add'} Member
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Members</p>
              <p className="text-2xl font-bold">{members.length + pendingMembers.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold">{members.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-600 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{pendingMembers.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
              <UserX className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Banned</p>
              <p className="text-2xl font-bold">{members.filter(m => m.bannedUntil && (m.bannedUntil as any).toDate() > new Date()).length}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search members by name, email, or flat number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card>
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold">Approved Members ({filteredMembers.length})</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Name</TableHead>
              <TableHead className="w-[200px]">Email</TableHead>
              <TableHead className="w-[100px]">Flat</TableHead>
              <TableHead className="w-[120px]">Phone</TableHead>
              <TableHead className="w-[80px]">Role</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.map((member) => (
              <TableRow key={member.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{member.fullName}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>{member.flatNumber}</TableCell>
                <TableCell>{member.phone}</TableCell>
                <TableCell>
                  <Badge variant={member.role === 'admin' ? "default" : "secondary"} >
                    {getStatusIcon(member.role)}
                    {member.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(member)}>
                      <Edit className="w-4 h-4" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleBan(member.id, 7)} className="text-destructive">
                      <UserX className="w-4 h-4" />
                      Ban
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(member.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredMembers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No approved members found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {pendingMembers.length > 0 && (
        <Card>
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold">Pending Members ({pendingMembers.length})</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Name</TableHead>
                <TableHead className="w-[200px]">Email</TableHead>
                <TableHead className="w-[100px]">Flat</TableHead>
                <TableHead className="w-[120px]">Phone</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingMembers.map((member) => (
                <TableRow key={member.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{member.fullName}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>{member.flatNumber}</TableCell>
                  <TableCell>{member.phone}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleApprove(member.id)}>
                        <CheckCircle className="w-4 h-4" />
                        Approve
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDismiss(member.id)} className="text-orange-600">
                        <X className="w-4 h-4" />
                        Dismiss
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handlePendingEdit(member)}>
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(member.id)} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

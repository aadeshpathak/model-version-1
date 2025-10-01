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
import MobileCard from '@/components/ui/MobileCard';
import { motion } from 'framer-motion';

export const MembersManagement = () => {
  const [allMembers, setAllMembers] = useState<User[]>([]);
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
      setAllMembers(users);
      setMembers(users.filter(u => u.approved && !u.dismissed && u.role !== 'admin'));
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
      if (editingMember) {
        const dataToUpdate: any = {
          email: formData.email,
          fullName: formData.fullName,
          phone: formData.phone,
          flatNumber: formData.flatNumber,
          role: formData.role,
        };
        // Preserve existing fields that are not being updated
        if (editingMember.approved !== undefined) {
          dataToUpdate.approved = editingMember.approved;
        }
        if (editingMember.dismissed !== undefined) {
          dataToUpdate.dismissed = editingMember.dismissed;
        }
        if (editingMember.bannedUntil !== undefined && editingMember.bannedUntil !== null) {
          dataToUpdate.bannedUntil = editingMember.bannedUntil;
        }
        if (editingMember.lastLogin !== undefined && editingMember.lastLogin !== null) {
          dataToUpdate.lastLogin = editingMember.lastLogin;
        }
        await updateMember(editingMember.id, dataToUpdate);
        toast({
          title: "Member Updated",
          description: "Member information has been updated successfully.",
        });
      } else {
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
        await addMember(dataToAdd);
        toast({
          title: "Member Added",
          description: "New member has been added successfully.",
        });
      }
      resetForm();
      setIsAddDialogOpen(false);
    } catch (error: any) {
      console.error('Member save error:', error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while saving member information.",
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

  // Mobile Members Management
  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden min-h-screen bg-white overflow-x-hidden">
        <motion.div
          className="bg-white shadow-sm p-6 border-b"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-xl font-bold text-gray-900">Members</h1>
          <p className="text-sm text-gray-600">Manage society members</p>
        </motion.div>

        <div className="p-4 space-y-6">
          {/* Stats Carousel */}
          <motion.div
            className="overflow-x-auto pb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <div className="flex gap-4 w-max">
              <MobileCard className="w-32 text-center flex-shrink-0">
                <div className="text-xl font-bold text-blue-600">{members.length + pendingMembers.length}</div>
                <div className="text-xs text-gray-600 mt-1">Total</div>
              </MobileCard>
              <MobileCard className="w-32 text-center flex-shrink-0">
                <div className="text-xl font-bold text-green-600">{members.length}</div>
                <div className="text-xs text-gray-600 mt-1">Approved</div>
              </MobileCard>
              <MobileCard className="w-32 text-center flex-shrink-0">
                <div className="text-xl font-bold text-yellow-600">{pendingMembers.length}</div>
                <div className="text-xs text-gray-600 mt-1">Pending</div>
              </MobileCard>
              <MobileCard className="w-32 text-center flex-shrink-0">
                <div className="text-xl font-bold text-red-600">{members.filter(m => m.bannedUntil && (m.bannedUntil as any).toDate() > new Date()).length}</div>
                <div className="text-xs text-gray-600 mt-1">Banned</div>
              </MobileCard>
            </div>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </motion.div>

          {/* Add Member Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-blue-500 text-white py-3 rounded-2xl font-medium">
                  <Plus className="w-5 h-5 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md mx-4">
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
          </motion.div>

          {/* Approved Members */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Approved Members ({filteredMembers.length})</h2>
            <div className="max-h-96 overflow-y-auto space-y-3">
              {filteredMembers.map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
                >
                  <MobileCard>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{member.fullName}</h3>
                        <p className="text-xs text-gray-600">{member.email}</p>
                        <p className="text-xs text-gray-600">Flat: {member.flatNumber} • {member.phone}</p>
                        <Badge variant={member.role === 'admin' ? "default" : "secondary"} className="mt-1">
                          {member.role}
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-2">
                        <motion.button
                          className="p-2 bg-blue-500 text-white rounded-lg"
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleEdit(member)}
                        >
                          <Edit size={16} />
                        </motion.button>
                        <motion.button
                          className="p-2 bg-red-500 text-white rounded-lg"
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleBan(member.id, 7)}
                        >
                          <UserX size={16} />
                        </motion.button>
                      </div>
                    </div>
                  </MobileCard>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Pending Members */}
          {pendingMembers.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Pending Members ({pendingMembers.length})</h2>
              <div className="max-h-96 overflow-y-auto space-y-3">
                {pendingMembers.map((member, index) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1, duration: 0.3 }}
                  >
                    <MobileCard>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">{member.fullName}</h3>
                          <p className="text-xs text-gray-600">{member.email}</p>
                          <p className="text-xs text-gray-600">Flat: {member.flatNumber} • {member.phone}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <motion.button
                            className="p-2 bg-green-500 text-white rounded-lg"
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleApprove(member.id)}
                          >
                            <CheckCircle size={16} />
                          </motion.button>
                          <motion.button
                            className="p-2 bg-orange-500 text-white rounded-lg"
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDismiss(member.id)}
                          >
                            <X size={16} />
                          </motion.button>
                          <motion.button
                            className="p-2 bg-red-500 text-white rounded-lg"
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDelete(member.id)}
                          >
                            <Trash2 size={16} />
                          </motion.button>
                        </div>
                      </div>
                    </MobileCard>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block space-y-6">
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
    </>
  );
};

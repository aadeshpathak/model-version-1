import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Receipt, 
  Plus, 
  Search,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building,
  Zap,
  Shield,
  Droplets,
  Wrench,
  Truck,
  Users2
} from 'lucide-react';
import { getAllExpenses, addExpense, type Expense } from '@/lib/firestoreServices';
import { useToast } from '@/hooks/use-toast';
import MobileCard from '@/components/ui/MobileCard';
import { motion } from 'framer-motion';

const expenseCategories = [
  { value: 'electricity', label: 'Electricity', icon: Zap, color: 'bg-yellow-500' },
  { value: 'security', label: 'Security', icon: Shield, color: 'bg-blue-500' },
  { value: 'water', label: 'Water', icon: Droplets, color: 'bg-cyan-500' },
  { value: 'maintenance', label: 'Maintenance', icon: Wrench, color: 'bg-orange-500' },
  { value: 'cleaning', label: 'Cleaning', icon: Building, color: 'bg-green-500' },
  { value: 'garbage', label: 'Garbage Collection', icon: Truck, color: 'bg-gray-500' },
  { value: 'staff', label: 'Staff Salary', icon: Users2, color: 'bg-purple-500' },
  { value: 'other', label: 'Other', icon: Receipt, color: 'bg-gray-400' }
];

export const ExpenseManagement = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear().toString(),
    vendor: '',
    target: 'all' as 'all' | string[]
  });

  useEffect(() => {
    const unsubscribe = getAllExpenses(setExpenses);
    return unsubscribe;
  }, []);

  const loadExpenses = () => {
    // Expenses are loaded via useEffect with getAllExpenses
  };

  const resetForm = () => {
    setFormData({
      category: '',
      description: '',
      amount: '',
      month: new Date().toLocaleString('default', { month: 'long' }),
      year: new Date().getFullYear().toString(),
      vendor: '',
      target: 'all'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const amount = parseFloat(formData.amount);
      if (!amount || amount <= 0) {
        toast({
          title: "Error",
          description: "Please enter a valid amount greater than 0.",
          variant: "destructive",
        });
        return;
      }

      addExpense({
        category: formData.category,
        amount,
        vendor: formData.vendor,
        description: formData.description || undefined,
        month: formData.month,
        year: parseInt(formData.year),
        target: formData.target
      });

      toast({
        title: "Expense Added",
        description: "Expense has been recorded successfully.",
      });

      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while adding the expense.",
        variant: "destructive",
      });
    }
  };

  // Filter expenses
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = (expense.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          expense.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          expense.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || expense.category.toLowerCase() === categoryFilter;

    const matchesMonth = monthFilter === 'all' || expense.month === monthFilter;

    return matchesSearch && matchesCategory && matchesMonth;
  });

  // Calculate stats
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear();
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonthIndex = new Date().getMonth();
  const lastMonthIndex = currentMonthIndex === 0 ? 11 : currentMonthIndex - 1;
  const lastMonth = months[lastMonthIndex];
  const lastMonthYear = currentMonthIndex === 0 ? currentYear - 1 : currentYear;

  const currentMonthExpenses = expenses.filter(e =>
    e.month === currentMonth && e.year === currentYear
  );

  const lastMonthExpenses = expenses.filter(e =>
    e.month === lastMonth && e.year === lastMonthYear
  );

  const stats = {
    total: filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0),
    currentMonth: currentMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0),
    lastMonth: lastMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0),
    count: filteredExpenses.length
  };

  const monthlyChange = stats.lastMonth > 0
    ? ((stats.currentMonth - stats.lastMonth) / stats.lastMonth) * 100
    : (stats.currentMonth > 0 ? 100 : 0);

  // Category-wise breakdown
  const categoryBreakdown = expenseCategories.map(category => {
    const categoryExpenses = filteredExpenses.filter(e => 
      e.category.toLowerCase() === category.value
    );
    return {
      ...category,
      amount: categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0),
      count: categoryExpenses.length
    };
  }).filter(category => category.amount > 0);

  const getCategoryIcon = (category: string) => {
    const found = expenseCategories.find(cat => cat.value === category.toLowerCase());
    return found ? found.icon : Receipt;
  };

  const getCategoryColor = (category: string) => {
    const found = expenseCategories.find(cat => cat.value === category.toLowerCase());
    return found ? found.color : 'bg-gray-400';
  };

  // Mobile View
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
          <h1 className="text-xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-600">Track society expenses</p>
        </motion.div>

        <div className="p-4 space-y-6 pb-24">
          {/* Stats Cards */}
          <motion.div
            className="grid grid-cols-2 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <MobileCard className="text-center">
              <div className="text-2xl font-bold text-red-600">₹{stats.total.toLocaleString()}</div>
              <div className="text-xs text-gray-600 mt-1">Total Expenses</div>
            </MobileCard>
            <MobileCard className="text-center">
              <div className="text-2xl font-bold text-orange-600">₹{stats.currentMonth.toLocaleString()}</div>
              <div className="text-xs text-gray-600 mt-1">This Month</div>
            </MobileCard>
            <MobileCard className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.count}</div>
              <div className="text-xs text-gray-600 mt-1">Total Count</div>
            </MobileCard>
            <MobileCard className="text-center">
              <div className={`text-2xl font-bold ${monthlyChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {monthlyChange >= 0 ? '+' : ''}{monthlyChange.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600 mt-1">Monthly Change</div>
            </MobileCard>
          </motion.div>

          {/* Add Expense Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-orange-500 text-white py-3 rounded-2xl font-medium">
                  <Plus className="w-5 h-5 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md mx-4">
                <DialogHeader>
                  <DialogTitle>Add New Expense</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map(category => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Enter expense description"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      placeholder="Enter amount"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="month">Month</Label>
                      <Select value={formData.month} onValueChange={(value) => setFormData({...formData, month: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map(month => (
                            <SelectItem key={month} value={month}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="year">Year</Label>
                      <Input
                        id="year"
                        type="number"
                        value={formData.year}
                        onChange={(e) => setFormData({...formData, year: e.target.value})}
                        min="2020"
                        max="2030"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="vendor">Vendor/Payee</Label>
                    <Input
                      id="vendor"
                      value={formData.vendor}
                      onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                      placeholder="Enter vendor name"
                      required
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">
                      Add Expense
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </motion.div>

          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {expenseCategories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {months.map(month => (
                      <SelectItem key={month} value={month}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>

          {/* Expenses List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Expenses ({filteredExpenses.length})</h2>
            <div className="max-h-96 overflow-y-auto space-y-3">
              {filteredExpenses.map((expense, index) => {
                const IconComponent = getCategoryIcon(expense.category);
                return (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.05, duration: 0.3 }}
                  >
                    <MobileCard>
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`w-10 h-10 ${getCategoryColor(expense.category)} rounded-xl flex items-center justify-center flex-shrink-0`}>
                            <IconComponent className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{expense.description}</h3>
                            <p className="text-xs text-gray-600 truncate">{expense.vendor}</p>
                            <p className="text-xs text-gray-600">{expense.month} {expense.year}</p>
                            <Badge variant="outline" className="text-xs mt-1 capitalize">
                              {expense.category}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right ml-2">
                          <p className="font-bold text-lg text-red-600">-₹{expense.amount.toLocaleString()}</p>
                        </div>
                      </div>
                    </MobileCard>
                  </motion.div>
                );
              })}
            </div>
            {filteredExpenses.length === 0 && (
              <div className="text-center py-8">
                <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No expenses found</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expense Management</h1>
          <p className="text-muted-foreground">Track and manage society expenses</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary shadow-primary" onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Enter expense description"
                  required
                />
              </div>
              <div>
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="month">Month</Label>
                  <Select value={formData.month} onValueChange={(value) => setFormData({...formData, month: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map(month => (
                        <SelectItem key={month} value={month}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({...formData, year: e.target.value})}
                    min="2020"
                    max="2030"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="vendor">Vendor/Payee</Label>
                <Input
                  id="vendor"
                  value={formData.vendor}
                  onChange={(e) => setFormData({...formData, vendor: e.target.value})}
                  placeholder="Enter vendor name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="target">Target</Label>
                <Select value={formData.target === 'all' ? 'all' : 'specific'} onValueChange={(value) => setFormData({...formData, target: value === 'all' ? 'all' : []})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    <SelectItem value="specific">Specific Members</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-gradient-primary">
                  Add Expense
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-2xl font-bold">₹{stats.total.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-warning rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold">₹{stats.currentMonth.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${monthlyChange >= 0 ? 'bg-gradient-danger' : 'bg-gradient-success'} rounded-xl flex items-center justify-center`}>
              {monthlyChange >= 0 ? (
                <TrendingUp className="w-5 h-5 text-white" />
              ) : (
                <TrendingDown className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monthly Change</p>
              <p className={`text-2xl font-bold ${monthlyChange >= 0 ? 'text-danger' : 'text-success'}`}>
                {monthlyChange >= 0 ? '+' : ''}{monthlyChange.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-secondary rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Per Expense</p>
              <p className="text-2xl font-bold">
                ₹{stats.count > 0 ? Math.round(stats.total / stats.count).toLocaleString() : '0'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Category Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {categoryBreakdown.map((category) => {
            const IconComponent = category.icon;
            return (
              <div key={category.value} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <div className={`w-10 h-10 ${category.color} rounded-xl flex items-center justify-center`}>
                  <IconComponent className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium">{category.label}</p>
                  <p className="text-lg font-bold">₹{category.amount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{category.count} expenses</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by description, vendor, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {expenseCategories.map(category => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {months.map(month => (
                <SelectItem key={month} value={month}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Expenses List */}
      <Card>
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold">Expenses List ({filteredExpenses.length})</h2>
        </div>
        <div className="divide-y divide-border">
          {filteredExpenses.map((expense) => {
            const IconComponent = getCategoryIcon(expense.category);
            return (
              <div key={expense.id} className="p-6 hover:bg-muted/50 transition-smooth">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${getCategoryColor(expense.category)} rounded-xl flex items-center justify-center`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{expense.description}</h3>
                        <Badge variant="outline" className="capitalize">
                          {expense.category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{expense.vendor}</span>
                        <span>{expense.month} {expense.year}</span>
                        <span>Created: {expense.createdAt?.toDate().toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl text-danger">-₹{expense.amount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{expense.category}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {filteredExpenses.length === 0 && (
          <div className="p-12 text-center">
            <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No expenses found</h3>
            <p className="text-muted-foreground">No expenses match your current search criteria.</p>
          </div>
        )}
      </Card>
    </div>
  );
    </>
  );
};
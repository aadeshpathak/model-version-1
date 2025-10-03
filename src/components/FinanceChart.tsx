import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Bar, Pie, Doughnut, Line, Scatter } from 'react-chartjs-2';
import { getSocietyStats, getRecentExpenses, getMembers, getRecentBills } from '@/lib/firestoreServices';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

interface FinanceChartProps {
  visualizationType?: string;
  selectedMonth?: string;
}

export const FinanceChart = ({ visualizationType = 'overview', selectedMonth = 'all' }: FinanceChartProps) => {
  const [chartData, setChartData] = useState({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Income',
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        backgroundColor: 'hsl(212 100% 50% / 0.8)',
        borderColor: 'hsl(212 100% 50%)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
      {
        label: 'Expenses',
        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        backgroundColor: 'hsl(38 92% 50% / 0.8)',
        borderColor: 'hsl(38 92% 50%)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  });

  const [pieChartData, setPieChartData] = useState({
    labels: [],
    datasets: [{
      data: [],
      backgroundColor: [],
      borderColor: [],
      borderWidth: 2,
    }],
  });

  const [chartType, setChartType] = useState<'bar' | 'pie' | 'doughnut' | 'line' | 'area'>('bar');
  const [lineChartData, setLineChartData] = useState({
    labels: [],
    datasets: [],
  });

  useEffect(() => {
    let unsubscribeStats: () => void;
    let unsubscribeExpenses: () => void;
    let unsubscribeMembers: () => void;

    const setupChart = async () => {
      // Determine chart type based on visualization
      let newChartType: 'bar' | 'pie' | 'doughnut' | 'line' | 'area' = 'bar';

      if (visualizationType === 'visualizations') {
        newChartType = 'pie';
      } else if (visualizationType === 'insight') {
        newChartType = 'doughnut';
      } else if (visualizationType === 'trends') {
        newChartType = 'line';
      } else if (visualizationType === 'comparison') {
        newChartType = 'area';
      }

      setChartType(newChartType);

      if (newChartType === 'bar') {
        // Bar chart logic
        unsubscribeStats = getSocietyStats((stats) => {
          const currentMonth = new Date().getMonth();
          const incomeData = Array(12).fill(0);
          const expenseData = Array(12).fill(0);

          incomeData[currentMonth] = stats.totalCollection || 0;
          expenseData[currentMonth] = stats.totalExpenses || 0;

          let datasets = [];
          let labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

          if (selectedMonth !== 'all') {
            const monthIndex = labels.indexOf(selectedMonth);
            if (monthIndex !== -1) {
              labels = [selectedMonth];
              incomeData.splice(0, monthIndex);
              incomeData.splice(1);
              expenseData.splice(0, monthIndex);
              expenseData.splice(1);
            }
          }

          if (visualizationType === 'revenue') {
            datasets = [{
              label: 'Income',
              data: incomeData,
              backgroundColor: 'hsl(212 100% 50% / 0.8)',
              borderColor: 'hsl(212 100% 50%)',
              borderWidth: 2,
              borderRadius: 8,
              borderSkipped: false,
            }];
          } else if (visualizationType === 'expenses') {
            datasets = [{
              label: 'Expenses',
              data: expenseData,
              backgroundColor: 'hsl(38 92% 50% / 0.8)',
              borderColor: 'hsl(38 92% 50%)',
              borderWidth: 2,
              borderRadius: 8,
              borderSkipped: false,
            }];
          } else {
            datasets = [
              {
                label: 'Income',
                data: incomeData,
                backgroundColor: 'hsl(212 100% 50% / 0.8)',
                borderColor: 'hsl(212 100% 50%)',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
              },
              {
                label: 'Expenses',
                data: expenseData,
                backgroundColor: 'hsl(38 92% 50% / 0.8)',
                borderColor: 'hsl(38 92% 50%)',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
              },
            ];
          }

          setChartData({ labels, datasets });
        });
      } else {
        // Pie chart logic
        const pieDataPromises = [];

        if (visualizationType === 'visualizations') {
          // Expense breakdown pie chart with month filtering
          pieDataPromises.push(
            new Promise<void>((resolve) => {
              unsubscribeExpenses = getRecentExpenses((expenses) => {
                let filteredExpenses = expenses;

                // Filter by selected month if not 'all'
                if (selectedMonth !== 'all') {
                  filteredExpenses = expenses.filter(expense => {
                    let expenseDate: Date;
                    if (expense.createdAt && typeof expense.createdAt === 'object' && 'toDate' in expense.createdAt) {
                      // Firebase Timestamp
                      expenseDate = (expense.createdAt as any).toDate();
                    } else {
                      // Regular Date, string, or number - convert to unknown first
                      expenseDate = new Date(expense.createdAt as unknown as string | number | Date);
                    }
                    const expenseMonth = expenseDate.toLocaleString('default', { month: 'long' });
                    return expenseMonth === selectedMonth;
                  });
                }

                const categoryTotals: { [key: string]: number } = {};
                filteredExpenses.forEach(expense => {
                  categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
                });

                const labels = Object.keys(categoryTotals);
                const data = Object.values(categoryTotals);
                const colors = [
                  'hsl(212 100% 50%)', // Blue
                  'hsl(38 92% 50%)',   // Orange
                  'hsl(142 76% 36%)',  // Green
                  'hsl(321 100% 50%)', // Pink
                  'hsl(271 81% 56%)',  // Purple
                  'hsl(48 96% 53%)',   // Yellow
                  'hsl(197 71% 73%)',  // Cyan
                  'hsl(280 100% 65%)', // Magenta
                ];

                setPieChartData({
                  labels,
                  datasets: [{
                    data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderColor: colors.slice(0, labels.length).map(color => color.replace('50%', '60%')),
                    borderWidth: 2,
                  }],
                });
                resolve();
              });
            })
          );
        } else if (visualizationType === 'insight') {
          // Member status doughnut chart
          pieDataPromises.push(
            new Promise<void>((resolve) => {
              unsubscribeMembers = getMembers((members) => {
                const approved = members.filter(m => m.approved).length;
                const pending = members.filter(m => !m.approved && !m.dismissed).length;
                const dismissed = members.filter(m => m.dismissed).length;

                const labels = ['Approved Members', 'Pending Approval', 'Dismissed'];
                const data = [approved, pending, dismissed];
                const colors = [
                  'hsl(142 76% 36%)',  // Green for approved
                  'hsl(38 92% 50%)',   // Orange for pending
                  'hsl(0 84% 60%)',    // Red for dismissed
                ];

                setPieChartData({
                  labels,
                  datasets: [{
                    data,
                    backgroundColor: colors,
                    borderColor: colors.map(color => color.replace('50%', '60%')),
                    borderWidth: 2,
                  }],
                });
                resolve();
              });
            })
          );
        } else if (visualizationType === 'trends') {
          // Line chart for financial trends
          pieDataPromises.push(
            new Promise<void>((resolve) => {
              unsubscribeStats = getSocietyStats((stats) => {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const incomeData = months.map((_, index) => index === new Date().getMonth() ? stats.totalCollection || 0 : 0);
                const expenseData = months.map((_, index) => index === new Date().getMonth() ? stats.totalExpenses || 0 : 0);

                setLineChartData({
                  labels: months,
                  datasets: [
                    {
                      label: 'Income',
                      data: incomeData,
                      borderColor: 'hsl(212 100% 50%)',
                      backgroundColor: 'hsl(212 100% 50% / 0.1)',
                      tension: 0.4,
                      fill: false,
                    },
                    {
                      label: 'Expenses',
                      data: expenseData,
                      borderColor: 'hsl(38 92% 50%)',
                      backgroundColor: 'hsl(38 92% 50% / 0.1)',
                      tension: 0.4,
                      fill: false,
                    },
                  ],
                });
                resolve();
              });
            })
          );
        } else if (visualizationType === 'comparison') {
          // Area chart for comparison
          pieDataPromises.push(
            new Promise<void>((resolve) => {
              unsubscribeStats = getSocietyStats((stats) => {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const incomeData = months.map((_, index) => index === new Date().getMonth() ? stats.totalCollection || 0 : 0);
                const expenseData = months.map((_, index) => index === new Date().getMonth() ? stats.totalExpenses || 0 : 0);

                setLineChartData({
                  labels: months,
                  datasets: [
                    {
                      label: 'Income',
                      data: incomeData,
                      borderColor: 'hsl(212 100% 50%)',
                      backgroundColor: 'hsl(212 100% 50% / 0.3)',
                      tension: 0.4,
                      fill: true,
                    },
                    {
                      label: 'Expenses',
                      data: expenseData,
                      borderColor: 'hsl(38 92% 50%)',
                      backgroundColor: 'hsl(38 92% 50% / 0.3)',
                      tension: 0.4,
                      fill: true,
                    },
                  ],
                });
                resolve();
              });
            })
          );
        }

        await Promise.all(pieDataPromises);
      }
    };

    setupChart();

    return () => {
      if (unsubscribeStats) unsubscribeStats();
      if (unsubscribeExpenses) unsubscribeExpenses();
      if (unsubscribeMembers) unsubscribeMembers();
    };
  }, [visualizationType, selectedMonth]);

  const data = chartData;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            family: 'Inter, sans-serif',
            size: 12,
            weight: 'normal' as const,
          },
          color: 'hsl(215.4 16.3% 46.9%)',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'hsl(214.3 31.8% 91.4%)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ₹${context.parsed.y.toLocaleString()}`;
          }
        }
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'hsl(215.4 16.3% 46.9%)',
          font: {
            family: 'Inter, sans-serif',
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'hsl(214.3 31.8% 91.4% / 0.5)',
        },
        ticks: {
          color: 'hsl(215.4 16.3% 46.9%)',
          font: {
            family: 'Inter, sans-serif',
            size: 11,
          },
          callback: function(value: any) {
            return '₹' + (value / 1000).toFixed(0) + 'K';
          }
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            family: 'Inter, sans-serif',
            size: window.innerWidth < 640 ? 10 : 12,
            weight: 'normal' as const,
          },
          color: 'hsl(215.4 16.3% 46.9%)',
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'hsl(214.3 31.8% 91.4%)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            return `${label}: ₹${value.toLocaleString()} (${percentage}%)`;
          }
        }
      },
    },
  };

  return (
    <div className="h-full w-full min-h-[200px] overflow-hidden">
      {chartType === 'bar' ? (
        <Bar
          data={data}
          options={{
            ...options,
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              ...options.plugins,
              legend: {
                ...options.plugins.legend,
                labels: {
                  ...options.plugins.legend.labels,
                  font: {
                    ...options.plugins.legend.labels.font,
                    size: window.innerWidth < 640 ? 10 : 12,
                  },
                },
              },
            },
            scales: {
              ...options.scales,
              x: {
                ...options.scales.x,
                ticks: {
                  ...options.scales.x.ticks,
                  font: {
                    ...options.scales.x.ticks.font,
                    size: window.innerWidth < 640 ? 9 : 11,
                  },
                  maxRotation: 45,
                  minRotation: 0,
                },
              },
              y: {
                ...options.scales.y,
                ticks: {
                  ...options.scales.y.ticks,
                  font: {
                    ...options.scales.y.ticks.font,
                    size: window.innerWidth < 640 ? 9 : 11,
                  },
                },
              },
            },
          }}
        />
      ) : chartType === 'pie' ? (
        <Pie
          data={pieChartData}
          options={pieOptions}
        />
      ) : chartType === 'doughnut' ? (
        <Doughnut
          data={pieChartData}
          options={pieOptions}
        />
      ) : chartType === 'line' ? (
        <Line
          data={lineChartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top' as const,
                labels: {
                  usePointStyle: true,
                  pointStyle: 'circle',
                  font: {
                    family: 'Inter, sans-serif',
                    size: window.innerWidth < 640 ? 10 : 12,
                    weight: 'normal' as const,
                  },
                  color: 'hsl(215.4 16.3% 46.9%)',
                },
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: 'white',
                bodyColor: 'white',
                borderColor: 'hsl(214.3 31.8% 91.4%)',
                borderWidth: 1,
                cornerRadius: 8,
                displayColors: true,
                callbacks: {
                  label: function(context: any) {
                    return `${context.dataset.label}: ₹${context.parsed.y.toLocaleString()}`;
                  }
                }
              },
            },
            scales: {
              x: {
                grid: {
                  display: false,
                },
                ticks: {
                  color: 'hsl(215.4 16.3% 46.9%)',
                  font: {
                    family: 'Inter, sans-serif',
                    size: window.innerWidth < 640 ? 9 : 11,
                  },
                },
              },
              y: {
                beginAtZero: true,
                grid: {
                  color: 'hsl(214.3 31.8% 91.4% / 0.5)',
                },
                ticks: {
                  color: 'hsl(215.4 16.3% 46.9%)',
                  font: {
                    family: 'Inter, sans-serif',
                    size: window.innerWidth < 640 ? 9 : 11,
                  },
                  callback: function(value: any) {
                    return '₹' + (value / 1000).toFixed(0) + 'K';
                  }
                },
              },
            },
            interaction: {
              intersect: false,
              mode: 'index' as const,
            },
          }}
        />
      ) : (
        <Line
          data={lineChartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top' as const,
                labels: {
                  usePointStyle: true,
                  pointStyle: 'circle',
                  font: {
                    family: 'Inter, sans-serif',
                    size: window.innerWidth < 640 ? 10 : 12,
                    weight: 'normal' as const,
                  },
                  color: 'hsl(215.4 16.3% 46.9%)',
                },
              },
              tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: 'white',
                bodyColor: 'white',
                borderColor: 'hsl(214.3 31.8% 91.4%)',
                borderWidth: 1,
                cornerRadius: 8,
                displayColors: true,
                callbacks: {
                  label: function(context: any) {
                    return `${context.dataset.label}: ₹${context.parsed.y.toLocaleString()}`;
                  }
                }
              },
            },
            scales: {
              x: {
                grid: {
                  display: false,
                },
                ticks: {
                  color: 'hsl(215.4 16.3% 46.9%)',
                  font: {
                    family: 'Inter, sans-serif',
                    size: window.innerWidth < 640 ? 9 : 11,
                  },
                },
              },
              y: {
                beginAtZero: true,
                grid: {
                  color: 'hsl(214.3 31.8% 91.4% / 0.5)',
                },
                ticks: {
                  color: 'hsl(215.4 16.3% 46.9%)',
                  font: {
                    family: 'Inter, sans-serif',
                    size: window.innerWidth < 640 ? 9 : 11,
                  },
                  callback: function(value: any) {
                    return '₹' + (value / 1000).toFixed(0) + 'K';
                  }
                },
              },
            },
            interaction: {
              intersect: false,
              mode: 'index' as const,
            },
          }}
        />
      )}
    </div>
  );
};
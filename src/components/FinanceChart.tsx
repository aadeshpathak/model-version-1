import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { getSocietyStats } from '@/lib/firestoreServices';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
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

  useEffect(() => {
    const unsubscribe = getSocietyStats((stats) => {
      // For now, show current month data. In future, can aggregate by month
      const currentMonth = new Date().getMonth();
      const incomeData = Array(12).fill(0);
      const expenseData = Array(12).fill(0);

      // Set current month data
      incomeData[currentMonth] = stats.totalCollection || 0;
      expenseData[currentMonth] = stats.totalExpenses || 0;

      let datasets = [];
      let labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      // Filter based on selectedMonth
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

      // Filter based on visualizationType
      if (visualizationType === 'revenue') {
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
        ];
      } else if (visualizationType === 'expenses') {
        datasets = [
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
      } else {
        // overview, visualizations, insight - show both
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

      setChartData({
        labels,
        datasets,
      });
    });

    return unsubscribe;
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
          drawBorder: false,
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

  return (
    <div className="h-80 w-full">
      <Bar data={data} options={options} />
    </div>
  );
};
'use client';

import { useState, useEffect, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import dynamic from 'next/dynamic';
import { formatCurrency } from '@/lib/formatters';
import { TrendingUp } from "lucide-react"
import { 
  Area,
  Bar,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Label,
  LabelList,
  Legend
} from 'recharts';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { QurbanSalesStats } from'@/types/keuangan';
import { getMudhohiProgress } from '@/services/mudhohi';
import { Skeleton } from '@/components/ui/skeleton';
import { RecentTransactions } from '@/components/dashboard/summaries/recent-transactions';

// Dynamically import all chart components with SSR disabled
const AreaChart = dynamic(
  () => import('recharts').then(mod => mod.AreaChart),
  { ssr: false }
);

const BarChart = dynamic(
  () => import('recharts').then(mod => mod.BarChart),
  { ssr: false }
);

const PieChart = dynamic(
  () => import('recharts').then(mod => mod.PieChart),
  { ssr: false }
);

interface FinancialChartsProps {
  salesReport: QurbanSalesStats;
}

export default function FinancialCharts({
  salesReport,
}: FinancialChartsProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [areaChartData, setAreaChartData] = useState<{date:string,total:number}[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const data = await getMudhohiProgress();
      setAreaChartData(data);
    };

    fetchData();

  }, []);

  const COLORS = ['#0F766E', '#14b8a6', '#2dd4bf'];
  const pieChartData = salesReport.perTipeHewan.map((tipe: { nama: string; totalAmount: number; }, index) => ({
    name: tipe.nama,
    value: tipe.totalAmount,
    fill: COLORS[index]
  }));

  const barChartData = [
    {
      name: 'Panti Asuhan',
      jumlah: 400,
    },
    {
      name: 'Masjid',
      jumlah: 300,
    },
    {
      name: 'Pesantren',
      jumlah: 250,
    },
    {
      name: 'Dhuafa',
      jumlah: 200,
    },
    {
      name: 'Lainnya',
      jumlah: 100,
    },
  ];

  const pieChartConfig = salesReport.perTipeHewan.reduce(
    (acc: ChartConfig, tipe: { nama: string; totalAmount: number }, index: number) => {
      acc[tipe.nama] = {
        label: tipe.nama,
        color: `hsl(var(--chart-${index + 1}))`,
      };
      return acc;
    }, {} satisfies ChartConfig
  );
  
  const distributionChartConfig = barChartData.reduce(
    (acc: ChartConfig, tipe: { name: string; jumlah: number }, index: number) => {
    acc[tipe.name] = {
        label: tipe.name,
        color: `hsl(var(--chart-${index + 1}))`,
      };
      return acc;
    }, {} satisfies ChartConfig
  );
  const areaChartConfig = {
    total: {
      label: "Jumlah Pekurban",
      color: "#0F766E", // Using shadcn's primary-600 color
    },
  } satisfies ChartConfig;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Ikhtisar</TabsTrigger>
        <TabsTrigger value="transactions">Transaksi Terbaru</TabsTrigger>
        <TabsTrigger value="distributions">Distribusi</TabsTrigger>
        <TabsTrigger value="animals">Hewan</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className='inline-flex'><TrendingUp />Jumlah Pekurban </CardTitle>
            <CardDescription>
              Jumlah pendaftaran pekurban hingga hari H
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ChartContainer config={areaChartConfig}
              className="mx-auto my-auto aspect-video max-h-[300px] w-full">
              <AreaChart
                accessibilityLayer
                data={areaChartData}
                width={730} height={250}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                className="h-[300px]"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={true}
                  axisLine={false}
                  interval="preserveStart"
                  // type="number"
                  // scale="time"
                  padding={{ left: 5, right: 5 }}
                  tickMargin={8}
                  tick={{
                    dy: 10,
                    dx: -10,
                    fontSize: 12
                  }}
                  angle={45}
                  tickFormatter={(value) => value.slice(0,6)}
                />
                <YAxis/>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                  formatter={(value: number) => [`${value} pekurban`]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={(d) => isNaN(d.total) ? 0 : d.total}
                  fill="#0F766E"
                  stroke="var(--color-desktop)"
                  fillOpacity={0.3}
                  strokeWidth={2}
                  dot={{ fill: '#0F766E', strokeWidth: 2 }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="transactions" className="space-y-4">
        {/* Recent Transactions with Qurban Sales */}
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <RecentTransactions 
          />
        </Suspense>
      </TabsContent>
      <TabsContent value="distributions" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Distribusi Paket Qurban</CardTitle>
            <CardDescription>
              Jumlah paket daging qurban berdasarkan tujuan distribusi
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ChartContainer config ={distributionChartConfig}
              className="mx-auto my-auto aspect-video max-h-[300px] w-full">
              <BarChart accessibilityLayer
                data={barChartData}
                margin={{ top: 20, right: 40, left: 40, bottom: 20 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name"
                  type='category'
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tickFormatter={(value) => value}
                  interval={0}
                  tick={{
                    dy: 10,
                    dx: -10,
                    fontSize: 12
                  }}
                  height={70}
                  minTickGap={-30}
                  // angle={-45}
                  textAnchor="middle"
                />
                <YAxis />
                <ChartTooltip
                  formatter={(value: number, name: string) => (`${name} ${value} paket`)}
                  content={<ChartTooltipContent />}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                  }}
                />
                <Bar
                  dataKey="jumlah"
                  name="Jumlah Distribusi"
                  radius={[4, 4, 0, 0]}>
                  {barChartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={`hsl(var(--chart-${index+1}))`}
                    />
                  ))}
                  <LabelList
                    dataKey="jumlah"
                    position="top"
                    offset={3}
                    className="fill-foreground"
                    formatter={(value: number) => `${value.toLocaleString()} paket`}
                    fontSize={12}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="animals">
        <Card>
          <CardHeader>
            <CardTitle>Grafik Persentasi Hewan Qurban</CardTitle>
            <CardDescription>
              Persentasi hewan qurban menurut jenisnya
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ChartContainer config={pieChartConfig}
              className="mx-auto my-auto aspect-square max-h-[300px]">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  innerRadius={60}
                  strokeWidth={5}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-3xl font-bold"
                            >
                              {salesReport.totalCount.toLocaleString()}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 24}
                              className="fill-muted-foreground"
                            >
                              Hewan
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                  {pieChartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={_.fill}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                  }}
                />
                <Legend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

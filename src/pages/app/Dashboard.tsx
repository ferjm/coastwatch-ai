import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { loadDashboardStats, type DashboardStats, SOURCE_COLORS } from '@/services/analyticsService';

export default function Dashboard() {
  const { t } = useTranslation();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  useEffect(() => { loadDashboardStats().then(setStats).catch(() => {}); }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{t('dashboard')}</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalImages')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary-600">{stats?.totalImages ?? '—'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('detections')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-ocean-600">
              {stats != null ? (stats.edgeDetections + stats.cloudDetections) : '—'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('imagesWithPlastic')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success-600">{stats?.imagesWithPlastic ?? '—'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('escalationRateLabel')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning-600">
              {stats != null ? `${stats.escalationRate}%` : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latencia observada por nivel (cascada de dos niveles) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('avgLatencyEdge')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: '#EC4899' }}>
              {stats?.avgEdgeMs != null ? `${stats.avgEdgeMs} ms` : '—'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('avgLatencyCloud')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: '#06B6D4' }}>
              {stats?.avgCloudMs != null ? `${(stats.avgCloudMs / 1000).toFixed(1)} s` : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detections by source */}
        <Card>
          <CardHeader>
            <CardTitle>{t('detectionsByLevel')}</CardTitle>
            <CardDescription>Edge vs Cloud</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.bySource ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count">
                  {(stats?.bySource ?? []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>{t('temporalEvolution')}</CardTitle>
            <CardDescription>{t('temporalEvolutionDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats?.timeline ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="detections" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Edge vs Cloud Pie */}
      <Card>
        <CardHeader>
          <CardTitle>Edge vs Cloud</CardTitle>
          <CardDescription>{t('detectionsByLevelDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats?.bySource ?? []}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="count"
              >
                {(stats?.bySource ?? []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

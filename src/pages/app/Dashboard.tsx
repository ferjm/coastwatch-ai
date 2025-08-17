import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

// Mock data for charts - will be dynamically populated with translations

const timelineData = [
  { date: '2024-01-20', detections: 45 },
  { date: '2024-01-21', detections: 67 },
  { date: '2024-01-22', detections: 34 },
  { date: '2024-01-23', detections: 89 },
  { date: '2024-01-24', detections: 56 },
  { date: '2024-01-25', detections: 123 },
  { date: '2024-01-26', detections: 78 },
];

// Review status data - will be dynamically populated with translations

export default function Dashboard() {
  const { t } = useTranslation();

  const detectionsByClass = [
    { class: t('bottles'), count: 145, color: '#3B82F6' },
    { class: t('bags'), count: 89, color: '#10B981' },
    { class: t('nets'), count: 34, color: '#F59E0B' },
    { class: t('fragments'), count: 67, color: '#EF4444' },
    { class: t('others'), count: 23, color: '#8B5CF6' },
  ];

  const reviewStatusData = [
    { name: t('reviewed'), value: 65, color: '#10B981' },
    { name: t('pending'), value: 35, color: '#F59E0B' },
  ];

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
            <div className="text-2xl font-bold text-primary-600">1,234</div>
            <p className="text-xs text-muted-foreground">+12% {t('lastMonth')}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('detections')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-ocean-600">358</div>
            <p className="text-xs text-muted-foreground">+8% {t('lastMonth')}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('percentReviewed')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success-600">65%</div>
            <p className="text-xs text-muted-foreground">+15% {t('lastMonth')}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('activeAreas')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning-600">12</div>
            <p className="text-xs text-muted-foreground">+2 {t('newThisMonth')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detections by Class */}
        <Card>
          <CardHeader>
            <CardTitle>{t('detectionsByClass')}</CardTitle>
            <CardDescription>{t('detectionsByClassDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={detectionsByClass}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="class" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" />
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
              <LineChart data={timelineData}>
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

      {/* Review Status */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reviewStatus')}</CardTitle>
          <CardDescription>{t('reviewStatusDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reviewStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {reviewStatusData.map((entry, index) => (
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
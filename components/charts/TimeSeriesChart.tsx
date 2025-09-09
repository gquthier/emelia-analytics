'use client'

import { useState, useEffect } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import { format, subDays, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns'
import { fr } from 'date-fns/locale'

interface TimeSeriesChartProps {
  clientId: string
}

interface ChartData {
  date: string
  sent: number
  delivered: number
  opens: number
  clicks: number
  replies: number
  interested: number
}

export function TimeSeriesChart({ clientId }: TimeSeriesChartProps) {
  const [data, setData] = useState<ChartData[]>([])
  const [filteredData, setFilteredData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({ days: 30 })
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30))
  const [endDate, setEndDate] = useState<Date>(new Date())

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams({
          groupBy: 'day',
          days: dateRange.days.toString()
        })
        const response = await fetch(`/api/client/${clientId}/timeline?${params}`)
        if (response.ok) {
          const result = await response.json()
          setData(result.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch timeline data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [clientId, dateRange.days])

  useEffect(() => {
    // Filter data based on date range
    const filtered = data.filter(item => {
      const itemDate = startOfDay(new Date(item.date))
      return !isBefore(itemDate, startOfDay(startDate)) && !isAfter(itemDate, endOfDay(endDate))
    })
    setFilteredData(filtered)
  }, [data, startDate, endDate])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Volume d'envoi et réponses par jour</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">Chargement des données...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Volume d'envoi et réponses par jour</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">Aucune donnée disponible pour cette période</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Volume d'envoi et réponses par jour</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={filteredData} margin={{ top: 20, right: 50, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), 'dd/MM', { locale: fr })}
                tick={{ fontSize: 12 }}
              />
              {/* Left Y-axis for sent emails (high values) */}
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 12 }} 
                label={{ value: 'Emails envoyés', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                stroke="#3b82f6"
              />
              {/* Right Y-axis for replies and interested (low values) */}
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                label={{ value: 'Réponses & Intéressés', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }}
                stroke="#10b981"
              />
              <Tooltip 
                labelFormatter={(date) => format(new Date(date), 'EEEE dd MMMM yyyy', { locale: fr })}
                formatter={(value: number, name: string) => {
                  let label = '';
                  switch (name) {
                    case 'sent': label = 'Emails envoyés'; break;
                    case 'replies': label = 'Réponses reçues'; break;
                    case 'interested': label = 'Intéressés'; break;
                    default: label = name;
                  }
                  return [value.toLocaleString('fr-FR'), label];
                }}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend 
                formatter={(value) => {
                  switch (value) {
                    case 'sent': return 'Emails envoyés';
                    case 'replies': return 'Réponses reçues';
                    case 'interested': return 'Intéressés';
                    default: return value;
                  }
                }}
              />
              {/* Bar for sent emails on left axis */}
              <Bar 
                dataKey="sent" 
                fill="#3b82f6" 
                name="sent"
                yAxisId="left"
                radius={[2, 2, 0, 0]}
                opacity={0.8}
              />
              {/* Bar for replies on right axis */}
              <Bar 
                dataKey="replies" 
                fill="#10b981" 
                name="replies"
                yAxisId="right"
                radius={[2, 2, 0, 0]}
                opacity={0.8}
              />
              {/* Bar for interested on right axis */}
              <Bar 
                dataKey="interested" 
                fill="#f59e0b" 
                name="interested"
                yAxisId="right"
                radius={[2, 2, 0, 0]}
                opacity={0.8}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
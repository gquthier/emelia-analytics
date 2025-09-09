'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
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
        <div className="flex items-center justify-between">
          <CardTitle>Volume d'envoi et réponses par jour</CardTitle>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <div className="flex gap-2">
              <Button 
                variant={dateRange.days === 7 ? "default" : "outline"} 
                size="sm"
                onClick={() => {
                  setDateRange({ days: 7 })
                  setStartDate(subDays(new Date(), 7))
                  setEndDate(new Date())
                }}
              >
                7j
              </Button>
              <Button 
                variant={dateRange.days === 30 ? "default" : "outline"} 
                size="sm"
                onClick={() => {
                  setDateRange({ days: 30 })
                  setStartDate(subDays(new Date(), 30))
                  setEndDate(new Date())
                }}
              >
                30j
              </Button>
              <Button 
                variant={dateRange.days === 90 ? "default" : "outline"} 
                size="sm"
                onClick={() => {
                  setDateRange({ days: 90 })
                  setStartDate(subDays(new Date(), 90))
                  setEndDate(new Date())
                }}
              >
                90j
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Période: {format(startDate, 'dd MMM yyyy', { locale: fr })} - {format(endDate, 'dd MMM yyyy', { locale: fr })}</span>
            <span>({filteredData.length} jour{filteredData.length > 1 ? 's' : ''})</span>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), 'dd/MM', { locale: fr })}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                labelFormatter={(date) => format(new Date(date), 'EEEE dd MMMM yyyy', { locale: fr })}
                formatter={(value: number, name: string) => [
                  value.toLocaleString('fr-FR'),
                  name === 'sent' ? 'Emails envoyés' : 'Réponses reçues'
                ]}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend 
                formatter={(value) => value === 'sent' ? 'Emails envoyés' : 'Réponses reçues'}
              />
              <Bar 
                dataKey="sent" 
                fill="#3b82f6" 
                name="sent"
                radius={[2, 2, 0, 0]}
                opacity={0.8}
              />
              <Bar 
                dataKey="replies" 
                fill="#10b981" 
                name="replies"
                radius={[2, 2, 0, 0]}
                opacity={0.8}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
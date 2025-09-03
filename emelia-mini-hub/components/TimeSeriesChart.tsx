'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/client/${clientId}/timeline`)
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
  }, [clientId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Évolution des événements (30 derniers jours)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">Chargement...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Évolution des événements (30 derniers jours)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <p className="text-gray-500">Aucune donnée disponible</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Évolution des événements (30 derniers jours)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), 'dd/MM', { locale: fr })}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(date) => format(new Date(date), 'dd MMMM yyyy', { locale: fr })}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="sent" 
                stroke="#3b82f6" 
                name="Envoyés"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="delivered" 
                stroke="#10b981" 
                name="Délivrés"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="opens" 
                stroke="#8b5cf6" 
                name="Ouvertures"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="clicks" 
                stroke="#6366f1" 
                name="Clics"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="replies" 
                stroke="#06b6d4" 
                name="Réponses"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
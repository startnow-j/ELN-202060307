'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { authFetch } from '@/contexts/AppContext'
import {
  History,
  CheckCircle,
  Archive,
  Unlock,
  FolderPlus,
  Loader2
} from 'lucide-react'

interface HistoryLog {
  id: string
  action: string
  operator: { id: string; name: string; email: string } | null
  timestamp: string
  previousStatus: string | null
  newStatus: string
  lockedExperiments: number
}

interface ProjectHistoryTabProps {
  projectId: string
}

// 状态映射
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: '进行中', color: 'bg-blue-500' },
  COMPLETED: { label: '已结束', color: 'bg-green-500' },
  ARCHIVED: { label: '已归档', color: 'bg-gray-500' }
}

// 操作图标映射
const ACTION_ICONS: Record<string, React.ReactNode> = {
  '创建项目': <FolderPlus className="w-4 h-4 text-blue-500" />,
  '结束项目': <CheckCircle className="w-4 h-4 text-green-500" />,
  '恢复项目': <Unlock className="w-4 h-4 text-amber-500" />,
  '归档项目': <Archive className="w-4 h-4 text-gray-500" />,
  '解除归档': <Unlock className="w-4 h-4 text-amber-500" />
}

export function ProjectHistoryTab({ projectId }: ProjectHistoryTabProps) {
  const [logs, setLogs] = useState<HistoryLog[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true)
        const res = await authFetch(`/api/projects/${projectId}/history`)
        if (res.ok) {
          const data = await res.json()
          setLogs(data.logs || [])
        }
      } catch (error) {
        console.error('Fetch history error:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistory()
  }, [projectId])

  // 格式化时间
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <History className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">暂无状态变更记录</p>
          <p className="text-sm text-muted-foreground mt-1">
            项目状态变更历史将在此显示
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-4 h-4" />
          状态变更历史
        </CardTitle>
        <CardDescription>
          记录项目从创建到状态变更的完整历史
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {logs.map((log) => (
            <div 
              key={log.id} 
              className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
            >
              {/* 操作图标 */}
              <div className="flex-shrink-0">
                {ACTION_ICONS[log.action] || <History className="w-4 h-4 text-muted-foreground" />}
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{log.action}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTime(log.timestamp)}
                  </span>
                </div>

                {/* 状态标签 */}
                <div className="flex items-center gap-2 mt-1.5">
                  {log.previousStatus ? (
                    <>
                      <Badge variant="outline" className={`text-xs ${STATUS_MAP[log.previousStatus]?.color || ''} text-white border-0`}>
                        {STATUS_MAP[log.previousStatus]?.label || log.previousStatus}
                      </Badge>
                      <span className="text-muted-foreground text-xs">→</span>
                    </>
                  ) : null}
                  <Badge variant="outline" className={`text-xs ${STATUS_MAP[log.newStatus]?.color || ''} text-white border-0`}>
                    {STATUS_MAP[log.newStatus]?.label || log.newStatus}
                  </Badge>
                </div>
              </div>

              {/* 操作者 */}
              <div className="flex-shrink-0 text-right">
                {log.operator && (
                  <span className="text-sm text-muted-foreground">
                    {log.operator.name}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

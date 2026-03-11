'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Unlock, Clock, Eye, CheckCircle, XCircle } from 'lucide-react'
import { AppUser } from '@/contexts/AppContext'

interface UnlockRequestItem {
  id: string
  reason: string
  createdAt: string
  experiment: {
    id: string
    title: string
    author: AppUser
  }
  requester: AppUser
}

interface UnlockRequestListProps {
  requests: UnlockRequestItem[]
  isLoading: boolean
  onViewExperiment: (id: string) => void
  onProcess: (request: UnlockRequestItem, action: 'APPROVE' | 'REJECT') => void
  formatDate: (date: string) => string
}

export function UnlockRequestList({
  requests,
  isLoading,
  onViewExperiment,
  onProcess,
  formatDate,
}: UnlockRequestListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Unlock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">暂无待处理的解锁申请</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id} className="border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <Unlock className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <h3 className="font-semibold text-lg truncate">{request.experiment.title}</h3>
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                    待处理
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span>申请人: {request.requester.name}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    申请于 {formatDate(request.createdAt)}
                  </span>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-amber-800 mb-1">解锁原因：</p>
                  <p className="text-sm text-amber-700">{request.reason}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewExperiment(request.experiment.id)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  查看
                </Button>
                <Button
                  size="sm"
                  onClick={() => onProcess(request, 'APPROVE')}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  批准
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onProcess(request, 'REJECT')}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  拒绝
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

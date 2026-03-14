'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  FileText,
  Upload,
  Download,
  Trash2,
} from 'lucide-react'
import { ProjectDocument } from '../types'
import { getDocumentTypeLabel } from '../utils'

interface ProjectDocumentsTabProps {
  projectId: string
  documents: ProjectDocument[]
  canManage: boolean
  projectStatus: string
  onUpload: () => void
  onDelete: (docId: string) => void
}

export function ProjectDocumentsTab({
  projectId,
  documents,
  canManage,
  projectStatus,
  onUpload,
  onDelete,
}: ProjectDocumentsTabProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>项目文档</CardTitle>
        {canManage && projectStatus === 'ACTIVE' && (
          <Button size="sm" className="gap-2" onClick={onUpload}>
            <Upload className="w-4 h-4" />
            上传文档
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {getDocumentTypeLabel(doc.type)}
                      {' · '}{(doc.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(`/api/projects/${projectId}/documents/${doc.id}`, '_blank')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  {canManage && projectStatus === 'ACTIVE' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(doc.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">暂无项目文档</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

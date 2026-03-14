'use client'

import { Badge } from '@/components/ui/badge'
import { FolderKanban, Beaker, ExternalLink } from 'lucide-react'
import type { SearchResult } from './types'

interface SearchResultItemProps {
  result: SearchResult
  onClick: () => void
}

/**
 * 搜索结果项组件
 */
export function SearchResultItem({ result, onClick }: SearchResultItemProps) {
  return (
    <div
      className="flex items-center gap-3 p-3 hover:bg-muted/50 rounded-lg cursor-pointer border border-transparent hover:border-border"
      onClick={onClick}
    >
      {result.type === 'project' ? (
        <FolderKanban className="w-5 h-5 text-primary flex-shrink-0" />
      ) : (
        <Beaker className="w-5 h-5 text-green-500 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{result.title}</span>
          {result.type === 'experiment' && result.storageLocation === 'draft' && (
            <Badge variant="outline" className="text-xs">暂存</Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {result.type === 'project' ? (
            <span>项目 · {result.attachmentCount} 个实验记录</span>
          ) : (
            <span>
              实验{result.projectName ? ` · ${result.projectName}` : ''}
              {result.userName && ` · ${result.userName}`}
              {' · '}{result.attachmentCount} 个附件
            </span>
          )}
        </div>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </div>
  )
}

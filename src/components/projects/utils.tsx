import { Badge } from '@/components/ui/badge'

// 状态徽章
export function getStatusBadge(status: string) {
  const statusMap: Record<string, { label: string; className: string }> = {
    ACTIVE: { label: '进行中', className: 'bg-green-100 text-green-700' },
    COMPLETED: { label: '已结束', className: 'bg-blue-100 text-blue-700' },
    ARCHIVED: { label: '已归档', className: 'bg-gray-100 text-gray-700' },
  }
  const config = statusMap[status] || { label: status, className: 'bg-secondary' }
  return <Badge className={config.className}>{config.label}</Badge>
}

// 审核状态徽章
export function getReviewStatusBadge(status: string) {
  const statusMap: Record<string, { label: string; className: string }> = {
    DRAFT: { label: '草稿', className: 'bg-gray-100 text-gray-700' },
    PENDING_REVIEW: { label: '待审核', className: 'bg-yellow-100 text-yellow-700' },
    NEEDS_REVISION: { label: '需修改', className: 'bg-orange-100 text-orange-700' },
    LOCKED: { label: '已锁定', className: 'bg-green-100 text-green-700' },
  }
  const config = statusMap[status] || { label: status, className: 'bg-secondary' }
  return <Badge className={config.className}>{config.label}</Badge>
}

// 项目角色标签
export function getProjectRoleBadge(role: string) {
  const roleMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    PROJECT_LEAD: { label: '负责人', variant: 'default' },
    MEMBER: { label: '参与人', variant: 'secondary' },
    VIEWER: { label: '观察员', variant: 'outline' },
  }
  const config = roleMap[role] || { label: role, variant: 'secondary' }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

// 格式化日期
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

// 获取文档类型标签
export function getDocumentTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    PROPOSAL: '立项报告',
    PROGRESS_REPORT: '进展报告',
    FINAL_REPORT: '结题报告',
    OTHER: '其他文档',
  }
  return typeMap[type] || type
}

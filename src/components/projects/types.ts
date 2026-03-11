// 状态操作类型
export type StatusAction = 'complete' | 'reactivate' | 'archive' | 'unarchive'

export interface StatusActionInfo {
  action: StatusAction
  label: string
  description: string
  variant: 'default' | 'destructive' | 'outline'
  icon: React.ReactNode
}

// 项目成员类型
export interface ProjectMember {
  id: string
  name: string
  email: string
  role: string
  avatar: string | null
  projectRole: string
  joinedAt: string | null
}

// 可选用户类型
export interface SelectableUser {
  id: string
  name: string
  email: string
  role: string
  selected: boolean
}

// 文档类型
export type DocumentType = 'PROPOSAL' | 'PROGRESS_REPORT' | 'FINAL_REPORT' | 'OTHER'

// 项目文档类型
export interface ProjectDocument {
  id: string
  name: string
  type: DocumentType
  size: number
  description?: string
  createdAt: string
}

// 编辑表单类型
export interface EditForm {
  startDate: string
  expectedEndDate: string
  description: string
  primaryLeader: string
}

// 上传表单类型
export interface UploadForm {
  name: string
  type: DocumentType
  description: string
}

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Users,
  Loader2,
  MoreVertical,
  UserPlus,
} from 'lucide-react'
import { ProjectMember } from '../types'
import { getProjectRoleBadge } from '../utils'

interface ProjectMembersTabProps {
  members: ProjectMember[]
  loadingMembers: boolean
  canManage: boolean
  projectStatus: string
  projectOwnerId: string
  onAddMember: () => void
  onUpdateMemberRole: (userId: string, newRole: string) => void
  onRemoveMember: (userId: string) => void
}

export function ProjectMembersTab({
  members,
  loadingMembers,
  canManage,
  projectStatus,
  projectOwnerId,
  onAddMember,
  onUpdateMemberRole,
  onRemoveMember,
}: ProjectMembersTabProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>项目成员 ({members.length})</CardTitle>
        {canManage && projectStatus === 'ACTIVE' && (
          <Button size="sm" className="gap-2" onClick={onAddMember}>
            <UserPlus className="w-4 h-4" />
            添加成员
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loadingMembers ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">加载中...</p>
          </div>
        ) : members.length > 0 ? (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getProjectRoleBadge(member.projectRole)}
                  {canManage && member.id !== projectOwnerId && projectStatus === 'ACTIVE' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onUpdateMemberRole(member.id, 'PROJECT_LEAD')}>
                          设为负责人
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onUpdateMemberRole(member.id, 'MEMBER')}>
                          设为参与人
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onUpdateMemberRole(member.id, 'VIEWER')}>
                          设为观察员
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onRemoveMember(member.id)}
                          className="text-destructive"
                        >
                          移除成员
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">暂无成员</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

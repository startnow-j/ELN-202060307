'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Search } from 'lucide-react'
import { SelectableUser } from '../types'

interface AddMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableUsers: SelectableUser[]
  isLoading: boolean
  onToggleUser: (userId: string) => void
  onAddMembers: (userIds: string[], role: string) => void
}

export function AddMemberDialog({
  open,
  onOpenChange,
  availableUsers,
  isLoading,
  onToggleUser,
  onAddMembers,
}: AddMemberDialogProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('MEMBER')

  const filteredUsers = availableUsers.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedCount = availableUsers.filter(u => u.selected).length

  const handleAddMembers = () => {
    const selectedUserIds = availableUsers.filter(u => u.selected).map(u => u.id)
    onAddMembers(selectedUserIds, selectedRole)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>添加项目成员</DialogTitle>
          <DialogDescription>
            选择要添加到项目的用户
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索用户..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* 角色选择 */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">添加为：</span>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PROJECT_LEAD">负责人</SelectItem>
                <SelectItem value="MEMBER">参与人</SelectItem>
                <SelectItem value="VIEWER">观察员</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 用户列表 */}
          <ScrollArea className="h-64 border rounded-lg">
            {filteredUsers.length > 0 ? (
              <div className="p-2 space-y-1">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                    onClick={() => onToggleUser(user.id)}
                  >
                    <Checkbox
                      checked={user.selected}
                      onCheckedChange={() => onToggleUser(user.id)}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{user.role}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {searchTerm ? '未找到匹配用户' : '暂无可添加的用户'}
              </div>
            )}
          </ScrollArea>

          {selectedCount > 0 && (
            <p className="text-sm text-muted-foreground">
              已选择 {selectedCount} 位用户
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleAddMembers} disabled={isLoading || selectedCount === 0}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            添加 ({selectedCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

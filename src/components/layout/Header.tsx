'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Bell, 
  Search, 
  Sun, 
  Moon,
  Plus
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/hooks/api'

interface HeaderProps {
  onCreateExperiment?: () => void
}

export function Header({ onCreateExperiment }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const { data: currentUser } = useAuth()

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 flex items-center justify-between">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索实验记录、项目..."
            className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {currentUser && onCreateExperiment && (
          <Button onClick={onCreateExperiment} className="gap-2">
            <Plus className="w-4 h-4" />
            新建实验
          </Button>
        )}
        
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">切换主题</span>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
        </Button>
      </div>
    </header>
  )
}

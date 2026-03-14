'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { authFetch } from '@/contexts/AppContext'
import { useToast } from '@/hooks/use-toast'
import {
  Bot,
  Plus,
  Pencil,
  Trash2,
  Key,
  Globe,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  Sparkles,
  BarChart3,
  TrendingUp,
  Clock,
  Zap,
  Users,
  Calendar,
  AlertCircle
} from 'lucide-react'

// AI服务提供商配置
const AI_PROVIDERS = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4, GPT-4o, GPT-3.5',
    models: ['gpt-4', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    defaultEndpoint: 'https://api.openai.com/v1',
    icon: '🤖'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek Chat, DeepSeek Coder',
    models: ['deepseek-chat', 'deepseek-coder'],
    defaultEndpoint: 'https://api.deepseek.com/v1',
    icon: '🔮'
  },
  {
    id: 'zhipu',
    name: '智谱AI',
    description: 'GLM-4, GLM-3-Turbo',
    models: ['glm-4', 'glm-4-flash', 'glm-3-turbo'],
    defaultEndpoint: 'https://open.bigmodel.cn/api/paas/v4',
    icon: '🌟'
  },
  {
    id: 'aliyun',
    name: '阿里云百炼',
    description: 'Qwen系列模型',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
    defaultEndpoint: 'https://dashscope.aliyuncs.com/api/v1',
    icon: '☁️'
  },
  {
    id: 'azure',
    name: 'Azure OpenAI',
    description: 'Azure托管的OpenAI模型',
    models: ['gpt-4', 'gpt-35-turbo'],
    defaultEndpoint: '', // 需要用户输入
    icon: '🔷'
  }
]

interface AIConfig {
  id: string
  provider: string
  apiEndpoint: string | null
  modelName: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface ConfigFormData {
  provider: string
  apiKey: string
  apiEndpoint: string
  modelName: string
  isActive: boolean
}

// AI统计相关类型
interface AIStatsSummary {
  totalCalls: number
  successCalls: number
  failedCalls: number
  timeoutCalls: number
  successRate: number
  totalTokens: number
  totalPromptTokens: number
  totalCompletionTokens: number
  avgResponseTime: number
}

interface ProviderStat {
  calls: number
  success: number
  failed: number
  tokens: number
  avgResponseTime: number
}

interface DailyStat {
  date: string
  calls: number
  tokens: number
  success: number
}

interface TopUser {
  user: { id: string; name: string; email: string }
  calls: number
  tokens: number
}

interface RecentLog {
  id: string
  provider: string
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  responseTime: number
  status: 'success' | 'failed' | 'timeout'
  errorMessage?: string
  userId: string | null
  createdAt: string
}

interface AIStats {
  summary: AIStatsSummary
  providerStats: Record<string, ProviderStat>
  dailyStats: DailyStat[]
  topUsers: TopUser[]
  recentLogs: RecentLog[]
}

const defaultFormData: ConfigFormData = {
  provider: '',
  apiKey: '',
  apiEndpoint: '',
  modelName: '',
  isActive: true
}

export function AIConfigManager() {
  const [configs, setConfigs] = useState<AIConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<AIConfig | null>(null)
  const [formData, setFormData] = useState<ConfigFormData>(defaultFormData)
  const [showApiKey, setShowApiKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 统计相关状态
  const [statsDays, setStatsDays] = useState(7)
  const [stats, setStats] = useState<AIStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  const { toast } = useToast()

  // 加载配置列表
  const loadConfigs = async () => {
    try {
      setIsLoading(true)
      const res = await authFetch('/api/ai-config')
      if (res.ok) {
        const data = await res.json()
        setConfigs(data.configs || [])
      } else {
        toast({
          variant: 'destructive',
          title: '加载失败',
          description: '无法获取AI配置列表'
        })
      }
    } catch (error) {
      console.error('Load configs error:', error)
      toast({
        variant: 'destructive',
        title: '加载失败',
        description: '网络错误，请重试'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 加载统计
  const loadStats = async () => {
    try {
      setIsLoadingStats(true)
      const res = await authFetch(`/api/ai-config/stats?days=${statsDays}`)
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      } else {
        toast({
          variant: 'destructive',
          title: '加载统计失败',
          description: '无法获取AI调用统计'
        })
      }
    } catch (error) {
      console.error('Load stats error:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  useEffect(() => {
    loadConfigs()
  }, [])

  useEffect(() => {
    loadStats()
  }, [statsDays])

  // 获取provider配置
  const getProviderConfig = (providerId: string) => {
    return AI_PROVIDERS.find(p => p.id === providerId)
  }

  // 打开添加/编辑对话框
  const openDialog = (config?: AIConfig) => {
    if (config) {
      setEditingConfig(config)
      setFormData({
        provider: config.provider,
        apiKey: '', // 密钥不回显
        apiEndpoint: config.apiEndpoint || '',
        modelName: config.modelName,
        isActive: config.isActive
      })
    } else {
      setEditingConfig(null)
      setFormData(defaultFormData)
    }
    setShowApiKey(false)
    setIsDialogOpen(true)
  }

  // 关闭对话框
  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingConfig(null)
    setFormData(defaultFormData)
    setShowApiKey(false)
  }

  // 处理provider变更
  const handleProviderChange = (providerId: string) => {
    const provider = getProviderConfig(providerId)
    setFormData(prev => ({
      ...prev,
      provider: providerId,
      apiEndpoint: provider?.defaultEndpoint || '',
      modelName: provider?.models[0] || ''
    }))
  }

  // 保存配置
  const handleSave = async () => {
    // 验证
    if (!formData.provider) {
      toast({ variant: 'destructive', title: '请选择AI服务商' })
      return
    }
    if (!editingConfig && !formData.apiKey) {
      toast({ variant: 'destructive', title: '请输入API密钥' })
      return
    }
    if (!formData.modelName) {
      toast({ variant: 'destructive', title: '请选择模型' })
      return
    }

    try {
      setIsSaving(true)
      const res = await authFetch('/api/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        toast({
          title: editingConfig ? '配置已更新' : '配置已添加',
          description: `${getProviderConfig(formData.provider)?.name} 配置成功`
        })
        closeDialog()
        loadConfigs()
      } else {
        const error = await res.json()
        toast({
          variant: 'destructive',
          title: '保存失败',
          description: error.error || '请重试'
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '保存失败',
        description: '网络错误，请重试'
      })
    } finally {
      setIsSaving(false)
    }
  }

  // 删除配置
  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id)
      const res = await authFetch(`/api/ai-config?id=${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        toast({ title: '配置已删除' })
        loadConfigs()
      } else {
        toast({
          variant: 'destructive',
          title: '删除失败',
          description: '请重试'
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '删除失败',
        description: '网络错误，请重试'
      })
    } finally {
      setDeletingId(null)
    }
  }

  // 切换启用状态
  const toggleActive = async (config: AIConfig) => {
    try {
      const res = await authFetch('/api/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.provider,
          apiKey: '', // 不更新密钥
          apiEndpoint: config.apiEndpoint,
          modelName: config.modelName,
          isActive: !config.isActive
        })
      })

      if (res.ok) {
        toast({
          title: config.isActive ? '已停用' : '已启用',
          description: `${getProviderConfig(config.provider)?.name} ${config.isActive ? '已停用' : '已启用'}`
        })
        loadConfigs()
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '操作失败',
        description: '请重试'
      })
    }
  }

  // 格式化数字
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  // 格式化时间
  const formatDuration = (ms: number) => {
    if (ms >= 1000) return (ms / 1000).toFixed(1) + 's'
    return ms + 'ms'
  }

  // 渲染空状态
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* 标题区域 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="w-6 h-6" />
            AI服务配置
          </h2>
          <p className="text-muted-foreground mt-1">
            配置AI大模型服务商，用于实验数据分析等智能功能
          </p>
        </div>
      </div>

      {/* Tab 切换 */}
      <Tabs defaultValue="config" className="w-full">
        <TabsList>
          <TabsTrigger value="config" className="gap-2">
            <Key className="w-4 h-4" />
            服务配置
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            调用统计
          </TabsTrigger>
        </TabsList>

        {/* 配置 Tab */}
        <TabsContent value="config" className="space-y-6 mt-6">
          {/* 安全提示 */}
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950">
            <CardContent className="flex items-start gap-3 py-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">安全提示</p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  API密钥将被加密存储，仅系统可解密使用。请妥善保管主密钥，不要泄露给他人。
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 添加按钮 */}
          <div className="flex justify-end">
            <Button onClick={() => openDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              添加配置
            </Button>
          </div>

          {/* 配置列表 */}
          {configs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">暂无AI服务配置</p>
                <p className="text-sm text-muted-foreground mt-1">
                  点击"添加配置"按钮开始配置AI服务
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {configs.map(config => {
                const provider = getProviderConfig(config.provider)
                return (
                  <Card key={config.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl">{provider?.icon || '🤖'}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{provider?.name || config.provider}</span>
                            {config.isActive ? (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                已启用
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <XCircle className="w-3 h-3 mr-1" />
                                已停用
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            模型: {config.modelName}
                            {config.apiEndpoint && (
                              <span className="ml-2 text-xs">
                                • {config.apiEndpoint}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={config.isActive}
                          onCheckedChange={() => toggleActive(config)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDialog(config)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认删除</AlertDialogTitle>
                              <AlertDialogDescription>
                                确定要删除 {provider?.name} 的配置吗？此操作不可撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(config.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deletingId === config.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  '删除'
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* 统计 Tab */}
        <TabsContent value="stats" className="space-y-6 mt-6">
          {/* 时间范围选择 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">统计周期:</span>
              <Select value={statsDays.toString()} onValueChange={(v) => setStatsDays(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">最近7天</SelectItem>
                  <SelectItem value="14">最近14天</SelectItem>
                  <SelectItem value="30">最近30天</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={loadStats} disabled={isLoadingStats}>
              {isLoadingStats ? <Loader2 className="w-4 h-4 animate-spin" /> : '刷新'}
            </Button>
          </div>

          {isLoadingStats ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : !stats ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">暂无统计数据</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 核心指标卡片 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Zap className="w-4 h-4" />
                      <span className="text-sm">总调用次数</span>
                    </div>
                    <div className="text-2xl font-bold">{formatNumber(stats.summary.totalCalls)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      成功率 {stats.summary.successRate}%
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm">Token用量</span>
                    </div>
                    <div className="text-2xl font-bold">{formatNumber(stats.summary.totalTokens)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      提示 {formatNumber(stats.summary.totalPromptTokens)} / 完成 {formatNumber(stats.summary.totalCompletionTokens)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">平均响应时间</span>
                    </div>
                    <div className="text-2xl font-bold">{formatDuration(stats.summary.avgResponseTime)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      基于成功调用
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">失败/超时</span>
                    </div>
                    <div className="text-2xl font-bold text-destructive">
                      {stats.summary.failedCalls + stats.summary.timeoutCalls}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      失败 {stats.summary.failedCalls} / 超时 {stats.summary.timeoutCalls}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 按服务商统计 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">服务商统计</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(stats.providerStats).length === 0 ? (
                      <p className="text-muted-foreground text-sm">暂无数据</p>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(stats.providerStats).map(([provider, data]) => {
                          const providerConfig = getProviderConfig(provider)
                          return (
                            <div key={provider} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{providerConfig?.icon || '🤖'}</span>
                                <div>
                                  <div className="font-medium">{providerConfig?.name || provider}</div>
                                  <div className="text-xs text-muted-foreground">
                                    成功 {data.success} / 失败 {data.failed}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">{formatNumber(data.calls)} 次</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatNumber(data.tokens)} tokens
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 活跃用户 Top 10 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      活跃用户 Top 10
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.topUsers.length === 0 ? (
                      <p className="text-muted-foreground text-sm">暂无数据</p>
                    ) : (
                      <div className="space-y-2">
                        {stats.topUsers.map((item, index) => (
                          <div key={item.user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                {index + 1}
                              </div>
                              <div>
                                <div className="text-sm font-medium">{item.user.name}</div>
                                <div className="text-xs text-muted-foreground">{item.user.email}</div>
                              </div>
                            </div>
                            <div className="text-right text-sm">
                              <span className="font-medium">{item.calls}</span>
                              <span className="text-muted-foreground ml-1">次</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* 最近调用记录 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">最近调用记录</CardTitle>
                  <CardDescription>显示最近20条AI调用记录</CardDescription>
                </CardHeader>
                <CardContent>
                  {stats.recentLogs.length === 0 ? (
                    <p className="text-muted-foreground text-sm">暂无调用记录</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {stats.recentLogs.map(log => {
                        const providerConfig = getProviderConfig(log.provider)
                        return (
                          <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                            <div className="flex items-center gap-3">
                              <span>{providerConfig?.icon || '🤖'}</span>
                              <div>
                                <div className="font-medium">{log.model}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(log.createdAt).toLocaleString('zh-CN')}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">
                                  {log.totalTokens} tokens
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDuration(log.responseTime)}
                                </div>
                              </div>
                              {log.status === 'success' ? (
                                <Badge variant="default" className="bg-green-600 text-xs">成功</Badge>
                              ) : log.status === 'timeout' ? (
                                <Badge variant="secondary" className="text-xs">超时</Badge>
                              ) : (
                                <Badge variant="destructive" className="text-xs">失败</Badge>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* 添加/编辑对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? '编辑配置' : '添加AI服务配置'}
            </DialogTitle>
            <DialogDescription>
              {editingConfig
                ? '修改AI服务配置。留空API密钥表示保持原有密钥不变。'
                : '配置新的AI服务提供商。API密钥将被加密存储。'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 服务商选择 */}
            <div className="space-y-2">
              <Label>AI服务商 *</Label>
              <Select
                value={formData.provider}
                onValueChange={handleProviderChange}
                disabled={!!editingConfig}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择服务商" />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map(provider => (
                    <SelectItem key={provider.id} value={provider.id}>
                      <span className="flex items-center gap-2">
                        <span>{provider.icon}</span>
                        <span>{provider.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {provider.description}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* API密钥 */}
            <div className="space-y-2">
              <Label>
                API密钥 {editingConfig ? '' : '*'}
                {editingConfig && (
                  <span className="text-muted-foreground text-xs ml-2">
                    (留空保持不变)
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder={editingConfig ? '••••••••••••' : 'sk-...'}
                  value={formData.apiKey}
                  onChange={e => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* API端点 */}
            <div className="space-y-2">
              <Label>API端点</Label>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="https://api.example.com/v1"
                  value={formData.apiEndpoint}
                  onChange={e => setFormData(prev => ({ ...prev, apiEndpoint: e.target.value }))}
                />
              </div>
              {getProviderConfig(formData.provider)?.defaultEndpoint && (
                <p className="text-xs text-muted-foreground">
                  默认: {getProviderConfig(formData.provider)?.defaultEndpoint}
                </p>
              )}
            </div>

            {/* 模型选择 */}
            <div className="space-y-2">
              <Label>默认模型 *</Label>
              <Select
                value={formData.modelName}
                onValueChange={value => setFormData(prev => ({ ...prev, modelName: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择模型" />
                </SelectTrigger>
                <SelectContent>
                  {(getProviderConfig(formData.provider)?.models || []).map(model => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 启用状态 */}
            <div className="flex items-center justify-between">
              <Label>启用此配置</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={checked => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingConfig ? '保存修改' : '添加配置'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

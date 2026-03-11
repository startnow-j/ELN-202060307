'use client'

import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

/**
 * 全局错误边界组件
 * 捕获子组件树中的 JavaScript 错误，记录错误并显示备用 UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 记录错误信息
    console.error('ErrorBoundary caught an error:', error)
    console.error('Error info:', errorInfo)
    
    this.setState({ errorInfo })
    
    // 可以在这里添加错误上报逻辑
    // reportError(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默认错误 UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                {/* 错误图标 */}
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>

                {/* 标题 */}
                <h1 className="text-2xl font-bold mb-2">出错了</h1>
                <p className="text-muted-foreground mb-6">
                  应用遇到了一个意外错误，请尝试刷新页面或返回首页。
                </p>

                {/* 错误详情（开发环境显示） */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <div className="w-full mb-6">
                    <details className="text-left">
                      <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                        <Bug className="w-4 h-4" />
                        查看错误详情
                      </summary>
                      <div className="mt-3 p-4 bg-muted rounded-lg overflow-auto max-h-48">
                        <p className="text-sm font-mono text-destructive mb-2">
                          {this.state.error.message}
                        </p>
                        {this.state.errorInfo?.componentStack && (
                          <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        )}
                      </div>
                    </details>
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={this.handleReset}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    重试
                  </Button>
                  <Button onClick={this.handleGoHome}>
                    <Home className="w-4 h-4 mr-2" />
                    返回首页
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * 轻量级错误边界
 * 用于局部组件的错误捕获，不影响整个应用
 */
export class PartialErrorBoundary extends Component<
  ErrorBoundaryProps & { onRetry?: () => void },
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps & { onRetry?: () => void }) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PartialErrorBoundary caught an error:', error)
    this.setState({ errorInfo })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    this.props.onRetry?.()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">加载失败</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {this.state.error?.message || '发生未知错误'}
          </p>
          <Button variant="outline" size="sm" onClick={this.handleRetry}>
            <RefreshCw className="w-4 h-4 mr-2" />
            重试
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

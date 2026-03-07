'use client'

import { useCallback, useState, useMemo, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'

import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  Table as TableIcon,
  Highlighter,
  Code2,
  Minus,
  Loader2,
  ChevronDown,
  Plus,
  Trash2,
  RowsIcon,
  ColumnsIcon,
} from 'lucide-react'

const lowlight = createLowlight(common)

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
}

// 工具栏按钮组件
function ToolbarButton({
  onClick,
  isActive,
  disabled,
  children,
  title
}: {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  children: React.ReactNode
  title?: string
}) {
  return (
    <Toggle
      size="sm"
      pressed={isActive}
      onPressedChange={onClick}
      disabled={disabled}
      title={title}
      className="h-8 w-8 p-0"
    >
      {children}
    </Toggle>
  )
}

// 工具栏分隔符
function ToolbarSeparator() {
  return <div className="w-px h-6 bg-border mx-1" />
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = '开始输入内容...',
  editable = true,
  className = ''
}: RichTextEditorProps) {
  const [isUploading, setIsUploading] = useState(false)

  // 使用 useMemo 缓存扩展配置
  const extensions = useMemo(() => [
    StarterKit.configure({
      codeBlock: false,
    }),
    Image.configure({
      HTMLAttributes: {
        class: 'max-w-full h-auto rounded-lg',
      },
    }),
    Placeholder.configure({
      placeholder,
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Underline,
    Highlight.configure({
      multicolor: false,
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: 'border-collapse table-auto w-full',
      },
    }),
    TableRow,
    TableCell,
    TableHeader,
    CodeBlockLowlight.configure({
      lowlight,
    }),
  ], [placeholder])

  // 用于跟踪是否是内部更新，避免循环
  const isInternalChange = useRef(false)
  const prevContentRef = useRef(content)

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content,
    editable,
    onUpdate: ({ editor }) => {
      // 标记为内部更新
      isInternalChange.current = true
      onChange(editor.getHTML())
      // 使用 setTimeout 确保状态更新完成
      setTimeout(() => {
        isInternalChange.current = false
      }, 0)
    },
  })

  // 同步外部内容变化（例如加载现有实验数据）
  useEffect(() => {
    if (!editor) return
    
    // 如果是内部更新，跳过
    if (isInternalChange.current) return
    
    // 只有当外部 content 与当前编辑器内容不同时才更新
    const currentContent = editor.getHTML()
    if (content !== currentContent && content !== prevContentRef.current) {
      editor.commands.setContent(content, { emitUpdate: false })
    }
    prevContentRef.current = content
  }, [editor, content])

  // 图片上传处理
  const handleImageUpload = useCallback(async () => {
    if (!editor) return

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setIsUploading(true)
      
      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          const data = await response.json()
          editor.chain().focus().setImage({ src: data.url }).run()
        } else {
          const error = await response.json()
          alert(error.error || '上传失败')
        }
      } catch (error) {
        console.error('Upload error:', error)
        alert('上传失败，请重试')
      } finally {
        setIsUploading(false)
      }
    }

    input.click()
  }, [editor])

  if (!editor) {
    return (
      <div className={`border rounded-lg overflow-hidden ${className}`}>
        <div className="p-4 min-h-[300px] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // 检查是否在表格中
  const isInTable = editor.isActive('table')

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {/* 工具栏 */}
      <div className="border-b bg-muted/30 p-2 flex flex-wrap items-center gap-1">
        {/* 撤销/重做 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="撤销 (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="重做 (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarSeparator />
        
        {/* 标题 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="标题1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="标题2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="标题3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarSeparator />
        
        {/* 文本格式 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="加粗 (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="斜体 (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="下划线 (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="删除线"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive('highlight')}
          title="高亮"
        >
          <Highlighter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="行内代码"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="代码块"
        >
          <Code2 className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarSeparator />
        
        {/* 对齐 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="左对齐"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="居中"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="右对齐"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarSeparator />
        
        {/* 列表 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="无序列表"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="有序列表"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="引用"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarSeparator />
        
        {/* 表格下拉菜单 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-2 ${isInTable ? 'bg-accent' : ''}`}
              title="表格操作"
            >
              <TableIcon className="h-4 w-4" />
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
              <TableIcon className="h-4 w-4 mr-2" />
              插入表格 (3×3)
            </DropdownMenuItem>
            {isInTable && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => editor.chain().focus().addColumnBefore().run()}>
                  <ColumnsIcon className="h-4 w-4 mr-2" />
                  在左侧插入列
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()}>
                  <ColumnsIcon className="h-4 w-4 mr-2" />
                  在右侧插入列
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除当前列
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => editor.chain().focus().addRowBefore().run()}>
                  <RowsIcon className="h-4 w-4 mr-2" />
                  在上方插入行
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>
                  <RowsIcon className="h-4 w-4 mr-2" />
                  在下方插入行
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除当前行
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => editor.chain().focus().mergeCells().run()}>
                  <Plus className="h-4 w-4 mr-2" />
                  合并单元格
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editor.chain().focus().splitCell().run()}>
                  <Minus className="h-4 w-4 mr-2" />
                  拆分单元格
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => editor.chain().focus().deleteTable().run()}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除整个表格
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* 分隔线 */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="分隔线"
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarSeparator />
        
        {/* 图片上传 */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2"
          onClick={handleImageUpload}
          disabled={isUploading}
          title="上传图片"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
          <span className="ml-1 text-xs hidden sm:inline">图片</span>
        </Button>
      </div>
      
      {/* 编辑区域 */}
      <div className="p-4 min-h-[300px] focus:outline-none">
        <EditorContent editor={editor} className="focus:outline-none prose-editor" />
      </div>
      
      {/* 底部状态栏 */}
      <div className="border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground flex justify-between">
        <span>
          字数: {editor.getText().length}
        </span>
        <div className="flex gap-4">
          {isInTable && (
            <span className="text-primary">
              表格编辑模式
            </span>
          )}
          <span className="text-muted-foreground/60">
            支持粘贴图片直接上传
          </span>
        </div>
      </div>
    </div>
  )
}
